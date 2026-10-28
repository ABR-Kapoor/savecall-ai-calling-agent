# InsurCall Compliance Implementation Matrix

**Date**: October 28, 2026
**Product**: InsurCall pilot — AI WhatsApp-first insurance support platform
**Status**: Implementation-phase working matrix. **Not a certification.** Legal conclusions require Indian legal counsel review.

---

## How to read this matrix

- **Classification** means the nature of the obligation: statutory, platform/provider policy, contractual, or recommended practice.
- **Applicability** reflects what is actually in scope for the pilot: InsurCall, the deploying business customer, or both.
- **Status** reflects repository + deployment evidence at audit time, not legal advice.

---

## Requirement Matrix

| # | Requirement | Classification | Source (retrieved/accessed Oct 2026) | Applicability | Effective / current status | Evidence in repository | Status | Owner action |
|---|---|---|---|---|---|---|---|---|
| 1 | DPDP Act 2023 — consent notice, purpose limitation, data fiduciary obligations | Statutory | MeitY DPDP Act & Rules: `https://www.meity.gov.in/` | Both (InsurCall processor + deploying insurer controller) | Rules notified; phased commencement to be confirmed | Legal pages `/privacy`, `/data-processing`, `/consent-preferences`; outbound guard | Partial — policy pages authored; consent enforcement not fully customer-facing | Confirm commencement position; legal counsel review |
| 2 | Consent evidence capture (purpose/channel/timestamp/source) | Statutory / recommended | MeitY DPDP | Both | Pilot-stage partial | WhatsApp conversation records, approval tickets | Partial — consent logs referenced; no standalone consent store verified | Owner confirmation |
| 3 | Opt-out / suppression handling for outbound sends | Platform/contractual | WhatsApp Business Messaging Policy: `https://business.whatsapp.com/policy` | InsurCall + deploying customer | Pilot-stage partial | Outbound safety gate; webhook inbound auto-reply gate | Partial — kill switch, loops, groups, LID, takeover, cooldown gated; explicit STOP/opt-out state machine not verified | Owner confirmation + backend verification |
| 4 | Approved templates / customer-service window / human escalation | Platform policy | WhatsApp Business Platform docs | InsurCall + deploying customer | Pilot-stage partial | Outbound guard; human takeover; escalation tickets; AI disclosure with escalation | Partial — escalation path exists for ungrounded queries | Confirm provider-side template approval & window compliance |
| 5 | WhatsApp Business voice calling availability | Platform policy / provider eligibility | Meta WhatsApp Business docs; LiveKit ConnectorClient audit (`docs/LIVEKIT_WHATSAPP_CALLING_AUDIT.md`) | InsurCall + deploying customer | Pilot-stage conditional | LiveKit ConnectorClient support verified in SDK 2.9.7; meta-cloud-adapter; missed-call textback | Conditional / not yet production-verified | Owner confirmation of Meta app eligibility & provider account |
| 6 | AI assistant disclosure (automated identity, capability limits, human escalation) | Recommended / contractual | Owner-supplied prompt | End users of deploying customers | Implemented (public page `/ai-disclosure`) | `src/routes/ai-disclosure.tsx` | Implemented (presentation) | Validate wording with counsel |
| 7 | AI must not guarantee coverage / approve claims | Recommended / statutory consumer-protection awareness | IRDAI / consumer protection jurisprudence | Business customer + end users | Implemented (presentational) | AI disclosure, grounded RAG gate (ungrounded → no auto-reply, escalate), approval workflow | Implemented at guard level for auto-replies | Legal review of binding-decision language |
| 8 | Local/self-hosted inference default; external fallback opt-in | Statutory / contractual | Owner-supplied; MeitY DPDP | InsurCall | Implemented (default local_only; Groq fallback behind `GROQ_API_KEY` + policy flag) | `src/lib/rag/retrieval.server.ts`, `src/lib/rag/embeddings.server.ts` | Partial — local default verified in code; runtime region not verified | Confirm deployment region |
| 9 | Model training on customer content | Contractual / recommended | Owner-supplied | InsurCall | Not verified in code | RAG design docs | Missing — must confirm no fine-tuning/training path exists | Owner confirmation |
| 10 | Subprocessor disclosure accuracy | Contractual | Owner-supplied | InsurCall | Implemented (`/subprocessors`) | InsForge, Meta, Clerk, Groq, LiveKit, Resend, InsurCall infra | Partial — list flagged unverified for deployment-specific items | Owner confirmation |
| 11 | Multi-tenant isolation (server-side resolution, RLS) | Statutory / security | DPDP, CERT-In | InsurCall | Implemented (RLS migrations + server tenant resolution) | `insforge/migrations/*`, `resolveCurrentTenantId` | Implemented (partial per prior audit) | Re-run tenant-isolation tests |
| 12 | Data minimisation & log redaction | Recommended | DPDP | InsurCall | Implemented (masked recipients, no card/CVV storage) | Outbound guard `maskRecipient`, ingest redaction | Implemented (partial) | Ongoing |
| 13 | Deletion & derived-data handling | Statutory | DPDP | InsurCall | Partial — retention configurable intent | Migrations, RAG chunks/embeddings, support tickets | Missing automated end-to-end deletion flow verification | Owner + legal |
| 14 | Security page accuracy (no fabricated claims) | Recommended | CERT-In / DPDP | Public | Implemented | `/security` | Implemented (presentational) | Ongoing |
| 15 | Retention schedule | Statutory / contractual | DPDP | InsurCall | Partial — no active retention controls verified | `/retention` | Missing | Owner |
| 16 | TRAI SMS/OTT regime | Statutory | TRAI | Not applicable to WhatsApp messaging | Not applicable (WhatsApp is OTT messaging) | — | N/A | — |
| 17 | Children’s data / age gating | Statutory | DPDP | InsurCall | Not verified | — | Missing | Owner + counsel |

---

## Legal Entity / Identity Confirmation Required

The following must be confirmed by the owner before public disclosure can be made fully accurate:

1. Exact legal entity name and legal status (incorporated / unregistered startup).
2. Whether "InsurCall Agent" is a registered name, trade name, or product name.
3. Complete registered/business address (the supplied "NIT RAIPUR" is incomplete).
4. Whether a statutory grievance officer designation is required/required to be appointed.
5. Support/privacy contact final designation: `lightlanister@gmail.com` (owner-supplied).

## Technical Verification Items Required

1. Actual AI inference execution path (local vs external) at deployed runtime.
2. Confirmed hosting/data-region of database, storage, embeddings, and inference.
3. Recording/transcription capability status (implemented vs not implemented vs planned).
4. Retention enforcement status per category.
5. Consent/opt-out state machine end-to-end enforcement.
6. Deletion workflow coverage (conversations, documents, chunks, embeddings, backups).

---

**Next actions**: complete owner confirmations, counsel legal review, close technical verification gaps listed above, then proceed to Phase 9 (testing) and Phase 11 (final report).
