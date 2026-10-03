# AI Compliance Platform — Security Baseline
**Document ID:** SRC-001  
**Classification:** Internal — Security  
**Version:** 2.4  
**Last Reviewed:** October 2026  

---

## 1. Firewall Policy Baseline

### 1.1 Network Perimeter Controls
All inbound traffic to the AI Platform must traverse at least two firewall layers:

- **Layer 1 (Edge WAF):** Web Application Firewall — OWASP Top 10 ruleset enforced, rate limiting 1000 req/min per IP.
- **Layer 2 (Internal SGW):** Security Gateway — micro-segmented VLAN-to-VLAN traffic control with stateful packet inspection.

### 1.2 Approved Inbound Ports

| Port | Protocol | Service | Source | Justification |
|------|----------|---------|--------|---------------|
| 443 | HTTPS/TLS1.3 | API Gateway | Public Internet | Customer API access |
| 8443 | HTTPS | Admin Portal | Corporate VPN only | Operations management |
| 5432 | TCP | PostgreSQL | App subnet only | Database access |
| 6379 | TCP | Redis | App subnet only | Cache layer |
| 27017 | TCP | MongoDB | App subnet only | Document store |
| 11434 | TCP | Ollama LLM | Localhost only | AI inference |

### 1.3 Blocked Traffic Categories
- All inbound ICMP (ping) from external networks
- Traffic from OFAC/sanctioned IP ranges (updated weekly)
- Outbound connections to known C2 domains (threat intelligence feed)
- Unencrypted HTTP (port 80) — redirect to HTTPS enforced

---

## 2. Network Security Architecture

### 2.1 Zero-Trust Network Access (ZTNA)
The platform implements ZTNA principles:
- Identity-aware proxying for all internal service-to-service communication
- Mutual TLS (mTLS) enforced between all microservices
- No implicit trust based on network location

### 2.2 Data-in-Transit Encryption Standards
All data in transit must be encrypted using:
- **Minimum:** TLS 1.2 (DEPRECATED — upgrade path required by Q1 2027)
- **Preferred:** TLS 1.3 with forward secrecy (ECDHE cipher suites)
- **Certificate Management:** Automated renewal via Let's Encrypt ACME protocol

### 2.3 Intrusion Detection & Prevention
- **IDS/IPS:** Snort 3.x with custom rules for AI workload traffic patterns
- **SIEM Integration:** All firewall logs forwarded to Splunk (15-day hot retention, 365-day cold)
- **Anomaly Detection:** Baseline deviation alerts for east-west traffic volumes

---

## 3. Incident Response — Network Events

### 3.1 Severity Classification
| Level | Response Time | Example |
|-------|--------------|---------|
| P0 — Critical | 15 minutes | Active breach detected, data exfiltration |
| P1 — High | 1 hour | Firewall bypass attempt, port scan |
| P2 — Medium | 4 hours | Repeated auth failures, anomalous traffic |
| P3 — Low | 24 hours | Informational alerts, policy tuning |

### 3.2 Regulatory Notification Requirements
- **MAS TRM:** Notify within 1 hour for P0 incidents affecting regulated activities
- **PDPA (Singapore):** Notify PDPC within 3 business days for personal data breaches
- **ISO 27001 A.16:** Document all incidents; root cause analysis within 5 business days

---

## 4. Compliance References
- ISO/IEC 27001:2022 — Controls A.8 (Technological controls)
- NIST Cybersecurity Framework 2.0 — PR.AC, DE.CM categories
- MAS TRM Guidelines (January 2021) — Section 9 (Cyber Risk Management)
- PCI-DSS v4.0 — Requirement 1 (Network Security Controls)

*Source Document 1 — Firewall Policy and Network Security Baseline v2.4*
