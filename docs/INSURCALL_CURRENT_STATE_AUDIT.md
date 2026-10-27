# InsurCall Current State Audit

## Executive Summary

This audit assesses the codebase, runtime configurations, database source of truth, API surface, and user experience of InsurCall. It identifies gaps between earlier claims and verified runtime reality, providing the factual foundation for the production rebuild.

---

## 1. Feature Classification Matrix

| Surface / Feature | Classification | Evidence & Source of Truth | Remediation Plan |
|---|---|---|---|
| **WhatsApp Multi-Device Engine** | **REAL** | Native `@whiskeysockets/baileys` gateway running on port 2785 with in-process server fallback (`embedded-engine.server.ts`). Generates live QR codes from WhatsApp WebSocket servers. | Keep upstream provider isolated behind `OpenWAAdapter`; clearly designate unofficial Multi-Device as experimental/sandbox. |
| **WhatsApp Inbound Webhook** | **REAL** | `src/routes/api/webhooks/whatsapp.ts` implements HMAC-SHA256 signature verification, deduplication, and loop prevention (`fromMe: true`). | Enforce opt-out checks and integrate direct FNOL draft creation. |
| **Grounded Policy RAG Pipeline** | **REAL** | Vector search using `pgvector` with cosine similarity (`retrieveAgentKnowledge`) and local ONNX embeddings (`all-MiniLM-L6-v2`) in `retrieval.server.ts`. | Add strict conflict detection and conversational extraction. |
| **High-Risk Approvals Queue** | **REAL** | `approval_requests` table with status workflow (`pending`, `approved`, `rejected`) in `change-requests.tsx`. | Add audit logging on all decision mutations. |
| **Policy Records Directory** | **REAL** | Backed by PostgreSQL `policies` table (13 rows) with customer joins. | Correct category skew (previously seeded with all-health plans) to support Motor, Life, Property, and Commercial lines. |
| **Claims Intake & FNOL** | **PARTIALLY IMPLEMENTED** | UI table in `claims.tsx` exists, but `claims` database table has 0 rows and lacks a conversational bridge from WhatsApp chat. | Implement automated FNOL intake flow in WhatsApp assistant to create draft claims. |
| **Phone & Telephony (PSTN/SIM)** | **DEPRECATED** | Carrier selection, SIM forwarding codes (*21*), dedicated landlines, and SIP trunking in `phone.tsx`. | Remove from primary navigation; re-route to WhatsApp Channels & Calling settings. |
| **Live Calls & Voice Simulator** | **MOCK / SIMULATOR** | WebRTC / LiveKit browser microphone simulator in `/voice`. Useful for testing, but not connected to cellular networks. | Retain as internal sandbox; label clearly as "Simulation Sandbox". |
| **Voice Calling via WhatsApp** | **RESTRICTED BY PROTOCOL** | OpenWA / Baileys does not support live bidirectional audio RTP streaming. | Implement graceful call rejection (`calls/:id/reject`) and instant automated WhatsApp textback. Disclose status transparently. |

---

## 2. Key Audit Findings & Root Causes

### Finding 1: Misleading Telephony Navigation
- **Observation**: The primary navigation featured "Phone & Telephony", prompting users to select Airtel/Jio/Vodafone and dial `*21*` call forwarding strings.
- **Root Cause**: An earlier architecture attempted to build a cellular missed-call service. However, the product North Star is **WhatsApp-first**.
- **Action**: Deprecate cellular forwarding from primary navigation. Redirect `/phone` to the WhatsApp Channels settings tab.

### Finding 2: Category Skew in Insurance Records
- **Observation**: The policy directory displayed multiple records, all titled "Comprehensive Health Shield Platinum".
- **Root Cause**: A seed script populated 13 rows using hard-coded health plan attributes.
- **Action**: Seed diverse insurance lines (Health, Motor, Life, Property, Commercial, Travel) with distinct policy numbers, terms, and deductibles.

### Finding 3: Duplicate Agent and Knowledge Surfaces
- **Observation**: Knowledge was configurable in `Settings & Agent Studio`, `AI Employee Studio`, and `Policy Knowledge Store`, with conflicting system prompts.
- **Root Cause**: Incremental UI feature additions without consolidation.
- **Action**: Consolidate into two primary workspaces:
  1. **AI Agent Studio** (`/agent`): Identity, persona, bilingual tone, permitted/disallowed skills, safety boundaries.
  2. **Knowledge & Training** (`/train`): Conversational owner interview, document uploads, fact approval, and vector retrieval testing.

### Finding 4: WhatsApp Voice Reality
- **Observation**: UI cards previously stated "Voice Agent Ready" for WhatsApp.
- **Root Cause**: Conflating local WebRTC simulators with WhatsApp's unofficial Multi-Device protocol.
- **Action**: Truthfully label WhatsApp voice capability as "Auto-Rejection & Automated Policyholder Textback Active". Inbound voice calls are rejected and policyholders receive an automated WhatsApp text directing them to the 24/7 chat assistant or direct hotline.

---

## 3. Security and Tenant Isolation Posture

1. **Database Access**: PostgreSQL connection uses SSL with parameterized queries via `pg.Pool`. Server functions resolve `tenant_id` from the authenticated Clerk session, preventing cross-tenant data leakage.
2. **Secrets Handling**: Server-side API keys (`INSFORGE_SERVICE_KEY`, `OPENWA_API_KEY`, `DATABASE_URL`) are strictly kept out of client bundles.
3. **Webhook Verification**: Webhook payloads are verified using HMAC-SHA256 digests against per-connection `webhook_secret` values.
