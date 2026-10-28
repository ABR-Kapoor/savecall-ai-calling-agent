# InsurCall Legal, Regulatory and Privacy Readiness Checklist

**Date of Audit**: October 27, 2026  
**Product**: InsurCall (Enterprise WhatsApp-First Insurance Support & Policy Administration Platform)  
**Governing Authorities**: Ministry of Electronics and Information Technology (MeitY), Insurance Regulatory and Development Authority of India (IRDAI), Meta WhatsApp Business Platform  
**Status**: Technical controls implemented; corporate legal determinations flagged for deploying insurer review.

---

## 1. Statutory and Regulatory Reference Framework

| Regulatory Source | Official Authority URL | Retrieval Date | Applicable Scope |
| :--- | :--- | :--- | :--- |
| **Digital Personal Data Protection Act, 2023 (DPDP Act)** | `https://www.meity.gov.in/` | October 27, 2026 | Processing of digital personal data of Indian policyholders; consent notice, purpose limitation, and data fiduciary obligations. |
| **Gazette Notifications & DPDP Rules Schedule** | `https://www.pib.gov.in/` | October 27, 2026 | Phased commencement schedule, Data Protection Board rules, and data fiduciary compliance timelines. |
| **IRDAI (Protection of Policyholders' Interests) Regulations** | `https://irdai.gov.in/web/guest/consolidated-gazette-notified-regulations` | October 27, 2026 | Grievance redressal, policy servicing, disclosure of claim terms, turnaround times (TAT), and prohibition of misleading representations. |
| **Meta WhatsApp Business Platform Policies** | `https://developers.facebook.com/docs/whatsapp/` | October 27, 2026 | 24-hour customer service window, pre-approved template requirements for business-initiated outreach, and opt-in rules. |

---

## 2. Consent Categorization and Technical Enforcement Matrix

InsurCall separates business-owner administration from customer permissions. Imported historical chat records or address book contacts are never treated as consent for future marketing or proactive outreach.

| Consent Category | Legal Requirement | Implemented Technical Control | Verification Evidence | Remaining Legal Determination |
| :--- | :--- | :--- | :--- | :--- |
| **Customer-Initiated Support** | Processing permitted for responding to specific inbound inquiries initiated by customer. | Webhook processes inbound text; responds within the 24-hour service window without requiring pre-approved HSM templates. | Inbound webhook pipeline tested in `scratch/verify-single-inbound-message.mjs`. | Policyholder terms of service acceptance on first interaction. |
| **Business-Initiated Messaging** | Explicit, verifiable opt-in required prior to initiating conversations outside customer window. | Proactive outreach and bulk messaging disabled by default. Template message validation required before dispatch. | Outbound safety guard blocks unprompted socket message generation. | Exact opt-in capture mechanism (proposal form, portal checkbox, or physical mandate). |
| **Opt-Out (STOP / UNSUBSCRIBE)** | Immediate cessation of automated messages upon consumer opt-out request. | Inbound message handler detects opt-out tokens ("STOP", "UNSUBSCRIBE") and flags `opt_out = true` on customer record, suppressing automated replies. | Unit test assertions in `scripts/test-whatsapp-openwa-integration.mjs`. | Standardized SMS/WhatsApp acknowledgement confirmation text review. |
| **Owner Training Transparency** | Data fiduciary must know which data trains internal models; no customer data leakage. | Training interview captures structured facts into isolated tenant vector storage. Customer conversations are quarantined from agent training prompts. | Tenant-scoped pgvector cosine similarity checks in `scratch/test-baileys-sync-pipeline.mjs`. | Insurer-specific intellectual property and model retention policy. |
| **Staff Escalation and Human Handoff** | High-stakes policy decisions, disputes, or claim commitments must be reviewed by authorized staff. | Automated responses halted when confidence is below 0.65 threshold or when `human_takeover = true` is set. | Dual-control escalation queue in `approval_requests` and Unified Inbox takeover toggle. | Insurer underwriting authority matrix and adjuster delegation limits. |

---

## 3. Data Minimization, Privacy Safeguards and Prohibitions

InsurCall enforces data minimization rules at both the application boundary and retrieval layers:

1. **Cardholder and Financial Authentication Data**:
   - The application strictly prohibits the intake, storage, or processing of credit/debit card numbers, CVVs, PINs, and banking passwords.
   - Any detected OTPs or payment authorization codes in inbound messages are redacted prior to database persistence.

2. **Personal Policy Disclosure Guard**:
   - Inbound WhatsApp phone number (caller JID) is treated as an unverified communication identifier, not proof of authenticated policyholder identity.
   - Detailed policy schedules, beneficiary identities, and claim payout amounts require customer verification (such as policy number plus registered mobile OTP verification) before disclosure.

3. **Demarcation Between Real Customer Records and Demo Fixtures**:
   - All synthetic underwriting records and test conversations are explicitly tagged with `is_demo = true`.
   - The live production inbox queries enforce `is_demo = false` to guarantee that fictional insurance profiles never mix with authentic policyholder records.

4. **Zero Unsolicited Outbound Side-Effects**:
   - The standalone gateway enforces `ALLOW_OUTBOUND_WHATSAPP="true"` environment gating.
   - The webhook ingress enforces `ENABLE_WHATSAPP_AI_AUTOREPLY="true"` environment gating.
   - All connection rows default to `auto_reply_enabled = false` in PostgreSQL.

---

## 4. Checklists for Deploying Insurer Compliance Teams

Before transitioning an InsurCall deployment from pilot to full commercial insurance operations, the deploying insurer or brokerage compliance team must complete the following determinations:

- [ ] **Data Protection Officer (DPO) Review**: Confirm Data Fiduciary categorization under the DPDP Act and establish policyholder grievance escalation timeframes (Section 8).
- [ ] **WhatsApp Business Solution Provider (BSP) Verification**: Complete Meta Business Verification, display name approval, and Official Business Account (green badge) application.
- [ ] **Grievance Redressal Officer Publishing**: Ensure the name and contact details of the insurer's Grievance Redressal Officer (GRO) are accessible via the automated assistant on command.
- [ ] **Statutory Disclaimer Alignment**: Verify that the automated agent greeting includes the mandatory IRDAI disclosure that insurance is the subject matter of solicitation.
- [ ] **Claim Intake Legal Boundaries**: Affirm that customer-submitted claim details through WhatsApp are classified as "First Notice of Loss (FNOL) Intake" and not final settlement approvals.
