# AI Compliance Platform — Encryption Standards & Threat Assessment
**Document ID:** SRC-002  
**Classification:** Internal — Confidential  
**Version:** 1.8  
**Last Reviewed:** September 2026  

---

## 1. Encryption Standards Framework

### 1.1 Data Classification & Encryption Requirements

| Classification | At-Rest Encryption | In-Transit Encryption | Key Length | Key Rotation |
|---|---|---|---|---|
| Public | Optional | TLS 1.2+ | N/A | N/A |
| Internal | AES-256-GCM | TLS 1.2+ | 256-bit | Annual |
| Confidential | AES-256-GCM | TLS 1.3 | 256-bit | 90 days |
| Restricted | AES-256-GCM + HSM | mTLS 1.3 | 256-bit | 30 days |

### 1.2 Approved Encryption Algorithms

**Symmetric Encryption:**
- ✅ AES-256-GCM — Preferred for all new deployments
- ✅ AES-256-CBC — Accepted (legacy systems only; migrate by Q2 2027)
- ❌ AES-128 — Deprecated; non-compliant after January 2026
- ❌ 3DES, DES, RC4 — Prohibited

**Asymmetric Encryption:**
- ✅ RSA-4096 — Approved for key exchange
- ✅ ECDSA P-384 — Preferred for digital signatures
- ❌ RSA-1024, RSA-2048 — Below minimum key strength threshold

**Hashing:**
- ✅ SHA-384, SHA-512 — Approved
- ✅ SHA-256 — Accepted for non-critical operations
- ❌ MD5, SHA-1 — Prohibited

### 1.3 Key Management Requirements
- All cryptographic keys managed via HashiCorp Vault (or AWS KMS / Azure Key Vault)
- Hardware Security Modules (HSMs) required for Restricted-class data
- Key escrow documented and tested annually
- Dual-control / split-knowledge for master key access

---

## 2. Storage Asset Encryption Audit

### 2.1 Current Asset Inventory & Compliance Status

| Asset | Classification | Expected Standard | Current Implementation | Gap |
|---|---|---|---|---|
| PostgreSQL (DB-001) | Confidential | AES-256-GCM | AES-256-GCM ✅ | None |
| MongoDB (DB-002) | Confidential | AES-256-GCM | AES-256-GCM ✅ | None |
| Redis (DB-003) | Internal | AES-256-GCM | AES-128-CBC ❌ | Algorithm downgrade + expired cert |
| S3 Bucket (STO-001) | Internal | AES-256 | AES-256 ✅ | None |
| Azure Blob (STO-002) | Internal | AES-256 | AES-256 ✅ | None |
| NAS Share (STO-003) | Confidential | AES-256-GCM | None ❌ | No encryption at all |
| REST Gateway (API-001) | Restricted | TLS 1.3 | TLS 1.3 ✅ | None |
| gRPC Service (API-002) | Confidential | TLS 1.3 | TLS 1.2 ⚠️ | TLS version below preferred standard |

### 2.2 Remediation Priorities
1. **IMMEDIATE (P0):** Enable AES-256-GCM encryption on STO-003 (NAS Share) — data exposed
2. **URGENT (P1):** Migrate DB-003 (Redis) to AES-256-GCM and renew certificate
3. **PLANNED (P2):** Upgrade API-002 to TLS 1.3 before existing cert expires (2026-05-01)

---

## 3. Threat Assessment

### 3.1 Threat Landscape Summary

Based on the AI platform's operational profile (cloud-hybrid, multi-region, external-facing APIs), the following threat categories are assessed:

| Threat Category | Likelihood | Impact | Risk Level | Mitigations |
|---|---|---|---|---|
| API Injection Attacks | HIGH | HIGH | CRITICAL | WAF rules, input validation, parameterised queries |
| Credential Stuffing | HIGH | HIGH | CRITICAL | MFA enforcement, adaptive auth, rate limiting |
| Insider Threat | MEDIUM | CRITICAL | HIGH | RBAC, audit logging, DLP controls |
| Supply Chain Compromise | MEDIUM | HIGH | HIGH | SBOM tracking, dependency scanning, vendor vetting |
| Data Exfiltration | LOW | CRITICAL | HIGH | DLP, network egress controls, encryption |
| LLM Prompt Injection | HIGH | MEDIUM | HIGH | Input sanitisation, output filtering |
| Ransomware | LOW | CRITICAL | MEDIUM | Immutable backups, network segmentation |
| DDoS / Volumetric Attack | MEDIUM | MEDIUM | MEDIUM | CDN, rate limiting, auto-scaling |

### 3.2 AI-Specific Threats
The platform's AI/LLM components introduce additional threat vectors:

- **Model Inversion Attacks:** Adversaries reconstructing training data from model outputs
  - *Mitigation:* Differential privacy, output filtering, rate limiting on inference endpoints
- **Adversarial Inputs:** Carefully crafted prompts causing unexpected/harmful outputs
  - *Mitigation:* Prompt validation, output classifiers, human review for sensitive operations
- **Data Poisoning:** Injecting malicious documents into the RAG knowledge base
  - *Mitigation:* Document upload authentication, content scanning, source verification

### 3.3 Residual Risk Assessment
After applying current controls, residual risk is assessed as:

| Domain | Inherent Risk | Residual Risk | Target |
|---|---|---|---|
| Network perimeter | HIGH | MEDIUM | LOW by Q1 2027 |
| Data encryption | HIGH | MEDIUM-HIGH | MEDIUM by Q4 2026 |
| Application security | MEDIUM | LOW-MEDIUM | LOW by Q2 2027 |
| AI/LLM security | HIGH | HIGH | MEDIUM by Q2 2027 |

---

## 4. Penetration Test Summary (Latest: August 2026)

### 4.1 Scope
External and internal penetration test conducted by CyberSec Partners Pte Ltd.
Scope: All internet-facing APIs, internal microservices, AI inference endpoints.

### 4.2 Findings Summary
| Severity | Count | Remediated | Open |
|---|---|---|---|
| Critical | 1 | 0 | 1 (CVE-2024-3094 — OpenSSH) |
| High | 3 | 1 | 2 |
| Medium | 7 | 5 | 2 |
| Low | 12 | 9 | 3 |

### 4.3 Key Recommendations from Pentest
1. Patch OpenSSH immediately (CVSS 10.0 — remote code execution)
2. Implement HSTS preloading on all public-facing domains
3. Remove verbose error messages from API responses (information disclosure)
4. Enable CSP (Content Security Policy) headers on admin portal

---

## 5. Regulatory & Standards Alignment

| Standard | Requirement | Status |
|---|---|---|
| ISO 27001:2022 A.8.24 | Use of cryptography | Partial — DB-003 and STO-003 gaps |
| PCI-DSS 4.0 Req 3.5 | Protect stored cardholder data | N/A — no card data stored |
| PCI-DSS 4.0 Req 4.2 | Protect data in transit | Partial — TLS 1.2 on API-002 |
| MAS TRM §9.2 | Encryption of data at rest and in transit | Non-compliant — NAS Share unencrypted |
| NIST CSF 2.0 PR.DS | Data Security — Protect | Partial |

*Source Document 2 — Encryption Standards and Threat Assessment Framework v1.8*
