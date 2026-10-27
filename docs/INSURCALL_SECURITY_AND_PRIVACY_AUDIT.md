# INSURCALL SECURITY AND PRIVACY AUDIT

## 1. Executive Summary

This document details the security architecture, data governance policies, tenant isolation mechanics, and privacy controls implemented in InsurCall. It evaluates platform compliance against modern data protection standards, including India's Digital Personal Data Protection (DPDP) Act 2023, IRDAI policyholder servicing regulations, and WhatsApp Business Platform terms.

---

## 2. Multi-Tenant Isolation and Data Protection

### 2.1 Server-Side Authorization Boundary
- **Tenant Resolution**: Organization resolution occurs strictly on the server by inspecting authenticated Clerk user sessions against the `tenant_members` table.
- **Client Parameter Tampering Defense**: Client-supplied `tenant_id` parameters in HTTP headers or query strings are never trusted implicitly. If a user attempts to query an organization to which they do not belong, the server rejects the request with HTTP 403 Forbidden.
- **Database Row-Level Security (RLS)**: PostgreSQL tables containing policy records, claims, WhatsApp conversations, messages, and vector embeddings are protected by tenant-scoped policies (`tenant_id = current_tenant_id()`).

### 2.2 Vector Store Partitioning
- Vector similarity searches executed via `match_document_chunks` require an immutable `filter_tenant_id` parameter.
- Cross-tenant vector leakage is mathematically excluded from query plans. Tenant A can never retrieve documents, rate cards, or policy clauses belonging to Tenant B.

---

## 3. Real Consent and Privacy Controls

InsurCall treats consent as an active runtime filter rather than a decorative UI checkbox:

### 3.1 WhatsApp Inbound and Outbound Opt-Out Handling
- **Keyword Recognition**: The message ingestion pipeline checks all inbound messages for statutory opt-out keywords: `STOP`, `UNSUBSCRIBE`, `OPTOUT`, `CANCEL`, or `HALT`.
- **Automated Suspension**: Upon receipt of an opt-out signal, the system:
  1. Sets `opt_out = true` and `automation_mode = 'paused'` on the conversation record.
  2. Dispatches an automated confirmation acknowledging the opt-out.
  3. Suppresses all future automated AI responses to that customer phone number until explicit opt-in re-engagement occurs.

### 3.2 Sensitive Data Redaction Policy
In accordance with IRDAI and banking guidelines:
- The assistant is strictly prohibited from collecting or storing payment card CVVs, netbanking passwords, or Aadhaar One-Time Passwords (OTPs).
- Server logging middleware automatically redacts phone numbers, email addresses, and secret bearer tokens before persisting operational logs.

---

## 4. Regulatory Compliance Checklist (Indian Deployment)

| Regulatory Framework | Core Requirement | InsurCall Implementation Status | Verification Notes |
| :--- | :--- | :--- | :--- |
| **DPDP Act 2023** | Notice and Consent Architecture | Implemented | Clear statutory AI disclosure delivered on conversation initiation. |
| **DPDP Act 2023** | Purpose Limitation & Minimization | Implemented | Knowledge extraction restricted to policy servicing; data retained only for active policy lifecycle. |
| **DPDP Act 2023** | Right to Grievance Redressal | Implemented | Dual-control human handoff allows immediate escalation to licensed grievance officers. |
| **IRDAI Guidelines** | Policyholder Data Localization | Verified | Database and vector stores reside on ap-southeast / domestic cloud infrastructure. |
| **IRDAI Guidelines** | Dual-Control for Policy Endorsements | Implemented | Changes to policy nominees, contact addresses, or coverage limits require staff approval in `/change-requests`. |
| **WhatsApp Platform** | 24-Hour Customer Service Window | Implemented | Free-form AI responses allowed within 24 hours of customer inbound; template messages required outside window. |
| **WhatsApp Platform** | Transparent AI Identity | Implemented | Mandatory disclosure statement: "I am Anya, an automated AI assistant representing [Agency Name]." |

*Note: While InsurCall implements the necessary technical controls for privacy and data protection, formal regulatory compliance certification requires independent legal counsel review by the deploying insurance organization.*
