# scripts/run_demo_query.py
"""Demo script to ingest two PDF source documents and generate a compliance report
using the orchestrator module.
It assumes the PDFs and the template PDF have already been copied into the workspace
(`workspaces/demo/raw/`) and the template directory (`templates/`).
"""
import os
import sys
from pathlib import Path

# Ensure we can import the backend package (add parent to sys.path)
backend_path = Path(__file__).resolve().parents[1] / "backend"
sys.path.append(str(backend_path))

from orchestrator import ingest_workspace_files, orchestrate_query

WORKSPACE = "demo"
SOURCE_FILES = ["Source_document_1.pdf", "source_document_2.pdf"]
TEMPLATE_PDF = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "templates", "compliance_report_tmpl1.pdf"))
USER_PROMPT = (
    "Please analyze all our uploaded files to map out a complete system compliance overview. "
    "I need you to pull our storage encryption profiles, track edge gateway latency metrics, "
    "and map any active vulnerabilities. Make sure the output maps exactly to our corporate "
    "compliance layout template, and include clear inline citations for any metrics or source flags you pull."
)

def main():
    # 1. Ingest source documents into ChromaDB collection for the workspace
    ingest_result = ingest_workspace_files(WORKSPACE, SOURCE_FILES)
    print("Ingestion result:")
    print(ingest_result)

    # 2. Run the full orchestration query
    report_md = orchestrate_query(WORKSPACE, USER_PROMPT, TEMPLATE_PDF, top_k=5)
    print("\n--- GENERATED REPORT (markdown) ---\n")
    print(report_md)

    # Optionally, write the report to a file for inspection
    out_path = Path(__file__).resolve().parents[1] / "workspaces" / WORKSPACE / "reports" / "compliance_demo_report.md"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(report_md, encoding="utf-8")
    print(f"\nReport saved to {out_path}\n")

if __name__ == "__main__":
    main()
