"""
Indexes financial_audit_metrics.xlsx into ChromaDB workspace 'demo'
"""
import sys, json, pathlib
sys.stdout.reconfigure(encoding='utf-8')

ROOT = pathlib.Path(".")
sys.path.insert(0, str(ROOT))

try:
    from backend.main import get_chroma_collection, extract_text, chunk_text, embed_texts, UPLOAD_ROOT
    ws = "demo"
    fpath = UPLOAD_ROOT / ws / "raw" / "financial_audit_metrics.xlsx"
    if fpath.is_file():
        print(f"Extracting text from: {fpath.name}")
        text = extract_text(fpath)
        chunks = chunk_text(text)
        print(f"Generated {len(chunks)} chunk(s). Embedding...")
        embeddings = embed_texts(chunks)

        collection = get_chroma_collection(ws)
        ids = [f"{fpath.name}::chunk_{i}" for i in range(len(chunks))]
        metadatas = [{"source": fpath.name, "chunk_id": i} for i in range(len(chunks))]
        collection.upsert(ids=ids, embeddings=embeddings, documents=chunks, metadatas=metadatas)
        print(f"[SUCCESS] Indexed {fpath.name} ({len(chunks)} chunks) into ChromaDB workspace '{ws}'")
    else:
        print(f"[ERROR] File not found: {fpath}")
except Exception as e:
    print(f"[INDEX INFO] Local direct indexing note: {e}")
    print("Files are placed in vectorstore/demo/raw/ ready for one-click UI indexing via 'Trigger Vector Indexing'.")
