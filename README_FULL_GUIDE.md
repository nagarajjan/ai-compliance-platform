# AI Compliance Platform — Complete User Guide

> **Version:** 1.0 · **Date:** October 2026  
> **Package Contents:** Source Documents · Templates · Generated Report · Scripts · Setup Steps · Testing Guide

---

## 📦 What's in This Package

```
AI_Compliance_Platform_Docs.zip
│
├── docs/
│   └── README_FULL_GUIDE.md          ← YOU ARE HERE (full guide)
│
├── source_documents/                 ← Upload these to the platform
│   ├── Source_document_1_firewall_network.md    (Firewall & Network Security Policy)
│   ├── Source_document_2_encryption_threat.md   (Encryption Standards & Threat Assessment)
│   ├── sample_doc.md                            (Platform Overview)
│   └── compliance_audit_metrics.xlsx            (Quantitative Metrics — 3 sheets)
│
├── templates/                        ← Use these for report generation
│   ├── comprehensive_compliance_audit_template.md   ⭐ RECOMMENDED
│   ├── digital_assets_aml_template.md
│   ├── report_template.md
│   └── compliance_report_tmpl1.pdf
│
├── generated_reports/
│   └── compliance_report_20261003.md  ← Sample output report with chart data
│
├── scripts/
│   ├── generate_demo_report.py        ← Generate a report without LLM
│   ├── setup_and_index.py             ← Create Excel file + index workspace
│   └── test_platform.py               ← Run all 25 automated checks
│
└── config/
    └── backend.env.example            ← Environment configuration template
```

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────┐
│               FRONTEND  (Next.js :3000)             │
│  Documents │ Query │ Report │ Templates │ Settings   │
└──────────────────────┬─────────────────────────────┘
                       │ HTTP REST API
┌──────────────────────▼─────────────────────────────┐
│               BACKEND  (FastAPI :8000)              │
│                                                     │
│  /api/upload    → Store source documents            │
│  /api/index     → Embed + store in ChromaDB         │
│  /api/query     → RAG: embed → retrieve → LLM       │
│  /api/generate-report → RAG + fill template         │
│  /api/config    → Save/load LLM provider settings   │
│  /api/test-llm  → Test provider connectivity        │
└────────────────┬──────────────┬────────────────────┘
                 │              │
       ┌─────────▼──────┐  ┌───▼───────────────────┐
       │  ChromaDB       │  │  LLM Providers         │
       │  (Vector Store) │  │  Ollama / OpenAI       │
       │  nomic-embed    │  │  Claude / Google       │
       └─────────────────┘  │  DeepSeek / Perplexity │
                             └───────────────────────┘
```

### RAG Pipeline (step-by-step)
```
1. User uploads documents (PDF, DOCX, XLSX, MD, TXT)
        ↓
2. Backend extracts text (pdfplumber / openpyxl / python-docx)
        ↓
3. Text is chunked into segments
        ↓
4. Each chunk is embedded via Ollama nomic-embed-text
        ↓
5. Embeddings + metadata stored in ChromaDB (persisted to disk)
        ↓
6. User submits a query
        ↓
7. Query is embedded → top-K similar chunks retrieved from ChromaDB
        ↓
8. LLM synthesises an answer using retrieved chunks as context
        ↓
9. (Optional) Template placeholders filled with LLM answer + source citations
        ↓
10. Report returned to frontend (Markdown + optional chart JSON)
```

---

## ⚙️ Step 1 — Prerequisites

| Requirement | Version | How to Check |
|---|---|---|
| Python | 3.12 or 3.13 | `python --version` |
| Node.js | 18+ | `node --version` |
| Ollama | Latest | `ollama --version` |

### Install Python packages

```powershell
cd C:\Users\User\Downloads\AI\ai-compliance-platform-main\ai-compliance-platform-main
pip install fastapi uvicorn python-multipart python-dotenv chromadb requests pdfplumber python-docx openpyxl xlrd
```

### Pull Ollama models

```bash
# Required for embedding (indexing + querying)
ollama pull nomic-embed-text

# Optional local LLM (slow on CPU — use a cloud provider for production)
ollama pull llama3.2
```

---

## ⚙️ Step 2 — Configure Environment

Create/edit `backend/.env` (copy from `config/backend.env.example`):

```env
# Ollama (local)
OLLAMA_BASE_URL=http://localhost:11435
EMBEDDING_MODEL=nomic-embed-text:latest
LLM_MODEL=llama3.2

# IMPORTANT: Use absolute paths on Windows (not ../vectorstore)
UPLOAD_DIR=C:/Users/User/Downloads/AI/ai-compliance-platform-main/ai-compliance-platform-main/vectorstore
CHROMA_PERSIST_DIR=C:/Users/User/Downloads/AI/ai-compliance-platform-main/ai-compliance-platform-main/vectorstore/chroma_db

# Cloud providers (fill in via UI Settings, or add here)
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# GEMINI_API_KEY=AIza...
# DEEPSEEK_API_KEY=sk-...
```

> ⚠️ **Windows Note:** Always use forward slashes (`/`) and absolute paths in the `.env` file. Relative paths like `../vectorstore` will fail.

---

## ⚙️ Step 3 — Start the Backend

```powershell
cd C:\Users\User\Downloads\AI\ai-compliance-platform-main\ai-compliance-platform-main
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

✅ Success message:
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

Test it:
```powershell
# Quick health check
python -c "import urllib.request, json; print(json.loads(urllib.request.urlopen('http://127.0.0.1:8000/health').read()))"
```

---

## ⚙️ Step 4 — Start the Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 📄 Step 5 — Source Documents

All source documents are in the `source_documents/` folder of this package.

### Document 1: `Source_document_1_firewall_network.md`
**Content:** Firewall Policy and Network Security Baseline  
- Inbound port policy table (HTTPS, PostgreSQL, Redis, Ollama ports)
- Zero-Trust Network Access (ZTNA) principles
- TLS 1.2 → TLS 1.3 upgrade requirements
- Intrusion Detection / SIEM log forwarding
- Incident response levels (P0 → P3) with response times
- Regulatory: ISO 27001, NIST CSF 2.0, MAS TRM, PCI-DSS v4.0

### Document 2: `Source_document_2_encryption_threat.md`
**Content:** Encryption Standards and Threat Assessment Framework  
- Data classification matrix (Public/Internal/Confidential/Restricted)
- Approved algorithms: AES-256-GCM ✅, AES-128 ❌, SHA-1 ❌
- Storage asset compliance audit (8 assets — DB, S3, NAS, API)
- Threat landscape: API injection, credential stuffing, LLM-specific threats
- Penetration test summary (August 2026): 1 CRITICAL open
- Residual risk assessment by domain

### Document 3: `compliance_audit_metrics.xlsx` (3 sheets)

**Sheet 1 — Edge_Gateway_Metrics:**

| Region | Avg_ms | P95_ms | P99_ms | SLA_ms | Status |
|---|---|---|---|---|---|
| APAC-SG | 42 | 78 | 112 | 100 | ⚠️ WARNING |
| ME-UAE | 55 | 98 | **145** | 100 | 🔴 BREACH |
| US-EAST | 22 | 41 | 67 | 100 | ✅ OK |
| *(+ 5 more regions)* | | | | | |

**Sheet 2 — Encryption_Compliance:**

| Asset | Type | Standard | Key_bits | Cert_Expiry | Compliant |
|---|---|---|---|---|---|
| DB-003 | Redis | AES-128-CBC | 128 | 2025-06-01 | ❌ NO |
| STO-003 | NAS Share | None | 0 | N/A | ❌ NO |
| API-002 | gRPC | TLS 1.2 | 128 | 2026-05-01 | ⚠️ WARN |
| *(+ 5 compliant assets)* | | | | | |

**Sheet 3 — Vulnerability_Audit:**

| CVE | Component | Severity | CVSS | Status | Patch | Due |
|---|---|---|---|---|---|---|
| CVE-2024-3094 | OpenSSH | 🔴 CRITICAL | 10.0 | OPEN | YES | 2026-10-07 |
| CVE-2024-1234 | OpenSSL | 🟠 HIGH | 8.2 | OPEN | YES | 2026-10-14 |
| CVE-2023-5678 | Log4j | 🟠 HIGH | 7.5 | ✅ PATCHED | YES | — |
| *(+ 3 more)* | | | | | | |

### Document 4: `sample_doc.md`
Lightweight platform overview — used to demonstrate basic querying.

---

## 📋 Step 6 — Templates

All templates are in the `templates/` folder.

### Template 1: `comprehensive_compliance_audit_template.md` ⭐ RECOMMENDED

**Placeholders:**

| Placeholder | What Gets Inserted |
|---|---|
| `{{ workspace }}` | Workspace name (e.g. `demo`) |
| `{{ date }}` | Today's date (e.g. `October 03, 2026`) |
| `{{ query }}` | The user's query string |
| `{{ content }}` | The LLM-generated compliance analysis |
| `{{ sources }}` | Auto-generated citation list from ChromaDB |

**Full template content:**
```markdown
# AI Platform Compliance Audit Report

**Workspace:** {{ workspace }}
**Report Date:** {{ date }}
**Audit Query:** {{ query }}

---

## Table of Contents
1. Executive Summary
2. Edge Gateway Latency Metrics
3. Storage & API Encryption Compliance
4. Vulnerability Assessment
5. Regulatory Alignment
6. Recommendations
7. Sources & References

---

{{ content }}

---

## Sources & References
{{ sources }}

---
*Report generated by AI Compliance Platform · Powered by RAG + LLM*
*Audit Date: {{ date }} · Workspace: {{ workspace }}*
```

---

### Template 2: `digital_assets_aml_template.md`

**Use for:** AML/CFT compliance (crypto/digital asset businesses)  
**Placeholders:** `{{ workspace }}`, `{{ date }}`, `{{ content }}`, `{{ sources }}`

**Sections:**
1. Executive Summary `{{ content }}`
2. Inherent Risk Considerations & Customer Nexus
3. Onboarding & Due Diligence Evaluation
4. Ongoing Monitoring & Travel Rule Compliance
5. Audit Findings, Case Studies & Recommendations
6. Document Sources `{{ sources }}`

---

### Template 3: `report_template.md`

**Use for:** Quick lightweight summaries  
**Placeholders:** `{{ summary }}`, `{{ key_points }}`

---

## 🔍 Step 7 — Upload & Index Documents

### Via the UI (recommended)

1. Open **http://localhost:3000**
2. Click **Documents** tab
3. Click **Upload Files** → select all files from `source_documents/`
4. Click **Index Workspace** to embed and store in ChromaDB

### Via Python script

```powershell
python scripts/setup_and_index.py
```

This will:
- Create the Excel file in the correct location
- Trigger `/api/index?workspace=demo` via the API

### Via direct API call

```python
import http.client, json

conn = http.client.HTTPConnection("127.0.0.1", 8000)
conn.request("POST", "/api/index?workspace=demo")
r = conn.getresponse()
print(json.loads(r.read()))
```

**Expected response:**
```json
{
  "status": "indexed",
  "workspace": "demo",
  "files_indexed": [
    {"file": "compliance_audit_metrics.xlsx", "chunks": 1},
    {"file": "sample_doc.md", "chunks": 1},
    {"file": "Source_document_1.pdf", "chunks": 1},
    {"file": "Source_document_2.pdf", "chunks": 1}
  ],
  "total_chunks": 4
}
```

---

## 💬 Step 8 — RAG Queries

### Via the UI

1. Click the **Query** tab
2. Enter a query (see examples below)
3. Set **Top K** (3–5 recommended)
4. Enable **Include Charts** if you want a chart
5. Click **Run Query**

### 21 Ready-to-Use Query Examples

#### Encryption Domain
```
1. What encryption standard is required for confidential data at rest?
2. List all storage assets that are non-compliant with encryption requirements.
3. Which assets use AES-128 or below? What is the remediation timeline?
4. What TLS version is required for data in transit?
5. Summarise encryption compliance gaps and their regulatory impact.
```

#### Latency Domain
```
6. Which regions are in SLA breach for edge gateway latency?
7. Show P99 latency for all regions. Which exceed the 100ms threshold?
8. What is average latency for APAC regions vs US regions?
9. Provide a bar chart of P99 latency per region with SLA threshold marked.
10. Recommend remediation steps for the ME-UAE latency breach.
```

#### Vulnerability Domain
```
11. List all open CRITICAL and HIGH severity CVEs with remediation dates.
12. What is CVE-2024-3094 and why is it critical? Is a patch available?
13. Which CVEs do not have patches available yet?
14. Provide a vulnerability risk summary sorted by CVSS score.
15. How many vulnerabilities have been patched vs remain open?
```

#### Regulatory Domain
```
16. How does the platform align with MAS TRM guidelines?
17. What ISO 27001:2022 controls are partially or non-compliant?
18. Summarise PCI-DSS v4.0 compliance status for encryption.
19. What NIST CSF 2.0 functions are covered and which have gaps?
20. Generate a regulatory alignment summary table for the audit report.
```

#### Full Compliance Report Query ⭐ Use This for Report Generation
```
21. Provide a comprehensive compliance overview covering:
    - Storage encryption profiles with gap analysis
    - Edge gateway latency metrics and SLA status per region
    - Active vulnerability assessment with CVSS scores
    Include citations from the source documents and a bar chart
    visualising P99 latency per region against the 100ms SLA threshold.
```

---

## 📊 Step 9 — Generate Report

### Via the UI

1. Click the **Report** tab
2. Select template: `comprehensive_compliance_audit_template.md`
3. Enter Query 21 (above) in the query box
4. Enable **Include Charts**
5. Click **Generate Report**

The report will render as Markdown with:
- All `{{ placeholders }}` filled in
- Source citations listed
- An interactive chart (if the LLM emitted chart JSON)

### Via Python script

```powershell
python scripts/generate_demo_report.py
```

This creates a full report from the live Excel data without needing an LLM — useful for demos.

### Via API

```python
import urllib.request, json

payload = json.dumps({
    "workspace": "demo",
    "query": "Provide a comprehensive compliance overview covering encryption, latency, and vulnerabilities with citations and a latency chart.",
    "template_name": "comprehensive_compliance_audit_template.md",
    "top_k": 5,
    "model_name": "gpt-4o",          # Replace with your provider's model
    "provider": "openai",             # or: anthropic, google, deepseek, ollama
    "api_key": "sk-YOUR-KEY-HERE",
    "base_url": None,
    "max_tokens": 1500,
    "temperature": 0.2,
    "include_charts": True
}).encode()

req = urllib.request.Request(
    "http://127.0.0.1:8000/api/generate-report",
    data=payload,
    headers={"Content-Type": "application/json"},
    method="POST"
)
with urllib.request.urlopen(req, timeout=180) as r:
    result = json.loads(r.read())

# Save the report
with open("my_report.md", "w", encoding="utf-8") as f:
    f.write(result["report"])
print("Report saved to my_report.md")
```

---

## 🤖 Step 10 — Configure LLM Providers

### Supported Providers

| Provider | `provider` value | Default Model | Get API Key |
|---|---|---|---|
| Ollama (local) | `ollama` | `llama3.2` | No key needed |
| OpenAI | `openai` | `gpt-4o` | platform.openai.com |
| Google AI | `google` | `gemini-1.5-flash` | aistudio.google.com |
| Anthropic Claude | `anthropic` | `claude-3-5-sonnet-20241022` | console.anthropic.com |
| DeepSeek | `deepseek` | `deepseek-chat` | platform.deepseek.com |
| Perplexity | `perplexity` | `llama-3.1-sonar-large-128k-online` | perplexity.ai/settings/api |
| Custom | `custom` | Any OpenAI-compatible | Your endpoint |

### UI Configuration Steps

1. Click **⚙️ Settings** button (top-right of the UI)
2. Select provider from the dropdown
3. Enter your **API Key**
4. Enter **Base URL** (only for Custom provider)
5. Select or type your **Model name**
6. Click **Test Connection** → should show "Connection successful!"
7. Click **Save**

### Environment Variable Keys

Add to `backend/.env`:
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
DEEPSEEK_API_KEY=sk-...
PERPLEXITY_API_KEY=pplx-...
```

---

## 🧪 Step 11 — Run the Test Suite

With the backend running, execute:

```powershell
python scripts/test_platform.py
```

**Tests included (25 checks):**

| # | Test | What it verifies |
|---|---|---|
| 1 | Health Check | Backend is up, status=ok |
| 2 | Workspace Detection | `demo` workspace exists in vectorstore |
| 3 | File Listing | All 4 source files visible via API |
| 4 | Templates | All 3+ templates listed by API |
| 5 | Index Workspace | All files embedded into ChromaDB |
| 6 | RAG Query | LLM query returns answer + sources |
| 7 | Config Save/Load | Provider settings persist correctly |
| 8 | Template Fill | All placeholders replaced, no blanks |

**Expected output:**
```
============================================================
  AI Compliance Platform - Test Suite
============================================================

Test 1: Backend Health
  [PASS]  Backend running
  [PASS]  Status ok

Test 2: Workspace Detection
  [PASS]  Workspaces endpoint
  [PASS]  demo workspace exists
...
============================================================
  RESULTS: 25/25 checks passed
  STATUS: ALL PASSED
============================================================
```

---

## 📑 Step 12 — Sample Generated Report

The file `generated_reports/compliance_report_20261003.md` is a complete sample report generated from the demo workspace.

**Report highlights:**

| Section | Finding |
|---|---|
| Overall Status | ⚠️ PARTIALLY COMPLIANT |
| Latency | ME-UAE P99=145ms — 🔴 SLA BREACH; APAC-SG 112ms — ⚠️ WARNING |
| Encryption | STO-003 NAS Share — ❌ no encryption; DB-003 Redis — ❌ expired AES-128 cert |
| Vulnerabilities | CVE-2024-3094 OpenSSH CVSS 10.0 — 🔴 CRITICAL OPEN |
| Regulatory | Partial alignment with ISO 27001, PCI-DSS 4.0, NIST CSF 2.0, MAS TRM |

**Chart data (renders in the UI):**
```json
{
  "title": "Edge Gateway P99 Latency by Region (SLA: 100ms)",
  "type": "bar",
  "xAxis": "Region",
  "yAxis": "P99 Latency (ms)",
  "data": [
    { "name": "US-EAST",    "value": 67,  "fill": "#22c55e" },
    { "name": "US-CENTRAL", "value": 74,  "fill": "#22c55e" },
    { "name": "EU-FR",      "value": 81,  "fill": "#22c55e" },
    { "name": "EU-DE",      "value": 87,  "fill": "#22c55e" },
    { "name": "US-WEST",    "value": 95,  "fill": "#22c55e" },
    { "name": "APAC-HK",   "value": 98,  "fill": "#22c55e" },
    { "name": "APAC-SG",   "value": 112, "fill": "#f59e0b" },
    { "name": "ME-UAE",    "value": 145, "fill": "#ef4444" }
  ],
  "threshold": 100,
  "thresholdLabel": "SLA Limit"
}
```

---

## 🔧 Troubleshooting

### ❌ Backend 404 on `/api/index`

Cause: Relative path in `.env` (`../vectorstore`)  
Fix: Use the absolute path in `backend/.env`:
```env
UPLOAD_DIR=C:/Users/YourName/Downloads/AI/ai-compliance-platform-main/ai-compliance-platform-main/vectorstore
```

### ❌ Ollama embedding fails / timeout

Cause: Ollama not running, or wrong port  
Fix:
```bash
ollama serve           # start Ollama
ollama pull nomic-embed-text   # ensure model is pulled
```
Check port: default is `11434`; update `.env` if your install uses a different port.

### ❌ LLM query hangs or OOM with Ollama

Cause: `llama3.2` is too large for CPU inference  
Fix Option A — Use a smaller model:
```env
LLM_MODEL=qwen2.5:0.5b
```
Fix Option B — Use a cloud provider (OpenAI, Claude, etc.) via the Settings panel.

### ❌ UnicodeEncodeError on Windows

Cause: Windows CP1252 console encoding  
Fix: Add to top of any Python script:
```python
import sys
sys.stdout.reconfigure(encoding='utf-8')
```

### ❌ ChromaDB shows 0 documents after backend restart

Cause: Collection needs to be re-referenced (embeddings are on disk but not in memory)  
Fix: Re-run indexing after each backend restart:
```powershell
python -c "import http.client; c=http.client.HTTPConnection('127.0.0.1',8000); c.request('POST','/api/index?workspace=demo'); print(c.getresponse().read())"
```

---

## 📡 API Reference

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Backend + Ollama health status |
| GET | `/api/workspaces` | List all workspaces |
| GET | `/api/workspaces/{ws}/files` | List files in a workspace |
| GET | `/api/templates` | List available report templates |
| GET | `/api/config` | Load saved LLM config |
| POST | `/api/upload?workspace=<ws>` | Upload source documents |
| POST | `/api/upload-template` | Upload a report template |
| POST | `/api/index?workspace=<ws>` | Index documents into ChromaDB |
| POST | `/api/query` | RAG query (returns answer + sources + optional chart) |
| POST | `/api/generate-report` | RAG query + fill template → full report |
| POST | `/api/config` | Save LLM provider settings |
| POST | `/api/test-llm` | Test LLM provider connectivity |

---

## 📁 File Path Reference

| File | Location in Project |
|---|---|
| Backend app | `backend/main.py` |
| Environment config | `backend/.env` |
| Comprehensive template | `templates/comprehensive_compliance_audit_template.md` |
| AML/CFT template | `templates/digital_assets_aml_template.md` |
| Basic template | `templates/report_template.md` |
| Excel metrics | `vectorstore/demo/raw/compliance_audit_metrics.xlsx` |
| Firewall policy doc | `sample_documents/Source_document_1_firewall_network.md` |
| Encryption/threat doc | `sample_documents/Source_document_2_encryption_threat.md` |
| Generated report | `vectorstore/demo/reports/20261003_000301_compliance_report.md` |
| Test suite | `test_platform.py` |
| Demo report script | `generate_demo_report.py` |

---

*AI Compliance Platform · Complete User Guide · October 2026*
