# InsurCall: Engineering & Product Source of Truth

> Primary reference for InsurCall engineering, architecture, runtime services, data contracts, and security rules.

---

## 1. Product Purpose & Supported Insurance Workflows

InsurCall is an insurance-specific operations and customer engagement platform built for insurance brokers, agencies, and carriers. It automates high-volume policyholder communications across two mandatory, coexisting channels: **conversational AI voice calling** and **WhatsApp messaging**.

### Supported Insurance Workflows:
1. **First Notice of Loss (FNOL) & Claims Intake**:
   - Collects policy number, incident date, damage description, vehicle/property reference, and contact details.
   - Logs structured claim intake into the `claims` table.
   - Routes claims to staff adjusters for review; prevents automated, unauthorized claim approvals.
2. **Policy Coverage & Premium Enquiries**:
   - Answers policy coverage questions grounded exclusively in approved insurance documents via vector retrieval (pgvector).
   - Provides clear citations to policy clauses.
   - Fails closed when evidence is absent or ambiguous; triggers staff escalation rather than hallucinating coverage.
3. **Dual-Control Policy Endorsement & Change Requests**:
   - Manages sensitive change requests (nominee update, beneficiary change, address update, cancellation).
   - Enforces two-person dual control: the AI assistant captures the intent, logs a structured request in `approval_requests`, and holds the change until licensed human staff explicitly approves or rejects it.
4. **Staff Takeover & Human Handoff**:
   - In WhatsApp messaging: setting `human_takeover: true` immediately pauses AI auto-replies, leaving the thread under staff control until explicitly released.
   - In Voice sessions: warm transfer fallback, structured notes, and callback scheduling.

---

## 2. Mandatory Coexistence of Voice Agent & WhatsApp Messaging

InsurCall is strictly a dual-channel platform. Neither channel replaces the other:
- **AI Voice Agent (WebRTC / LiveKit)**:
  - Real-time conversational audio with sub-30ms Silero voice activity detection (VAD), barge-in / interruption handling, and dual browser audio capture / playback.
  - Runtime: Self-hosted LiveKit media server (`bin/livekit/livekit-server.exe`) on port 7880 with a Python agent worker (`agent/agent.py`) utilizing Groq Cloud (`llama-3.3-70b-versatile` or `qwen-2.5-32b`) and local Ollama fallback.
  - Browser UI: `/voice` for active WebRTC sessions, `/calls` for call records and transcripts.
- **WhatsApp Messaging (Multi-Device Gateway)**:
  - Multi-device WhatsApp messaging using the OpenWA HTTP gateway or embedded Baileys engine.
  - Supports authenticated session management, QR pairing, inbound webhook ingress with HMAC-SHA256 verification, and unified inbox (`/whatsapp`).
  - Strict separation: WhatsApp call detection or call rejection is a signaling event, NOT a replacement for the two-way LiveKit AI voice call.

---

## 3. Architecture & Runtime Services

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT BROWSER                                    |
|   TanStack Start (React 19, TypeScript) - Light-Themed Insurance Operations UI   |
|   Routes: /dashboard, /whatsapp, /calls, /voice, /phone, /claims, /train, etc.    |
+-----------------------------------------------------------------------------------+
           |                                     |                         |
     HTTP Server Functions                 WebRTC Audio              REST / WebSocket
           |                                     |                         |
           v                                     v                         v
+-----------------------+              +-------------------+     +-------------------+
|  TanStack Start SSR   |              |  LiveKit Server   |     |  OpenWA / Baileys |
|  Node.js API Server   |              |  WebRTC (Port     |     |  WhatsApp Gateway |
|  - Auth (Clerk)       |              |  7880 / 7881)     |     |  (Port 2785)      |
|  - Outbound Guard     |              +-------------------+     +-------------------+
|  - RAG Retrieval      |                        |                         |
+-----------------------+                        |                         |
       |          |                              v                         v
       |   pgvector / SQL              +-------------------+     +-------------------+
       |          |                    |  Python Agent     |     |  WhatsApp Ingress |
       |          v                    |  (agent/agent.py) |     |  HMAC Webhook     |
       |  +---------------------+      |  Silero VAD + LLM |     |  /api/webhooks/   |
       |  | Hosted PostgreSQL   |      +-------------------+     |  whatsapp         |
       |  | (InsForge Database) |                                +-------------------+
       |  | - tenants           |
       |  | - customers         |
       |  | - policies          |
       |  | - claims            |
       |  | - call_sessions     |
       |  | - whatsapp_*        |
       |  | - knowledge_sources |
       |  | - approval_requests |
       |  +---------------------+
       v
+-------------------------------+
| External LLM / Embedding APIs |
| - Groq Cloud API              |
| - Ollama (Local Fallback)     |
+-------------------------------+
```

---

## 4. Frontend Routes & Navigation Structure

### Navigation Registry (`src/components/app-shell.tsx`):
- **Core Platform (`NAV_CORE`)**:
  - `/dashboard`: Operations Overview (business metrics, real calls, open claims, staff approvals).
  - `/whatsapp`: Unified WhatsApp Inbox (multi-device chats, message history, staff replies, takeover controls).
  - `/calls`: Voice Calls & Sessions (WebRTC call records, duration, caller identity, transcripts).
  - `/agent`: AI Agent Studio (identity, customer disclosures, safety boundaries, escalation triggers).
  - `/train`: Knowledge & Training (policy document upload, guided interviews, vector test queries).
- **Operations & Governance (`NAV_GOVERNANCE`)**:
  - `/claims`: Claims Intake & FNOL (claims register, status tracking, customer and policy mapping).
  - `/change-requests`: Approvals & Handoffs (dual-control endorsement reviews, customer query escalations).
  - `/policies`: Insurance Records (policy portfolios, coverage details, renewal dates, nominee records).
  - `/phone`: Telephony & Forwarding (carrier numbers, SIP forwarding configuration, verification).
  - `/settings`: Settings & System Diagnostics (agency profile, assistant persona, governance, and infrastructure health).
  - `/audit`: Activity & Audit Trail (tamper-evident operational audit logs).
- **Dedicated Engine Routes**:
  - `/voice`: LiveKit WebRTC Voice Room (real-time microphone capture, Silero VAD, live waveform, live transcript).
  - `/`: Public Landing Page (insurance value proposition, idle-by-default interactive demo).

---

## 5. WhatsApp Contact Identity & Multi-Device LID Normalization

### Upstream Identity Formats:
- Standard User JID: `<phone_number>@s.whatsapp.net` or `<phone_number>@c.us`. Cleaned to E.164: `+<digits>`.
- Multi-Device LID: `<lid_digits>@lid`. Formatted as `LID:<digits>`. Never prepended with `+` or saved as a pseudo-phone number.
- WhatsApp Groups: `<group_id>@g.us`. Formatted as `GROUP:<group_id>`. Auto-replies strictly prohibited.
- Broadcast Lists: `status@broadcast` or `<id>@broadcast`. Ignored and excluded from customer inboxes.

### Authoritative Parser:
Located in `src/lib/whatsapp/identity.ts`:
- `parseWhatsAppIdentity(rawJid: string)`: Returns `{ rawJid, type, phone, displayIdentifier, isGroup, isLid }`.
- `cleanWhatsAppPhone(rawJid: string)`: Returns the clean E.164 phone or formatted `LID:<id>`.

---

## 6. Outbound WhatsApp Safety Gates & Kill Switch

Located in `src/lib/whatsapp/outbound-guard.server.ts`:
1. **Server-Side Outbound Kill Switch**:
   - `WHATSAPP_OUTBOUND_KILL_SWITCH === "true"` immediately halts all outbound sends across AI auto-replies, staff sends, and test messages.
2. **Development & Test Environment Recipient Allowlist**:
   - In non-production environments, outbound messaging is fail-closed.
   - When enabled via `ALLOW_DEV_OUTBOUND_WHATSAPP === "true"`, messages can ONLY be sent to recipients explicitly listed in `WHATSAPP_TEST_ALLOWLIST`.
   - Real contacts not on the allowlist are safely blocked with code `RECIPIENT_NOT_ALLOWLISTED`.
3. **Loop & Echo Prevention**:
   - Messages with `fromMe === true` are ignored immediately.
   - Outbound echoes are never fed back into the auto-reply engine.
4. **Group & Unmapped LID Protection**:
   - Group chats are rejected for automated replies (`GROUP_AUTO_REPLY_PROHIBITED`).
   - LIDs without mapped allowlist entries are rejected (`LID_UNMAPPED`).
5. **Human Takeover Preservation**:
   - If `conversation.human_takeover === true` or `connection.human_takeover_enabled === true`, the AI engine remains completely silent (`HUMAN_TAKEOVER_ACTIVE`).
6. **Rate Limiting & Cooldown**:
   - Enforces a minimum 4-second cooldown between replies to the same conversation to prevent runaway reply loops.

---

## 7. Insurance RAG Grounding & Escalation Rules

Located in `src/lib/rag/retrieval.server.ts` and `src/lib/rag/ingestion.server.ts`:
1. **Tenant Isolation**: Every vector retrieval query enforces `WHERE tenant_id = :tenantId`. Cross-tenant search is cryptographically and logically prohibited.
2. **Strict Grounding Requirement**:
   - Cosine similarity threshold is set to 0.65.
   - If confidence is below 0.65 or approved documents do not contain the answer, the model abstains (`grounded: false`).
   - The engine triggers `needs_human_review: true` and logs a handoff record in `approval_requests`.
3. **Prohibition of Hallucinated Decisions**:
   - The AI assistant is strictly forbidden from approving claims, committing to payouts, or guaranteeing coverage.
   - Any sensitive operation must be escalated to a licensed staff adjuster.

---

## 8. Authentication & Tenant Isolation

1. **Clerk Authentication**:
   - Server-side verification via `requireAuthenticatedUser` and `requireTenantMember` (`src/lib/auth/clerk.server.ts`).
   - Tenant membership resolved strictly through the `tenant_members` table.
   - Client-supplied `tenantId` is validated against user membership; cross-tenant requests return `403 Forbidden`.
2. **PostgreSQL Row-Level Security (RLS)**:
   - All operational tables (`customers`, `policies`, `claims`, `call_sessions`, `whatsapp_*`, `knowledge_sources`, `approval_requests`) contain a `tenant_id` foreign key with active indexes.
3. **Webhook Cryptographic Verification**:
   - WhatsApp webhooks verify `x-openwa-signature` / `x-hub-signature-256` HMAC-SHA256 using the connection's `webhook_secret`.
   - Clerk webhooks verify Svix signatures (`svix-id`, `svix-timestamp`, `svix-signature`).

---

## 9. System Diagnostics Architecture

Located in `src/routes/_authenticated/settings.tsx` (Tab: "System Diagnostics"):
- Technical diagnostics are excluded from the main business Overview page and consolidated in Settings.
- Truthful health checks:
  1. Application Server & TanStack Start Runtime (Node version, uptime, memory).
  2. PostgreSQL Database Engine (live latency, table count, RLS enforcement).
  3. WhatsApp Multi-Device Gateway (OpenWA probe, socket status, error state).
  4. LiveKit WebRTC Media Server (port 7880 probe, latency).
  5. Python Voice Agent Worker (credentials, pipeline readiness).
  6. Grounded RAG & LLM Engine (provider availability, pgvector index).
  7. WhatsApp Outbound Safety Gate & Kill Switch (kill switch status, test allowlist count).

---

## 10. Verified Feature Status Matrix

| Component | Status | Source Location | Verification Evidence |
|---|---|---|---|
| **AI Voice Agent Engine** | `Verified` | `agent/agent.py`, `src/routes/voice.tsx` | Connects to LiveKit, Silero VAD, WebRTC room join, dual captions |
| **LiveKit Media Server** | `Verified` | `bin/livekit/livekit-server.exe`, port 7880 | Dev mode binary on port 7880, startup scripts valid |
| **Voice Navigation & Records** | `Verified` | `src/routes/_authenticated/calls.tsx` | Traced in app-shell, queries real `call_sessions` table |
| **Landing Hero Demonstration** | `Verified` | `src/components/insurance-hero-panel.tsx` | Idle by default (0s), explicit user click to start simulation |
| **WhatsApp Multi-Device Gateway** | `Verified` | `src/lib/whatsapp/openwa-adapter.ts` | Dual OpenWA HTTP + Baileys socket integration |
| **WhatsApp Contact Identity (LID)** | `Verified` | `src/lib/whatsapp/identity.ts` | Authoritative parsing of LIDs, groups, and standard JIDs |
| **Outbound Safety Kill Switch** | `Verified` | `src/lib/whatsapp/outbound-guard.server.ts` | Fail-closed server-side gates, dev allowlist restriction |
| **Ungrounded RAG Escalation** | `Verified` | `src/routes/api/webhooks/whatsapp.ts` | Low confidence (<0.65) routes to `approval_requests` queue |
| **Business Operations Dashboard** | `Verified` | `src/routes/_authenticated/dashboard.tsx` | Real business metrics only; developer diagnostics moved to Settings |
| **System Diagnostics Tab** | `Verified` | `src/routes/_authenticated/settings.tsx` | Real latency & availability probes for all 7 subsystem components |
| **Claims Intake & FNOL** | `Verified` | `src/routes/_authenticated/claims.tsx` | Restored in navigation, queries authenticated `claims` table |
| **Telephony & Forwarding** | `Verified` | `src/routes/_authenticated/phone.tsx` | Restored in navigation, carrier forwarding configuration |

---

## 7. LiveKit Cloud x WhatsApp Business Voice Calling

InsurCall implements two-way WhatsApp Business voice calling using the official **LiveKit Cloud Telephony WhatsApp Connector** and **Meta WhatsApp Cloud API (Graph API v26.0 candidate)**.

### Target Execution Flows:
1. **Inbound Call (Customer-Initiated)**:
   - Policyholder calls company WhatsApp Business number from WhatsApp mobile app.
   - Meta sends incoming call webhook with WebRTC SDP offer to `/api/webhooks/meta-whatsapp`.
   - Backend verifies HMAC-SHA256 signature (`X-Hub-Signature-256`) using `META_APP_SECRET`.
   - Webhook checks calling feature gates and business calling hours.
   - Idempotency guard claims `event_key` in `whatsapp_call_events` to prevent duplicate dispatch.
   - Backend invokes `connectorClient.acceptWhatsAppCall` with `RoomAgentDispatch` for `LIVEKIT_WHATSAPP_AGENT_NAME`.
   - Caller joins dedicated LiveKit room (`wa-call-<tenant>-<call_id>`).
   - Python voice agent (`agent/agent.py`) connects, greets policyholder, and provides sub-30ms Silero VAD barge-in with grounded insurance RAG tools.
   - Call lifecycle, transcript, summary, duration, and outcome are persisted in `call_sessions`.

2. **Outbound Call (Staff-Initiated)**:
   - Authorized staff selects a policyholder in `/calls` and clicks **Call on WhatsApp**.
   - Backend verifies Clerk authentication, tenant membership, recipient contact ownership, feature gates, and explicit calling consent.
   - In test mode, recipient must be present in `WHATSAPP_ALLOWED_TEST_RECIPIENTS`.
   - Backend invokes `connectorClient.dialWhatsAppCall`.
   - Meta delivers call-connection webhook with WebRTC SDP answer.
   - Backend invokes `connectorClient.connectWhatsAppCall`.
   - Voice agent joins the room and converses with policyholder.

### Official LiveKit Connector APIs (`livekit-server-sdk`):
- `acceptWhatsAppCall(options: AcceptWhatsAppCallOptions): Promise<AcceptWhatsAppCallResponse>`
- `dialWhatsAppCall(options: DialWhatsAppCallOptions): Promise<DialWhatsAppCallResponse>`
- `connectWhatsAppCall(whatsappCallId: string, sdp: SessionDescription): Promise<ConnectWhatsAppCallResponse>`
- `disconnectWhatsAppCall(whatsappCallId: string, whatsappApiKey: string, reason?: DisconnectReason): Promise<DisconnectWhatsAppCallResponse>`

### Database Schema Extension (Migration 008):
- `call_sessions` extended with:
  - `channel`: `'whatsapp' | 'webrtc' | 'phone'`
  - `direction`: `'inbound' | 'outbound'`
  - `lifecycle_status`: `'initiated' | 'ringing' | 'connecting' | 'active' | 'ended' | 'failed' | 'rejected' | 'cancelled'`
  - `meta_call_id`: Unique upstream Meta WhatsApp call identifier.
  - `caller_wa_id`: Policyholder WhatsApp phone number.
  - `termination_reason`: Standardized call completion reason.
  - `summary`: Operational summary and extracted outcomes.
- `whatsapp_connections` extended with `meta_phone_number_id`, `calling_enabled`, `inbound_calling_enabled`, `outbound_calling_enabled`, `calling_hours`, `display_name`.
- `whatsapp_call_events`: Idempotent audit trail table with tenant RLS isolation.

---

## 11. Canonical Environment Variables

| Variable | Scope | Description |
|---|---|---|
| `DATABASE_URL` | Server | PostgreSQL connection string with pgvector support |
| `CLERK_SECRET_KEY` | Server | Clerk backend authentication secret key |
| `VITE_CLERK_PUBLISHABLE_KEY` | Client | Clerk frontend publishable key |
| `LIVEKIT_URL` | Server/Agent | LiveKit Cloud project URL (`wss://<project>.livekit.cloud`) |
| `LIVEKIT_API_KEY` | Server/Agent | LiveKit server API key |
| `LIVEKIT_API_SECRET` | Server/Agent | LiveKit server API secret |
| `LIVEKIT_WHATSAPP_AGENT_NAME` | Server | Worker agent dispatched for WhatsApp calls (default: `insurcall-voice-agent`) |
| `WHATSAPP_CLOUD_API_VERSION` | Server | Meta WhatsApp Graph API version (default: `26.0`) |
| `WHATSAPP_BUSINESS_PHONE_NUMBER_ID` | Server | 15-digit Meta Phone Number ID |
| `WHATSAPP_ACCESS_TOKEN` | Server | System User Access Token with messaging & calling permissions |
| `META_APP_SECRET` | Server | Meta App Secret for HMAC-SHA256 signature verification |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Server | Verification token for Meta GET handshake |
| `WHATSAPP_CALLING_ENABLED` | Server | Master emergency kill switch (default: `false`) |
| `WHATSAPP_INBOUND_CALLS_ENABLED` | Server | Inbound customer call reception (default: `false`) |
| `WHATSAPP_OUTBOUND_CALLS_ENABLED` | Server | Outbound staff dialing (default: `false`) |
| `WHATSAPP_CALL_TEST_MODE` | Server | Enforces recipient allowlist in test mode (default: `true`) |
| `WHATSAPP_ALLOWED_TEST_RECIPIENTS` | Server | Comma-separated allowlist of test phone numbers |
| `WHATSAPP_DESTINATION_COUNTRY` | Server | ISO 3166-1 alpha-2 destination country (default: `IN`) |
| `PUBLIC_API_BASE_URL` | Server | Public HTTPS domain for Meta webhooks |

---

## 12. Startup, Build & Verification Commands

```bash
# 1. Start Web Application (TanStack Start / Vite)
npm run dev

# 2. Start Python Voice Agent Worker
python agent/agent.py dev

# 3. Type-Check and Verify Correctness (0 errors)
npx tsc --noEmit

# 4. Production Build (Client + Server SSR)
npm run build

# 5. Execute WhatsApp Calling Test Suite (100% pass)
node scripts/test-livekit-whatsapp-calling.mjs

# 6. Execute End-to-End Regression Suite (100% pass)
npx tsx scripts/test-end-to-end-verification.mjs

# 7. Execute Strict Light Mode Audit (100% pass)
node scripts/test-light-mode-audit.mjs
```

