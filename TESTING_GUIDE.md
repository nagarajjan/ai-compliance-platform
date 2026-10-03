# AI Compliance Platform v2.0 — Complete Testing Guide

> **Status:** All systems live  
> **Backend:** `http://localhost:8000`  
> **Frontend:** `http://localhost:3000`  
> **Direct Downloads:**  
> - 📥 Test Guide (.md): [`http://localhost:8000/api/download/testing-guide`](http://localhost:8000/api/download/testing-guide)  
> - 📖 Platform Docs (.md): [`http://localhost:8000/api/download/platform-docs`](http://localhost:8000/api/download/platform-docs)

---

## Prerequisites Checklist

| Item | Status | Details |
|------|:------:|---------|
| Backend API | ✅ Live | FastAPI running on `http://127.0.0.1:8000` with JWT + RBAC + Cost Engine |
| Frontend UI | ✅ Live | Next.js running on `http://localhost:3000` with 7 Tabs & 1-Click Role Switcher |
| SQLite Database | ✅ Seeded | `backend/platform.db` with Users, Groups, Workspaces, Cost Config, Usage Logs |
| Access Control | ✅ Active | Role-based (RBAC) + Workspace Isolation (User & Group mapping) |
| Download Endpoints | ✅ Active | Download Test Guide & Docs in 1 click from UI top header or direct URL |

---

## 📥 STEP 1 — How to Download the Testing Guide & Documentation

You can download this Testing Guide and the full Platform Documentation at any time in two ways:

### Method A: 1-Click UI Buttons (Header)
1. Open **[http://localhost:3000](http://localhost:3000)** and log in.
2. In the top navigation bar (next to Settings), click:
   - **📥 Test Guide** → downloads `TESTING_GUIDE.md`
   - **📖 Docs** → downloads `PLATFORM_DOCUMENTATION.md`

### Method B: Direct Browser / cURL Downloads
- **Testing Guide:** `http://localhost:8000/api/download/testing-guide`
- **Platform Docs:** `http://localhost:8000/api/download/platform-docs`

---

## 🔐 STEP 2 — User & Group Access Model (Workspace Mapping)

The platform enforces **multi-tenant workspace isolation**. Users and Groups are mapped to Workspaces with granular permissions:
- **`can_read`**: Allowed to run RAG queries, view documents, and generate compliance reports.
- **`can_write`**: Allowed to upload source documents and trigger ChromaDB vector re-indexing.
- **Admin Group**: Possesses implicit full Read + Write access across all workspaces.

### Seeded Workspace Access Matrix

| User | Group | `demo` | `aml_audit` | `cyber_security` | `financial_2026` |
|------|-------|:------:|:-----------:|:----------------:|:----------------:|
| `admin` | **admin** | ✅ Read+Write | ✅ Read+Write | ✅ Read+Write | ✅ Read+Write *(Implicit)* |
| `manager1` | **management** | ✅ Read+Write | ✅ Read+Write | ✅ Read Only | ✅ Read+Write |
| `head1` | **group_head** | ✅ Read+Write | ✅ Read Only | ✅ Read+Write | ✅ Read+Write *(User Override)* |
| `analyst1` | **group_head** | ✅ Read+Write | ✅ Read Only | ✅ Read+Write | ❌ **No Access** |
| `user1` | **normal_user** | ✅ Read Only | ✅ Read Only *(User Override)* | ❌ **No Access** | ❌ **No Access** |
| `user2` | **normal_user** | ✅ Read Only | ❌ **No Access** | ❌ **No Access** | ❌ **No Access** |

---

## 🧪 STEP 3 — Test Workspace Access Isolation (RBAC & Mapping)

### Test 3A: Permitted Query (Normal User on `demo`)
1. Log in as **`user1`** (Password: `user123`).
2. Go to **RAG Knowledge Query** tab.
3. Select workspace: **`demo`**.
4. Enter query:
   ```
   What encryption standard is required for data at rest?
   ```
5. Click **Run Cited RAG Query**.
6. **Expected Result:**  
   - ✅ Response returned with cited compliance chunks.
   - ✅ Real-time cost banner displayed with tokens & calculated cost.

### Test 3B: Forbidden Query (Normal User on `financial_2026`)
1. While logged in as **`user1`**, attempt to query a restricted workspace:
   ```powershell
   # In PowerShell or Postman:
   $token = (Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"user1","password":"user123"}').token
   Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/query" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"workspace":"financial_2026","query":"audit balance sheet"}'
   ```
2. **Expected Result:**  
   - ❌ **HTTP 403 Forbidden**:  
     `{"detail":"Access denied: You do not have read permissions for workspace 'financial_2026'"}`

### Test 3C: Dynamic Workspace List in UI
1. Log in as **`user2`** (normal user with access only to `demo`).
2. Observe the Workspace dropdown in the top header:
   - Only `demo` is shown.
3. Log in as **`manager1`** (Management):
   - All assigned workspaces (`demo`, `aml_audit`, `cyber_security`, `financial_2026`) appear.
4. Log in as **`admin`**:
   - All workspaces are available.

---

## 🛠️ STEP 4 — Test Admin Workspace Access Management (Subtab 4)

1. Log in as **`admin`** (`admin` / `admin123`).
2. Click **Admin & Security Panel** tab in the sidebar.
3. Select the 4th subtab: **Workspace Access Control**.

### Test 4A: Register a New Workspace
1. In the **Register New Workspace** form:
   - **Workspace Name:** `fraud_detection_2026`
   - **Description:** `Anti-fraud pattern monitoring and alert logs`
2. Click **Register Workspace**.
3. **Expected Result:**  
   - Green success toast: `Workspace 'fraud_detection_2026' registered.`
   - New workspace card appears in the registered matrix below.

### Test 4B: Map Group Access to the New Workspace
1. In the **Map User or Group to Workspace** form:
   - **Select Workspace:** `fraud_detection_2026`
   - **Target Type:** `Group Role`
   - **Select Group:** `group_head`
   - Check **Allow Read (Query / Report)**
   - Check **Allow Write (Upload / Index)**
2. Click **Grant / Update Workspace Permission**.
3. **Expected Result:**  
   - The permission badge appears under `fraud_detection_2026`:  
     `Group: group_head [Read + Write]`

### Test 4C: Map Specific User Access (Override)
1. In the same form:
   - **Select Workspace:** `fraud_detection_2026`
   - **Target Type:** `Specific User`
   - **Select User:** `user1 (normal_user)`
   - Check **Allow Read (Query / Report)** only.
2. Click **Grant / Update Workspace Permission**.
3. **Expected Result:**  
   - Permission badge added: `User: user1 [Read]`

### Test 4D: Revoke Permission
1. Click the `×` on any permission badge.
2. **Expected Result:** Badge is removed, and access is revoked immediately.

---

## 👥 STEP 5 — Test All 4 User Roles & Dashboard Scopes

Use the **1-Click Demo** buttons on the login screen ([http://localhost:3000](http://localhost:3000)):

| Role | Username / Password | Badge | Dashboard Scope | Available Tabs |
|------|---------------------|:-----:|:---------------:|----------------|
| **Administrator** | `admin` / `admin123` | 🔴 ADMIN | **ALL** (Org-wide) | Dashboard, Costs, Documents, Templates, Query, Report, **Admin** |
| **Management** | `manager1` / `manager123` | 🟣 MANAGEMENT | **ORG** (All Teams) | Dashboard, Costs, Documents, Templates, Query, Report *(No Admin)* |
| **Group Head** | `head1` / `head123` | 🔵 GROUP HEAD | **TEAM** (Team Only) | Dashboard, Costs, Documents, Templates, Query, Report *(No Admin)* |
| **Normal User** | `user1` / `user123` | 🟢 USER | **PERSONAL** (Self) | Dashboard, Costs, Documents, Templates, Query, Report *(No Admin)* |

---

## 📊 STEP 6 — Test Executive Dashboard & CSV Downloads

1. Log in as **`admin`**.
2. Go to **Executive Dashboard**:
   - Verify KPI Cards: Total Queries (13+), Total Tokens (~33,680+), Total Cost (~$0.115+).
   - Verify Spend by Provider bars (Anthropic, Google, OpenAI, DeepSeek, Ollama).
   - Verify Activity by Model breakdown table.
3. Click **Download Dashboard (CSV)**:
   - Browser downloads `dashboard_summary_admin_YYYY-MM-DD.csv`.
   - Open in Excel to verify metrics.

---

## 💰 STEP 7 — Test Costing Expert & Custom Expenses

1. Log in as **`admin`** or **`manager1`**.
2. Go to **Costing Expert & Reports** tab.
3. Test the **Period Selector**:
   - Click `Today`, `Past 7 Days`, `Monthly (30 Days)`.
   - Breakdown table updates dynamically with group spend and query counts.
4. Verify **Infrastructure Fixed Costs**:
   - ☁️ Cloud Storage (S3): **$25.00 / mo**
   - 🖥️ Embedding Compute: **$0.00 / mo**
   - 🗄️ ChromaDB Hosting: **$15.00 / mo**
   - 🔑 Platform License: **$500.00 / mo**
5. Click **Export Cost Report (CSV)**:
   - Downloads `cost_report_monthly_YYYY-MM-DD.csv` with full breakdown.

---

## ⚡ STEP 8 — Test JEV Multi-Model Auto-Routing

1. Go to **RAG Knowledge Query** tab.
2. Select Provider: **⚡ Auto (JEV Cost Optimizer)**.
3. Test Query 1 (Triggers Tier 3 - Deep Complex):
   ```
   Provide full quarterly balance sheet journal entry verification with asset depreciation schedules
   ```
   - **Expected JEV Badge:** `Tier 3 (JEV Complex Report) → deepseek:deepseek-chat`
4. Test Query 2 (Triggers Tier 2 - Fast Technical):
   ```
   List all open CVE vulnerabilities with CVSS score above 8.0 and edge gateway latency metrics
   ```
   - **Expected JEV Badge:** `Tier 2 (Fast Technical) → google:gemini-1.5-flash`

---

## 📑 STEP 9 — Test Audit Report Generation

1. Go to **Generate Audit Report** tab.
2. Select Template: `comprehensive_compliance_audit_template.md`.
3. Select Workspace: `demo`.
4. Enter Query:
   ```
   Synthesize full compliance evaluation across data protection, edge gateway latencies, and critical CVE mitigations
   ```
5. Click **Synthesize & Fill Template**.
6. **Expected Result:**
   - Report fills the template with citations and findings.
   - Cost banner shows exact generation spend.
   - Click **Export Markdown (.md)** to download the generated compliance report.

---

## 🔒 STEP 10 — Test Admin User Management & Token Rate Updates

1. Log in as **`admin`**, open **Admin & Security Panel**.
2. **Subtab 1 (Users):**
   - Create new user: `auditor10` / `auditor10@domain.com` / `audit2026` / `normal_user`.
   - Verify `auditor10` appears in the user list.
   - Deactivate `user2` → verify `user2` status changes to `Inactive`.
3. **Subtab 2 (Token Pricing):**
   - Locate `openai:gpt-4o`.
   - Change Input Rate per 1k from `0.0025` to `0.0028` and click **Save**.
   - Green notification confirms database update.
4. **Subtab 3 (Custom Costs):**
   - Add new cost: `Backup Storage` / `$12.00` / `monthly`.
   - Verify card is created and reflected in Costing Expert reports.

---

## Quick Summary of Pre-Configured Test Accounts

| Username | Password | Group Role | Primary Workspaces |
|----------|----------|:----------:|--------------------|
| `admin` | `admin123` | **admin** | All Workspaces (Implicit Full Access) |
| `manager1` | `manager123` | **management** | `demo`, `aml_audit`, `financial_2026`, `cyber_security` |
| `head1` | `head123` | **group_head** | `demo`, `aml_audit`, `cyber_security`, `financial_2026` (Override) |
| `analyst1` | `analyst123` | **group_head** | `demo`, `aml_audit`, `cyber_security` |
| `user1` | `user123` | **normal_user** | `demo`, `aml_audit` (Override) |
| `user2` | `user123` | **normal_user** | `demo` |

---
*AI Compliance Platform v2.0 · Comprehensive Testing Guide*
