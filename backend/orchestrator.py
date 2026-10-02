# backend/orchestrator.py
"""Core orchestration logic for multi‑document Agentic RAG.
Implements:
1️⃣ Ingestion & chunking with metadata tags.
2️⃣ Embedding via Ollama (nomic‑embed‑text:latest).
3️⃣ Storage in ChromaDB (embedded mode, per‑workspace collection).
4️⃣ Retrieval of top‑K relevant chunks across all uploaded files.
5️⃣ Synthesis using a selected LLM (placeholder – can be swapped for any provider).
"""

import os
import json
import hashlib
from typing import List, Dict, Any

import httpx
from fastapi import HTTPException

# ----- Configuration -----
OLLAMA_EMBED_ENDPOINT = os.getenv("OLLAMA_EMBED_ENDPOINT", "http://localhost:11434/api/embeddings")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text:latest")
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "vectorstore/chroma")

# Lazy import of chromadb – installed via `pip install chromadb`.
from chromadb import PersistentClient

# Create a client that persists across workspaces (different collections per workspace).
chroma_client = PersistentClient(path=CHROMA_PERSIST_DIR)

# ----- Helper utilities -----

def _hash_text(text: str) -> str:
    """Stable short hash for chunk IDs (used for deterministic ids)."""
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:10]

def _extract_text_from_file(file_path: str) -> str:
    """Extract plain text from supported file types.
    - .md, .txt → read as UTF‑8 text
    - .pdf → use PyMuPDF (fitz) to extract page text
    - other types raise an error (can be extended later)
    """
    _, ext = os.path.splitext(file_path.lower())
    if ext in {".md", ".txt"}:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    elif ext == ".pdf":
        try:
            import fitz  # PyMuPDF
        except ImportError as e:
            raise HTTPException(status_code=500, detail="PyMuPDF (fitz) not installed for PDF extraction")
        doc = fitz.open(file_path)
        text = []
        for page in doc:
            text.append(page.get_text())
        return "\n".join(text)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file type for extraction: {ext}")

def _chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start = end - overlap
    return chunks

def _embed_batch(texts: List[str]) -> List[List[float]]:
    payload = {"model": OLLAMA_EMBED_MODEL, "input": texts}
    resp = httpx.post(OLLAMA_EMBED_ENDPOINT, json=payload, timeout=30.0)
    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Ollama embedding service failed")
    data = resp.json()
    return data.get("embeddings", [])

# ----- Core orchestration functions -----

def ingest_workspace_files(workspace: str, file_names: List[str]):
    """Ingest files located under `vectorstore/<workspace>/raw/` into a Chroma collection.
    Each chunk is stored with metadata {"source": file_name, "chunk_id": idx}.
    """
    collection_name = f"workspace_{workspace}"
    collection = chroma_client.get_or_create_collection(name=collection_name)
    for file_name in file_names:
        # Determine absolute path to the project's vectorstore directory
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    raw_path = os.path.join(project_root, "vectorstore", workspace, "raw", file_name)
        if not os.path.isfile(raw_path):
            raise HTTPException(status_code=404, detail=f"File not found: {file_name}")
        full_text = _extract_text_from_file(raw_path)
        chunks = _chunk_text(full_text)
        ids = []
        embeds_input = []
        metadatas = []
        for idx, chunk in enumerate(chunks):
            chunk_id = f"{file_name}_c{idx}"
            ids.append(_hash_text(chunk_id))
            embeds_input.append(chunk)
            metadatas.append({"source": file_name, "chunk_id": idx})
        embeds = _embed_batch(embeds_input)
        collection.upsert(ids=ids, embeddings=embeds, metadatas=metadatas, documents=chunks)
    return {"status": "ingested", "workspace": workspace, "files": file_names}

def retrieve_top_k(workspace: str, query: str, k: int = 5) -> List[Dict[str, Any]]:
    collection_name = f"workspace_{workspace}"
    collection = chroma_client.get_collection(name=collection_name)
    query_vec = _embed_batch([query])[0]
    results = collection.query(
        query_embeddings=[query_vec],
        n_results=k,
        include=["documents", "metadatas"]
    )
    docs = results["documents"][0]
    metas = results["metadatas"][0]
    compiled = []
    for doc, meta in zip(docs, metas):
        compiled.append({
            "source": meta.get("source", "unknown"),
            "chunk_id": meta.get("chunk_id", -1),
            "text": doc,
        })
    return compiled

def synthesize_report(user_query: str, contexts: List[Dict[str, Any]], template_path: str) -> str:
    if not os.path.isfile(template_path):
        raise HTTPException(status_code=404, detail="Template file not found")
    # Load template – if PDF, extract text using the same helper
    _, tmpl_ext = os.path.splitext(template_path.lower())
    if tmpl_ext in {".md", ".txt"}:
        with open(template_path, "r", encoding="utf-8") as f:
            template_text = f.read()
    elif tmpl_ext == ".pdf":
        # Re‑use the extraction utility for PDFs
        template_text = _extract_text_from_file(template_path)
    else:
        raise HTTPException(status_code=400, detail="Unsupported template file type")
    compiled_context = "\n---\n".join(
        [f"Document Source: [{c['source']}] (ID: doc_{c['chunk_id']})\nText Content: \"{c['text']}\"" for c in contexts]
    )
    system_prompt = f"""
You are a structured document generator. Execute the request: \"{user_query}\"\nby parsing the retrieved multi‑document data below:\n\n{compiled_context}\n\nGENERATION CONSTRAINTS:\n1. Structure the response strictly within the layout blocks of this template:\n{template_text}\n2. Provide exact reference citations for every claim, fact, or metric you input. Use inline brackets citing the file name, for example: (Source: network_audit.pdf).\n3. Append a comprehensive \"### References & Sources\" index at the absolute bottom of the generated template, listing all referenced files and the number of context hits used from each.\n4. If a template section requires parameters not supported by the uploaded data, fill that placeholder block with: \"[Data Missing across Uploaded Files]\". Do not hallucinate.\n"""
    chat_endpoint = os.getenv("OLLAMA_CHAT_ENDPOINT", "http://localhost:11434/api/chat")
    payload = {"model": os.getenv("SELECTED_LLM", "llama3.2"), "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_query}]}
    resp = httpx.post(chat_endpoint, json=payload, timeout=120.0)
    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail="LLM generation failed")
    data = resp.json()
    return data.get("message", {}).get("content", "")

def orchestrate_query(workspace: str, user_query: str, template_file: str, top_k: int = 5) -> str:
    contexts = retrieve_top_k(workspace, user_query, k=top_k)
    return synthesize_report(user_query, contexts, template_file)
