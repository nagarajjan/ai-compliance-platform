# backend/main.py
"""
FastAPI entry point for the AI Platform.
Full RAG pipeline:
  - /api/upload          → store raw docs per workspace
  - /api/upload-template → store report template files
  - /api/index           → chunk + embed (Ollama) + store in ChromaDB
  - /api/query           → embed query → retrieve chunks → LLM synthesis with citations
  - /api/generate-report → map query answer into a Markdown template
  - /api/config          → save / load LLM provider config
  - /api/workspaces      → list / inspect workspaces
  - /api/templates       → list uploaded templates
  - /health              → health check
"""

import os
import json
import requests
from pathlib import Path
from typing import List

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# ── Load .env ──────────────────────────────────────────────────────────────────
load_dotenv(Path(__file__).parent / ".env")

OLLAMA_BASE_URL  = os.getenv("OLLAMA_BASE_URL",  "http://localhost:11434")
EMBEDDING_MODEL  = os.getenv("EMBEDDING_MODEL",  "nomic-embed-text:latest")
LLM_MODEL        = os.getenv("LLM_MODEL",        "llama3.2")
UPLOAD_ROOT      = Path(os.getenv("UPLOAD_DIR",  str(Path(__file__).parent.parent / "vectorstore")))
CHROMA_PERSIST   = Path(os.getenv("CHROMA_PERSIST_DIR", str(UPLOAD_ROOT / "chroma_db")))
TEMPLATE_ROOT    = Path(__file__).parent.parent / "templates"
CONFIG_PATH      = Path(__file__).parent.parent / "configs" / "llm_config.json"

ALLOWED_DOC_EXT      = {".md", ".docx", ".pdf", ".xls", ".xlsx", ".txt", ".csv"}
ALLOWED_TEMPLATE_EXT = {".md", ".txt", ".pdf", ".docx", ".xlsx", ".xls"}

# ── App setup ──────────────────────────────────────────────────────────────────
app = FastAPI(title="AI Platform Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ChromaDB lazy import ───────────────────────────────────────────────────────
def get_chroma_collection(workspace: str):
    import chromadb
    CHROMA_PERSIST.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(CHROMA_PERSIST))
    return client.get_or_create_collection(
        name=workspace,
        metadata={"hnsw:space": "cosine"}
    )

# ── Text extraction ────────────────────────────────────────────────────────────
def extract_text(file_path: Path) -> str:
    ext = file_path.suffix.lower()
    try:
        if ext == ".pdf":
            import pdfplumber
            text = ""
            with pdfplumber.open(str(file_path)) as pdf:
                for page in pdf.pages:
                    # Extract plain text
                    page_text = page.extract_text() or ""
                    text += page_text + "\n"
                    # Also extract tables as text
                    for table in page.extract_tables():
                        for row in table:
                            row_text = " | ".join(str(cell) for cell in row if cell)
                            text += row_text + "\n"
            return text
        elif ext in {".txt", ".md", ".csv"}:
            return file_path.read_text(encoding="utf-8", errors="ignore")
        elif ext == ".docx":
            import docx
            doc = docx.Document(str(file_path))
            return "\n".join(p.text for p in doc.paragraphs)
        elif ext in {".xls", ".xlsx"}:
            try:
                import openpyxl
                wb = openpyxl.load_workbook(str(file_path), data_only=True)
                rows = []
                for name in wb.sheetnames:
                    ws = wb[name]
                    rows.append(f"--- Sheet: {name} ---")
                    for row in ws.iter_rows(values_only=True):
                        if any(c is not None for c in row):
                            rows.append(" | ".join(str(c) for c in row if c is not None))
                return "\n".join(rows)
            except Exception as e_openpyxl:
                if ext == ".xls":
                    try:
                        import xlrd
                        wb = xlrd.open_workbook(str(file_path))
                        rows = []
                        for name in wb.sheet_names():
                            ws = wb.sheet_by_name(name)
                            rows.append(f"--- Sheet: {name} ---")
                            for r in range(ws.nrows):
                                row = ws.row_values(r)
                                if any(c != "" and c is not None for c in row):
                                    rows.append(" | ".join(str(c) for c in row if c != "" and c is not None))
                        return "\n".join(rows)
                    except Exception:
                        raise e_openpyxl
                raise e_openpyxl
    except Exception as e:
        return f"[Extraction error for {file_path.name}: {e}]"
    return ""

# ── Text chunking ──────────────────────────────────────────────────────────────
def chunk_text(text: str, chunk_size: int = 400, overlap: int = 50) -> List[str]:
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunk = " ".join(words[i: i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
        i += chunk_size - overlap
    return chunks

# ── Ollama embedding ───────────────────────────────────────────────────────────
def embed_texts(texts: List[str]) -> List[List[float]]:
    embeddings = []
    for text in texts:
        try:
            resp = requests.post(
                f"{OLLAMA_BASE_URL}/api/embeddings",
                json={"model": EMBEDDING_MODEL, "prompt": text},
                timeout=120,   # increased: model may take time to load on first call
            )
            resp.raise_for_status()
            embeddings.append(resp.json()["embedding"])
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Ollama embedding error: {e}")
    return embeddings

# ── Multi-Provider LLM synthesis (Ollama, OpenAI, Anthropic, Google) ──────────
def call_llm(
    prompt: str,
    model_name: str | None = None,
    provider: str = "ollama",
    api_key: str | None = None,
    max_tokens: int = 800,
    temperature: float = 0.2,
) -> str:
    prov = (provider or "ollama").lower()
    tok_limit = max_tokens if max_tokens and max_tokens > 0 else 800
    temp_val = temperature if temperature is not None else 0.2

    # 1. OpenAI Provider
    if prov == "openai":
        key = api_key or os.getenv("OPENAI_API_KEY")
        if not key:
            return "[Error]: OpenAI API Key is missing. Please enter your API key in Provider Settings."
        try:
            resp = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={
                    "model": model_name or "gpt-4o",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": temp_val,
                    "max_tokens": tok_limit,
                },
                timeout=120,
            )
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"].strip()
            return f"[OpenAI error {resp.status_code}]: {resp.text}"
        except Exception as e:
            return f"[OpenAI call failed: {e}]"

    # 2. Anthropic Claude Provider
    elif prov == "anthropic":
        key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not key:
            return "[Error]: Anthropic API Key is missing. Please enter your API key in Provider Settings."
        try:
            resp = requests.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model_name or "claude-3-5-sonnet-20240620",
                    "max_tokens": tok_limit,
                    "temperature": temp_val,
                    "messages": [{"role": "user", "content": prompt}],
                },
                timeout=120,
            )
            if resp.status_code == 200:
                return resp.json()["content"][0]["text"].strip()
            return f"[Anthropic error {resp.status_code}]: {resp.text}"
        except Exception as e:
            return f"[Anthropic call failed: {e}]"

    # 3. Google Gemini Provider
    elif prov == "google":
        key = api_key or os.getenv("GEMINI_API_KEY")
        if not key:
            return "[Error]: Google Gemini API Key is missing. Please enter your API key in Provider Settings."
        try:
            target = model_name or "gemini-1.5-flash"
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{target}:generateContent?key={key}"
            resp = requests.post(
                url,
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "maxOutputTokens": tok_limit,
                        "temperature": temp_val,
                    }
                },
                timeout=120,
            )
            if resp.status_code == 200:
                return resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
            return f"[Google Gemini error {resp.status_code}]: {resp.text}"
        except Exception as e:
            return f"[Google Gemini call failed: {e}]"

    # 4. DeepSeek Provider
    elif prov == "deepseek":
        key = api_key or os.getenv("DEEPSEEK_API_KEY")
        if not key:
            return "[Error]: DeepSeek API Key is missing. Please enter your API key in Provider Settings."
        try:
            resp = requests.post(
                "https://api.deepseek.com/chat/completions",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={
                    "model": model_name or "deepseek-chat",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": temp_val,
                    "max_tokens": tok_limit,
                },
                timeout=120,
            )
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"].strip()
            return f"[DeepSeek error {resp.status_code}]: {resp.text}"
        except Exception as e:
            return f"[DeepSeek call failed: {e}]"

    # 5. Local Ollama Provider (Default)
    else:
        target_model = model_name if model_name else LLM_MODEL
        try:
            resp = requests.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": target_model,
                    "prompt": prompt,
                    "stream": False,
                    "keep_alive": "30m",
                    "options": {
                        "num_predict": min(tok_limit, 800),
                        "temperature": temp_val,
                        "num_ctx": 2048,
                    }
                },
                timeout=300,
            )
            if resp.status_code == 200:
                return resp.json().get("response", "").strip()
            return f"[Ollama LLM error {resp.status_code}]: {resp.text}"
        except Exception as e:
            return (
                f"[Ollama LLM unavailable or timed out: {e}].\n\n"
                "**Why did this happen?** Local LLM inference on CPU takes significant time and RAM for large documents, exceeding the 300s timeout.\n"
                "**How to solve:**\n"
                "1. Switch to a cloud provider in the top header (OpenAI, Google Gemini, Anthropic Claude, or DeepSeek) and enter your API key in Settings (⚙️) — responses generate in seconds.\n"
                "2. Or if using Ollama, pull a lightweight CPU model like `qwen2.5:0.5b` or `phi3:mini`."
            )

# ── JEV & Multi-Model Cost-Optimization Engine ─────────────────────────────────
def route_model(query: str, available_keys: dict | None = None) -> dict:
    """
    Intelligent Model Router (JEV Engine):
    Decides the optimal LLM provider and model tier based on query complexity,
    financial JEV indicators, and available API keys to minimize tokens and cost.
    """
    keys = available_keys or {}
    has_openai = bool(keys.get("openai") or os.getenv("OPENAI_API_KEY"))
    has_google = bool(keys.get("google") or os.getenv("GEMINI_API_KEY"))
    has_anthropic = bool(keys.get("anthropic") or os.getenv("ANTHROPIC_API_KEY"))
    has_deepseek = bool(keys.get("deepseek") or os.getenv("DEEPSEEK_API_KEY"))

    q = (query or "").lower()
    is_jev = any(w in q for w in ["jev", "journal entry", "debit", "credit", "ledger", "balance sheet", "reconciliation", "financial audit", "variance"])
    is_complex_report = any(w in q for w in ["comprehensive report", "formal audit", "executive summary", "regulatory alignment", "framework"])
    is_technical = any(w in q for w in ["latency", "cve", "vulnerability", "encryption", "benchmark", "p99", "sla", "tls"])

    # Tier 3: Complex Financial JEV & Formal Audit
    if is_jev or is_complex_report:
        if has_deepseek:
            return {"provider": "deepseek", "model": "deepseek-chat", "tier": "Tier 3 (High Reasoning / DeepSeek)", "reason": "JEV / Financial Audit detected; routed to high-precision reasoning model."}
        if has_openai:
            return {"provider": "openai", "model": "gpt-4o", "tier": "Tier 3 (Frontier Reasoning / GPT-4o)", "reason": "JEV / Financial Audit detected; routed to GPT-4o for mathematical accuracy."}
        if has_google:
            return {"provider": "google", "model": "gemini-1.5-pro", "tier": "Tier 3 (Long-Context Pro)", "reason": "JEV / Financial Audit detected; routed to Gemini 1.5 Pro."}
        if has_anthropic:
            return {"provider": "anthropic", "model": "claude-3-5-sonnet-20240620", "tier": "Tier 3 (Frontier Analysis)", "reason": "JEV / Financial Audit detected; routed to Claude 3.5 Sonnet."}
        return {"provider": "ollama", "model": "llama3.2", "tier": "Tier 3 (Local Fallback)", "reason": "No cloud API keys available; executing on local Ollama."}

    # Tier 2: Technical Compliance & Vulnerability Scans
    elif is_technical:
        if has_google:
            return {"provider": "google", "model": "gemini-1.5-flash", "tier": "Tier 2 (Fast Technical)", "reason": "Technical compliance lookup; routed to Gemini 1.5 Flash for high speed & lowest cost."}
        if has_openai:
            return {"provider": "openai", "model": "gpt-4o-mini", "tier": "Tier 2 (Fast Technical)", "reason": "Technical compliance lookup; routed to GPT-4o-mini for cost efficiency."}
        if has_deepseek:
            return {"provider": "deepseek", "model": "deepseek-chat", "tier": "Tier 2 (Fast Technical)", "reason": "Technical compliance lookup; routed to DeepSeek."}
        return {"provider": "ollama", "model": "llama3.2", "tier": "Tier 2 (Local)", "reason": "Routed to local Ollama."}

    # Tier 1: Simple Fact Lookup & Status Check
    else:
        if has_google:
            return {"provider": "google", "model": "gemini-1.5-flash", "tier": "Tier 1 (Sub-cent Lookup)", "reason": "Direct fact check; routed to ultra-low cost Flash tier."}
        if has_openai:
            return {"provider": "openai", "model": "gpt-4o-mini", "tier": "Tier 1 (Sub-cent Lookup)", "reason": "Direct fact check; routed to GPT-4o-mini."}
        return {"provider": "ollama", "model": "llama3.2", "tier": "Tier 1 (Local Zero Cost)", "reason": "Standard fact check routed to local model."}

class RouteRequest(BaseModel):
    query: str
    available_keys: dict | None = None

@app.post("/api/route-model")
def api_route_model(req: RouteRequest):
    return route_model(req.query, req.available_keys)

@app.get("/api/models")
def get_models():
    """Returns list of all models currently pulled & available in local Ollama."""
    try:
        resp = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            models = [m["name"] for m in data.get("models", [])]
            return {"models": models, "active": LLM_MODEL}
    except Exception as e:
        pass
    return {"models": [LLM_MODEL, "llama3.2", "mistral", "phi3", "qwen2.5:7b", "gemma2"], "active": LLM_MODEL}

# ══════════════════════════════════════════════════════════════════════════════
#  ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

# ── Health ─────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "ollama": OLLAMA_BASE_URL, "embedding_model": EMBEDDING_MODEL, "llm_model": LLM_MODEL}

# ── Config ─────────────────────────────────────────────────────────────────────
class LLMProviderConfig(BaseModel):
    provider: str
    api_key: str | None = None
    base_url: str | None = None
    model_name: str

@app.get("/api/config")
def get_config():
    if CONFIG_PATH.is_file():
        return JSONResponse(content={"config": json.loads(CONFIG_PATH.read_text())})
    return JSONResponse(content={"config": None})

@app.post("/api/config")
def save_config(cfg: LLMProviderConfig):
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(cfg.model_dump_json())
    return {"status": "saved"}

# ── Source document upload ─────────────────────────────────────────────────────
@app.post("/api/upload")
async def upload_files(workspace: str, files: List[UploadFile] = File(...)):
    ws_raw = UPLOAD_ROOT / workspace / "raw"
    ws_raw.mkdir(parents=True, exist_ok=True)
    saved = []
    for f in files:
        ext = Path(f.filename).suffix.lower()
        if ext not in ALLOWED_DOC_EXT:
            raise HTTPException(status_code=400, detail=f"Unsupported type: {ext}")
        dest = ws_raw / f.filename
        dest.write_bytes(await f.read())
        saved.append(f.filename)
    return {"status": "uploaded", "files": saved, "workspace": workspace,
            "next_step": f"POST /api/index?workspace={workspace}  ← run this to index the files"}

# ── Template upload ────────────────────────────────────────────────────────────
@app.post("/api/upload-template")
async def upload_template(file: UploadFile = File(...)):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_TEMPLATE_EXT:
        raise HTTPException(status_code=400, detail=f"Unsupported template type: {ext}")
    TEMPLATE_ROOT.mkdir(parents=True, exist_ok=True)
    dest = TEMPLATE_ROOT / file.filename
    dest.write_bytes(await file.read())
    return {"status": "template_uploaded", "template": file.filename}

@app.get("/api/templates")
def list_templates():
    if not TEMPLATE_ROOT.is_dir():
        return []
    return [f.name for f in TEMPLATE_ROOT.iterdir() if f.is_file() and not f.name.startswith(".")]

# ── Index (real RAG ingestion) ─────────────────────────────────────────────────
@app.post("/api/index")
def trigger_index(workspace: str):
    """
    Reads all files from vectorstore/<workspace>/raw/,
    extracts text, chunks it, embeds with Ollama nomic-embed-text,
    and stores vectors + metadata in ChromaDB.
    """
    raw_dir = UPLOAD_ROOT / workspace / "raw"
    if not raw_dir.is_dir():
        raise HTTPException(status_code=404, detail="Workspace not found. Upload files first.")

    collection  = get_chroma_collection(workspace)
    total_chunks = 0
    files_indexed = []

    for file_path in raw_dir.iterdir():
        if not file_path.is_file():
            continue

        text = extract_text(file_path)
        if not text.strip():
            continue

        chunks     = chunk_text(text)
        embeddings = embed_texts(chunks)

        ids       = [f"{file_path.name}::chunk_{i}" for i in range(len(chunks))]
        metadatas = [{"source": file_path.name, "chunk_id": i} for i in range(len(chunks))]

        # Upsert so re-indexing is safe
        collection.upsert(ids=ids, embeddings=embeddings, documents=chunks, metadatas=metadatas)

        total_chunks += len(chunks)
        files_indexed.append({"file": file_path.name, "chunks": len(chunks)})

    return {
        "status": "indexed",
        "workspace": workspace,
        "files_indexed": files_indexed,
        "total_chunks": total_chunks,
    }

# ── Query (real RAG retrieval + LLM synthesis) ─────────────────────────────────
class QueryRequest(BaseModel):
    workspace: str
    query: str
    top_k: int = 5
    model_name: str | None = None
    provider: str = "ollama"
    api_key: str | None = None
    max_tokens: int = 800
    temperature: float = 0.2
    include_charts: bool = False

@app.post("/api/query")
def query(req: QueryRequest):
    """
    1. Embeds the user query via Ollama nomic-embed-text
    2. Retrieves top-k chunks from ChromaDB with source metadata
    3. Builds a context block with inline source labels
    4. Calls LLM (Ollama, OpenAI, Anthropic, Gemini, DeepSeek) to synthesize a cited Markdown answer
    """
    collection = get_chroma_collection(req.workspace)

    # Check collection has data
    if collection.count() == 0:
        raise HTTPException(
            status_code=400,
            detail=f"No documents indexed for workspace '{req.workspace}'. Run POST /api/index?workspace={req.workspace} first."
        )

    # Embed the query
    q_embedding = embed_texts([req.query])[0]

    # Retrieve top-k relevant chunks
    results = collection.query(
        query_embeddings=[q_embedding],
        n_results=min(req.top_k, collection.count()),
        include=["documents", "metadatas", "distances"],
    )

    # Build labelled context block
    context_parts = []
    for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
        label = f"[source: {meta['source']} – chunk {meta['chunk_id']}]"
        context_parts.append(f"---\nDocument Source: {label}\n{doc}")
    context = "\n".join(context_parts)

    chart_instruction = ""
    if req.include_charts:
        chart_instruction = """
=== GRAPHICAL CHART INSTRUCTION ===
If the query or retrieved data involves numerical metrics (e.g. latency per region, encryption compliance counts, or vulnerabilities by severity), you MUST provide a JSON chart block inside a ```chart fence at the end of your response so the interactive dashboard can render a graphical chart.
Format:
```chart
{
  "title": "Descriptive Chart Title",
  "type": "bar",
  "xAxis": "Category or Region",
  "yAxis": "Metric Units",
  "threshold": 100,
  "thresholdLabel": "SLA Threshold",
  "data": [
    {"name": "Label 1", "value": 45, "fill": "#22c55e"},
    {"name": "Label 2", "value": 115, "fill": "#ef4444"}
  ]
}
```
"""

    # Build synthesis prompt
    prompt = f"""You are a compliance and technical analysis assistant.
Using ONLY the retrieved document excerpts below, answer the user query.
Include inline citations exactly in this format: [source: filename – chunk N]

=== RETRIEVED CONTEXT ===
{context}

=== USER QUERY ===
{req.query}

=== INSTRUCTIONS ===
- Structure your answer with clear Markdown headings.
- Cite every fact with its inline source reference.
- If information is missing from the context, say so explicitly.
- Do not hallucinate or add information not present in the context.
{chart_instruction}
"""

    active_prov = req.provider
    active_model = req.model_name
    active_key = req.api_key
    routing_info = None

    if (req.provider or "").lower() == "auto":
        routed = route_model(req.query, available_keys={req.provider: req.api_key} if req.api_key else None)
        active_prov = routed["provider"]
        active_model = routed["model"]
        routing_info = routed

    answer = call_llm(
        prompt,
        model_name=active_model,
        provider=active_prov,
        api_key=active_key,
        max_tokens=req.max_tokens,
        temperature=req.temperature
    )

    if req.include_charts and "```chart" not in answer:
        q_lower = req.query.lower()
        is_financial = any(w in q_lower for w in ["financial", "revenue", "profit", "ebitda", "budget", "spend", "margin", "quarterly"])
        raw_dir = UPLOAD_ROOT / req.workspace / "raw"

        # 1. Financial Chart Fallback
        if is_financial:
            fin_file = raw_dir / "financial_audit_metrics.xlsx"
            if fin_file.is_file():
                try:
                    import openpyxl, json
                    wb = openpyxl.load_workbook(str(fin_file), data_only=True)
                    if "Regional_Financial_Distribution" in wb.sheetnames:
                        ws = wb["Regional_Financial_Distribution"]
                        chart_data = []
                        for row in ws.iter_rows(values_only=True):
                            if row and len(row) >= 2 and str(row[0]).strip().lower() not in {"region", "none", ""}:
                                region = str(row[0]).strip()
                                try:
                                    rev = float(row[1])
                                    fill = "#22c55e" if rev >= 100 else "#f59e0b" if rev >= 30 else "#ef4444"
                                    chart_data.append({"name": region, "value": rev, "fill": fill})
                                except (ValueError, TypeError):
                                    pass
                        if chart_data:
                            chart_json = json.dumps({
                                "title": "Regional Revenue Distribution (USD Millions)",
                                "type": "bar",
                                "xAxis": "Region",
                                "yAxis": "Revenue (USD M)",
                                "threshold": 100,
                                "thresholdLabel": "Target Benchmark",
                                "data": chart_data
                            }, indent=2)
                            answer += f"\n\n```chart\n{chart_json}\n```"
                except Exception:
                    pass

        # 2. Latency / Compliance Chart Fallback
        if "```chart" not in answer:
            metrics_file = raw_dir / "compliance_audit_metrics.xlsx"
            if not metrics_file.is_file():
                for cand in raw_dir.glob("*compliance*metrics*.xlsx"):
                    metrics_file = cand
                    break
            if metrics_file.is_file():
                try:
                    import openpyxl, json
                    wb = openpyxl.load_workbook(str(metrics_file), data_only=True)
                    if "Edge_Gateway_Metrics" in wb.sheetnames:
                        ws = wb["Edge_Gateway_Metrics"]
                        chart_data = []
                        for row in ws.iter_rows(values_only=True):
                            if row and len(row) >= 4 and str(row[0]).strip().lower() not in {"region", "none", ""}:
                                region = str(row[0]).strip()
                                try:
                                    p99 = float(row[3])
                                    fill = "#ef4444" if p99 > 100 else "#f59e0b" if p99 > 85 else "#22c55e"
                                    chart_data.append({"name": region, "value": p99, "fill": fill})
                                except (ValueError, TypeError):
                                    pass
                        if chart_data:
                            chart_json = json.dumps({
                                "title": "Edge Gateway P99 Latency by Region (SLA: 100ms)",
                                "type": "bar",
                                "xAxis": "Region",
                                "yAxis": "P99 Latency (ms)",
                                "threshold": 100,
                                "thresholdLabel": "SLA Limit",
                                "data": chart_data
                            }, indent=2)
                            answer += f"\n\n```chart\n{chart_json}\n```"
                except Exception:
                    pass

    response = {
        "answer": answer,
        "sources": [
            {"source": m["source"], "chunk_id": m["chunk_id"]}
            for m in results["metadatas"][0]
        ],
        "workspace": req.workspace,
    }
    if routing_info:
        response["routing_info"] = f"{routing_info['tier']} → {routing_info['provider']}:{routing_info['model']} — {routing_info['reason']}"
    return response

# ── Workspace inspection ───────────────────────────────────────────────────────
@app.get("/api/workspaces")
def list_workspaces():
    if not UPLOAD_ROOT.is_dir():
        return []
    return [p.name for p in UPLOAD_ROOT.iterdir() if p.is_dir() and p.name != "chroma_db"]

@app.get("/api/workspaces/{workspace}/files")
def list_files(workspace: str):
    folder = UPLOAD_ROOT / workspace / "raw"
    if not folder.is_dir():
        raise HTTPException(status_code=404, detail="Workspace not found")
    return [f.name for f in folder.iterdir() if f.is_file() and not f.name.startswith(".")]

# ── Report generation from template ───────────────────────────────────────────
class ReportRequest(BaseModel):
    workspace: str
    query: str
    template_name: str
    top_k: int = 5
    model_name: str | None = None
    provider: str = "ollama"
    api_key: str | None = None
    max_tokens: int = 800
    temperature: float = 0.2
    include_charts: bool = False

@app.post("/api/generate-report")
def generate_report(req: ReportRequest):
    """
    Full pipeline:
    1. Runs the RAG query (same as /api/query)
    2. Reads the named template
    3. Injects the LLM answer into {{ content }} placeholder
    4. Returns the filled Markdown report
    """
    # Step 1: Run the RAG pipeline
    rag_req  = QueryRequest(
        workspace=req.workspace,
        query=req.query,
        top_k=req.top_k,
        model_name=req.model_name,
        provider=req.provider,
        api_key=req.api_key,
        max_tokens=req.max_tokens,
        temperature=req.temperature,
        include_charts=req.include_charts,
    )
    rag_resp = query(rag_req)
    answer   = rag_resp["answer"]
    sources  = rag_resp["sources"]

    # Step 2: Load template
    tmpl_path = TEMPLATE_ROOT / req.template_name
    if not tmpl_path.is_file():
        raise HTTPException(
            status_code=404,
            detail=f"Template '{req.template_name}' not found. Upload it via POST /api/upload-template"
        )
    
    ext = tmpl_path.suffix.lower()
    if ext in {".pdf", ".docx"}:
        template_raw = extract_text(tmpl_path)
    else:
        template_raw = tmpl_path.read_text(encoding="utf-8", errors="ignore")

    if "{{ content }}" in template_raw or "{{content}}" in template_raw:
        template = template_raw.replace("{{ content }}", answer).replace("{{content}}", answer)
    else:
        # If no explicit {{ content }} placeholder found in PDF template text, build report around template outline
        template = f"# Generated Report: {req.template_name}\n\n"
        if template_raw.strip():
            template += f"### Template Guidelines / Structure\n{template_raw.strip()}\n\n---\n\n"
        template += f"### Report Executive Summary & Analysis\n\n{answer}"

    import datetime
    today_str = datetime.date.today().strftime("%B %d, %Y")
    template = template.replace("{{ date }}", today_str).replace("{{date}}", today_str)
    template = template.replace("{{ query }}", req.query).replace("{{query}}", req.query)
    template = template.replace("{{ workspace }}", req.workspace).replace("{{workspace}}", req.workspace)

    # Build sources list
    source_lines = "\n".join(
        f"- {s['source']} (chunk {s['chunk_id']})" for s in sources
    )
    template = template.replace("{{ sources }}", source_lines).replace("{{sources}}", source_lines)

    # Clean up any remaining unfilled placeholders
    import re
    template = re.sub(r"\{\{.*?\}\}", "[data missing]", template)

    return {"report": template, "sources": sources}
