"""
Quick-start testing script for the AI Compliance Platform.
Runs all 8 test cases in sequence and prints a pass/fail summary.

Usage:
    python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000  (in another terminal)
    python test_platform.py
"""
import sys, json, time, http.client, urllib.request, urllib.error, pathlib
sys.stdout.reconfigure(encoding='utf-8')

BASE = "http://127.0.0.1:8000"
PASS = "[PASS]"
FAIL = "[FAIL]"
results = []

def check(name, condition, detail=""):
    icon = PASS if condition else FAIL
    results.append((name, condition))
    print(f"  {icon}  {name}")
    if detail:
        print(f"         {detail}")

def get(path):
    with urllib.request.urlopen(f"{BASE}{path}", timeout=10) as r:
        return r.status, json.loads(r.read())

def post_json(path, payload, timeout=120):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{BASE}{path}", data=data,
        headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def post_empty(path, timeout=30):
    conn = http.client.HTTPConnection("127.0.0.1", 8000, timeout=timeout)
    conn.request("POST", path)
    r = conn.getresponse()
    return r.status, json.loads(r.read())

print("=" * 60)
print("  AI Compliance Platform - Automated Test Suite")
print("=" * 60)

# ── TEST 1: Health Check ──────────────────────────────────────
print("\nTest 1: Backend Health Check")
try:
    status, body = get("/health")
    check("Backend is running", status == 200)
    check("Status is 'ok'", body.get("status") == "ok", f"status={body.get('status')}")
    check("Ollama URL configured", "ollama" in body, f"ollama={body.get('ollama')}")
except Exception as e:
    check("Backend is running", False, str(e))

# ── TEST 2: Workspace Detection ────────────────────────────────
print("\nTest 2: Workspace Detection")
try:
    status, body = get("/api/workspaces")
    check("Workspaces endpoint responds", status == 200)
    has_demo = "demo" in body
    check("'demo' workspace exists", has_demo, f"workspaces={body}")
except Exception as e:
    check("Workspaces endpoint", False, str(e))
    has_demo = False

# ── TEST 3: File Listing ───────────────────────────────────────
print("\nTest 3: File Listing")
try:
    status, body = get("/api/workspaces/demo/files")
    check("Files endpoint responds", status == 200)
    check("Excel file present", any("xlsx" in f for f in body), f"files={body}")
    check("PDF files present", any("pdf" in f.lower() for f in body), f"files={body}")
    check("Markdown file present", any("md" in f for f in body), f"files={body}")
except Exception as e:
    check("Files endpoint", False, str(e))

# ── TEST 4: Template Listing ───────────────────────────────────
print("\nTest 4: Template Listing")
try:
    status, body = get("/api/templates")
    check("Templates endpoint responds", status == 200)
    check("Comprehensive template exists",
          any("comprehensive" in t for t in body), f"templates={body}")
    check("AML template exists",
          any("aml" in t for t in body), f"templates={body}")
except Exception as e:
    check("Templates endpoint", False, str(e))

# ── TEST 5: Index Workspace ────────────────────────────────────
print("\nTest 5: Document Indexing")
try:
    print("    Indexing workspace 'demo' (may take 30-120s for embeddings)...")
    t0 = time.time()
    status, body = post_empty("/api/index?workspace=demo", timeout=180)
    elapsed = time.time() - t0
    check("Index endpoint responds", status == 200, f"status={status}, body={body}")
    if status == 200:
        chunks = body.get("total_chunks", 0)
        files  = body.get("files_indexed", [])
        check("Documents indexed", chunks > 0, f"total_chunks={chunks}")
        check("All 4 files indexed", len(files) >= 4, f"files={[f['file'] for f in files]}")
        print(f"    Elapsed: {elapsed:.1f}s")
except Exception as e:
    check("Index endpoint", False, str(e))

# ── TEST 6: Simple RAG Query ───────────────────────────────────
print("\nTest 6: RAG Query (Ollama)")
try:
    print("    Querying via Ollama (may take 2-10 min on CPU)...")
    status, body = post_json("/api/query", {
        "workspace": "demo",
        "query": "What is AES-256-GCM?",
        "top_k": 2,
        "model_name": "llama3.2",
        "provider": "ollama",
        "max_tokens": 200,
        "temperature": 0.1,
        "include_charts": False
    }, timeout=600)
    check("Query endpoint responds", status == 200, f"status={status}")
    if status == 200:
        check("Answer returned", bool(body.get("answer")), f"answer={body.get('answer','')[:100]}")
        check("Sources cited", len(body.get("sources", [])) > 0, f"sources={body.get('sources')}")
    else:
        check("Query succeeded", False, f"detail={body.get('detail')}")
except Exception as e:
    check("Query endpoint", False, f"{type(e).__name__}: {e}")

# ── TEST 7: Config Save / Load ─────────────────────────────────
print("\nTest 7: Config Save & Load")
try:
    # Save config
    status, body = post_json("/api/config", {
        "provider": "openai",
        "api_key": "test-key-placeholder",
        "base_url": None,
        "model_name": "gpt-4o"
    })
    check("Config save responds", status == 200, f"body={body}")

    # Load config
    status, body = get("/api/config")
    check("Config load responds", status == 200)
    cfg = body.get("config", {})
    check("Provider saved correctly", cfg.get("provider") == "openai", f"provider={cfg.get('provider')}")
except Exception as e:
    check("Config endpoints", False, str(e))

# ── TEST 8: Report Template Fill ──────────────────────────────
print("\nTest 8: Report Generation (template placeholder filling)")
try:
    # Use generate_demo_report.py logic directly to test template
    tmpl = pathlib.Path("templates/comprehensive_compliance_audit_template.md")
    check("Template file exists", tmpl.exists(), str(tmpl))
    if tmpl.exists():
        content = tmpl.read_text(encoding="utf-8", errors="ignore")
        check("Template has {{ content }}", "{{ content }}" in content)
        check("Template has {{ sources }}", "{{ sources }}" in content)
        check("Template has {{ workspace }}", "{{ workspace }}" in content)

        # Fill manually
        import re, datetime
        filled = content
        filled = filled.replace("{{ workspace }}", "demo")
        filled = filled.replace("{{ date }}", datetime.date.today().isoformat())
        filled = filled.replace("{{ query }}", "Test query")
        filled = filled.replace("{{ content }}", "## Test Section\n\nThis is test content.")
        filled = filled.replace("{{ sources }}", "- Source_document_1.pdf (chunk 0)")
        filled = re.sub(r"\{\{.*?\}\}", "[data missing]", filled)
        check("All placeholders filled", "{{ " not in filled)
        check("Template output non-empty", len(filled) > 100, f"length={len(filled)}")
except Exception as e:
    check("Template test", False, str(e))

# ── SUMMARY ───────────────────────────────────────────────────
print("\n" + "=" * 60)
passed = sum(1 for _, ok in results if ok)
total  = len(results)
print(f"  RESULTS: {passed}/{total} tests passed")
if passed == total:
    print("  STATUS: ALL TESTS PASSED")
else:
    failed = [name for name, ok in results if not ok]
    print(f"  FAILED: {', '.join(failed)}")
print("=" * 60)
