# AI Platform Compliance Audit Report

**Workspace:** demo  
**Report Date:** October 03, 2026  
**Audit Query:** Provide a compliance overview covering storage encryption profiles, edge gateway latency metrics, and any active vulnerabilities, with citations and a chart visualising latency per region.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Edge Gateway Latency Metrics](#edge-gateway-latency)
3. [Storage & API Encryption Compliance](#encryption-compliance)
4. [Vulnerability Assessment](#vulnerability-assessment)
5. [Regulatory Alignment](#regulatory-alignment)
6. [Recommendations](#recommendations)
7. [Sources & References](#sources)

---


## Executive Summary

This compliance audit covers the AI platform's security posture across three key domains:
**storage encryption**, **edge gateway latency**, and **active vulnerabilities**.
The audit is based on metrics collected from 8 regional edge nodes, 8 storage/API assets,
and a live CVE scan covering 6 components.

**Overall Compliance Status: ⚠️ PARTIALLY COMPLIANT**

| Domain | Status | Issues Found |
|---|---|---|
| Encryption | PARTIALLY COMPLIANT | 2 assets non-compliant, 1 warning |
| Latency | PARTIALLY COMPLIANT | 1 breach (ME-UAE), 1 warning (APAC-SG) |
| Vulnerabilities | NON-COMPLIANT | 2 OPEN critical/high CVEs require immediate patching |

---

## 1. Edge Gateway Latency Metrics

The following table summarises average, P95, and P99 latencies per region against the 100ms SLA threshold:

| Region | Avg_Latency_ms | P95_Latency_ms | P99_Latency_ms | SLA_Threshold_ms | Status |
| --- | --- | --- | --- | --- | --- |
| APAC-SG | 42 | 78 | 112 | 100 | WARNING |
| APAC-HK | 38 | 65 | 98 | 100 | OK |
| EU-DE | 31 | 55 | 87 | 100 | OK |
| EU-FR | 29 | 52 | 81 | 100 | OK |
| US-EAST | 22 | 41 | 67 | 100 | OK |
| US-WEST | 35 | 63 | 95 | 100 | OK |
| US-CENTRAL | 27 | 48 | 74 | 100 | OK |
| ME-UAE | 55 | 98 | 145 | 100 | BREACH |

**Key Findings:**
- **ME-UAE** is in **SLA BREACH** (P99: 145ms) — exceeds the 100ms threshold. Immediate investigation required.
- **APAC-SG** is flagged **WARNING** (P99: 112ms) — approaching the SLA ceiling.
- All remaining 6 regions are within acceptable bounds.

**Recommendation:** Investigate routing configuration and infrastructure capacity in the ME-UAE region.
Consider CDN offloading or regional traffic rerouting for APAC-SG.

---

## 2. Storage & API Encryption Compliance

| Asset_ID | Asset_Type | Encryption_Standard | Key_Length_bits | Certificate_Expiry | Compliant |
| --- | --- | --- | --- | --- | --- |
| DB-001 | PostgreSQL | AES-256-GCM | 256 | 2027-03-15 | YES |
| DB-002 | MongoDB | AES-256-GCM | 256 | 2026-11-30 | YES |
| DB-003 | Redis | AES-128-CBC | 128 | 2025-06-01 | NO |
| STO-001 | S3 Bucket | AES-256 | 256 | N/A | YES |
| STO-002 | Azure Blob | AES-256 | 256 | N/A | YES |
| STO-003 | NAS Share | None | 0 | N/A | NO |
| API-001 | REST Gateway | TLS 1.3 | 256 | 2026-12-31 | YES |
| API-002 | gRPC Service | TLS 1.2 | 128 | 2026-05-01 | WARNING |

**Key Findings:**
- **DB-003 (Redis)** uses AES-128-CBC with an expired certificate (2025-06-01) — **NON-COMPLIANT**.
- **STO-003 (NAS Share)** has **no encryption** — **NON-COMPLIANT** and highest risk.
- **API-002 (gRPC Service)** uses TLS 1.2 — flagged as **WARNING**; upgrade to TLS 1.3 recommended.
- All S3/Azure Blob storage uses AES-256 — **COMPLIANT**.

**Recommendation:** Immediately encrypt STO-003 and upgrade DB-003 to AES-256-GCM.
Schedule TLS upgrade for API-002 before certificate expiry (2026-05-01).

---

## 3. Vulnerability Assessment

| CVE_ID | Component | Severity | CVSS_Score | Status | Patch_Available | Target_Remediation |
| --- | --- | --- | --- | --- | --- | --- |
| CVE-2024-3094 | OpenSSH | CRITICAL | 10 | OPEN | YES | 2026-10-07 |
| CVE-2024-1234 | OpenSSL | HIGH | 8.2 | OPEN | YES | 2026-10-14 |
| CVE-2023-5678 | Log4j | HIGH | 7.5 | PATCHED | YES | 2026-09-01 |
| CVE-2023-9999 | nginx | MEDIUM | 5.3 | OPEN | YES | 2026-10-21 |
| CVE-2024-4321 | curl | MEDIUM | 4.8 | OPEN | NO | 2026-11-01 |
| CVE-2024-8765 | Python stdlib | LOW | 3.1 | OPEN | YES | 2026-11-15 |

**Key Findings:**
- **CVE-2024-3094 (OpenSSH)** — CVSS 10.0 CRITICAL. Patch available. Remediation due 2026-10-07.
- **CVE-2024-1234 (OpenSSL)** — CVSS 8.2 HIGH. Patch available. Remediation due 2026-10-14.
- **CVE-2023-5678 (Log4j)** — Already patched ✓
- **CVE-2023-9999 (nginx)** & **CVE-2024-4321 (curl)** — MEDIUM severity, remediation within 30 days.
- **CVE-2024-8765 (Python stdlib)** — LOW severity, planned for November.

**Recommendation:** Emergency patching required for CVE-2024-3094 by 2026-10-07.
Establish a rolling 14-day SLA for all HIGH/CRITICAL CVEs.

---

## 4. Regulatory Alignment

Based on source documents, the platform aligns with:
- **ISO 27001** — Information Security Management (partial; NAS encryption gap noted)
- **PCI-DSS 4.0** — Encryption and TLS requirements (partial; TLS 1.2 flagged)
- **NIST CSF 2.0** — Identify, Protect, Detect functions covered; Respond/Recover require updates
- **MAS TRM Guidelines** — Latency thresholds and vulnerability management under review

---

## 5. Recommendations Summary

| Priority | Action | Owner | Due Date |
|---|---|---|---|
| P0 | Patch CVE-2024-3094 (OpenSSH CRITICAL) | Security Ops | 2026-10-07 |
| P0 | Encrypt STO-003 (NAS Share — no encryption) | Infra Team | 2026-10-10 |
| P1 | Patch CVE-2024-1234 (OpenSSL HIGH) | Security Ops | 2026-10-14 |
| P1 | Upgrade DB-003 to AES-256-GCM | DB Admin | 2026-10-21 |
| P2 | Investigate ME-UAE latency breach | Network Ops | 2026-10-14 |
| P2 | Upgrade API-002 to TLS 1.3 | Platform Eng | 2026-11-01 |
| P3 | Patch MEDIUM/LOW CVEs | Security Ops | 2026-11-15 |


---

## Sources & References

The following source documents were retrieved and cited in this report:


- compliance_audit_metrics.xlsx (chunk 0) — Edge gateway latency, encryption compliance, vulnerability audit data
- Source_document_1.pdf (chunk 0) — Firewall policy and network security baseline
- Source_document_2.pdf (chunk 0) — Encryption standards and threat assessment framework
- sample_doc.md (chunk 0) — Platform overview and compliance scope


---

*Report generated by AI Compliance Platform · Powered by RAG + LLM*  
*Audit Date: October 03, 2026 · Workspace: demo*


---

## Chart: Latency Per Region

```chart
{
  "title": "Edge Gateway P99 Latency by Region (SLA: 100ms)",
  "type": "bar",
  "xAxis": "Region",
  "yAxis": "P99 Latency (ms)",
  "data": [
    {
      "name": "US-EAST",
      "value": 67,
      "fill": "#22c55e"
    },
    {
      "name": "EU-FR",
      "value": 81,
      "fill": "#22c55e"
    },
    {
      "name": "EU-DE",
      "value": 87,
      "fill": "#22c55e"
    },
    {
      "name": "APAC-HK",
      "value": 98,
      "fill": "#22c55e"
    },
    {
      "name": "US-CENTRAL",
      "value": 74,
      "fill": "#22c55e"
    },
    {
      "name": "US-WEST",
      "value": 95,
      "fill": "#22c55e"
    },
    {
      "name": "APAC-SG",
      "value": 112,
      "fill": "#f59e0b"
    },
    {
      "name": "ME-UAE",
      "value": 145,
      "fill": "#ef4444"
    }
  ],
  "threshold": 100,
  "thresholdLabel": "SLA Limit"
}
```
