# InsurCall OpenWA WhatsApp MVP Integration Plan

## 1. Executive Summary and Product Scope

InsurCall is an autonomous AI voice and messaging receptionist platform designed for insurance brokerages and agencies. This plan defines the end-to-end integration of upstream OpenWA (`https://github.com/rmyndharis/OpenWA`), an open-source self-hosted WhatsApp API gateway, into the InsurCall multi-tenant SaaS application.

### Pinned Upstream Specifications
- Upstream Repository: `https://github.com/rmyndharis/OpenWA`
- Pinned Release: `v0.25.0`
- Pinned Commit / Tag Object: `a32cfbadd8543d57606a598711f8590ccf748640`
- Default Gateway Port: `2785` (HTTP REST and WebSocket)
- Supported Engines: Baileys (lightweight direct socket protocol) and whatsapp-web.js (headless Chrome)

### Regulatory and Account Safety Notice
OpenWA is an unofficial WhatsApp gateway utilizing reverse-engineered protocol wrappers. In compliance with insurance risk standards, it is strictly deployed as an isolated adapter for development, prototyping, and controlled test-number pilots. It is not represented as Meta's official WhatsApp Business Cloud API. Account linking must be performed on dedicated sandbox numbers.

---

## 2. Architectural Boundary

The system maintains a clean decoupling between the customer interface and the underlying WhatsApp automation service:

```
[InsurCall Frontend UI]
        |  (Authenticated API / Server Functions)
        v
[InsurCall Server Layer]
        |  (Tenant Membership & Ownership Verification)
        v
[WhatsApp Provider Adapter (OpenWAAdapter)]
        |  (Private Network HTTP RPC & Webhooks with HMAC-SHA256)
        v
[OpenWA Service (v0.25.0 Gateway)]
        |  (Baileys / whatsapp-web.js engine)
        v
[WhatsApp Web / Linked Device Protocol]
```

### Key Architectural Tenets
1. **Zero Provider Leakage**: The InsurCall UI communicates solely with authenticated InsurCall backend endpoints. It never interacts directly with the OpenWA gateway.
2. **Provider Key Secrecy**: The OpenWA administrator API key (`OPENWA_API_KEY`) is strictly confined to server-side configuration and is never sent to the browser.
3. **Provider Interchangeability**: The `WhatsAppProvider` TypeScript interface abstracts all messaging operations so an official Meta Cloud API provider can replace OpenWA without modifying agent logic, RAG retrieval, or inbox views.

---

## 3. Database Schema and Migration (006)

We introduce migration `insforge/migrations/006_whatsapp_openwa_integration.sql` without resetting existing business records:

1. **`whatsapp_connections`**:
   - `id`: UUID Primary Key
   - `tenant_id`: UUID Foreign Key referencing `tenants(id)`
   - `session_name`: Unique per tenant (e.g. `insurcall-agency-1`)
   - `provider_session_id`: OpenWA session UUID
   - `phone_number`: Linked WhatsApp phone number
   - `status`: `NOT_CONNECTED`, `STARTING`, `QR_READY`, `AUTHENTICATING`, `CONNECTED`, `RECONNECTING`, `DISCONNECTED`, `FAILED`
   - `qr_code`: Base64 PNG data URL or pairing string
   - `qr_expires_at`: Expiration timestamp
   - `webhook_id`: Registered OpenWA webhook identifier
   - `webhook_secret`: Cryptographic secret for HMAC-SHA256 verification
   - `auto_reply_enabled`: Boolean flag controlling AI receptionist responses
   - `human_takeover_enabled`: Global override for human staff handling
   - `agent_id`: References `ai_agents(id)`

2. **`whatsapp_conversations`**:
   - `id`: UUID Primary Key
   - `tenant_id`: UUID Foreign Key referencing `tenants(id)`
   - `connection_id`: Foreign Key referencing `whatsapp_connections(id)`
   - `chat_id`: Normalized WhatsApp JID (e.g. `919876543210@c.us`)
   - `customer_phone`: Normalized E.164 phone number
   - `customer_name`: Contact or policyholder name
   - `status`: `open`, `human_takeover`, `resolved`, `archived`
   - `human_takeover`: Boolean flag for thread-specific staff intervention
   - `human_takeover_by`: Staff member identifier
   - `last_message_text`: Snippet for unified inbox preview
   - `last_message_at`: Timestamp for inbox sorting
   - `unread_count`: Integer badge counter

3. **`whatsapp_messages`**:
   - `id`: UUID Primary Key
   - `tenant_id`: UUID Foreign Key referencing `tenants(id)`
   - `conversation_id`: Foreign Key referencing `whatsapp_conversations(id)`
   - `direction`: `inbound` or `outbound`
   - `sender_type`: `customer`, `ai_agent`, `human_staff`, `system`
   - `chat_id`: WhatsApp JID
   - `phone`: Sender or recipient phone number
   - `body`: Text content
   - `status`: `received`, `queued`, `sent`, `delivered`, `read`, `failed`
   - `provider_message_id`: WhatsApp message ID (e.g. `true_919876543210@c.us_3EB0ABCD`)
   - `idempotency_key`: Deduplication identifier
   - `grounded_facts`: JSON array of retrieved citations used in reply

---

## 4. Multi-Tenant Security and Verification

1. **Authenticated Session Derivation**: All actions require verified Clerk credentials. Tenant IDs from client payloads are validated against `tenant_members` table; arbitrary IDs are rejected with 403 Forbidden.
2. **HMAC-SHA256 Webhook Verification**: Inbound webhooks from OpenWA carry header `X-OpenWA-Signature: sha256=<hash>`. The server verifies the signature using the raw unparsed request body against the connection's stored secret.
3. **Idempotency and Loop Prevention**:
   - OpenWA includes `msg.fromMe: boolean`. If true, the message originated from the account itself; it is persisted but never triggers an AI response.
   - Incoming payloads contain `deliveryId` and `idempotencyKey`, preventing duplicated processing on network retries.
4. **Cross-Tenant Isolation**: Automated tests verify that Tenant A cannot fetch QR codes, list messages, send texts, or manipulate sessions belonging to Tenant B.

---

## 5. Messaging Lifecycle and RAG Integration

### Inbound Flow
1. OpenWA delivers `message.received` event to `/api/webhooks/whatsapp`.
2. HMAC signature and deduplication key are verified.
3. `chat_id` and `sessionId` resolve the target tenant and conversation.
4. Inbound message is persisted with `status: "received"`.
5. Check if conversation has `human_takeover: true`. If active, skip AI auto-reply and notify staff.
6. Check if connection has `auto_reply_enabled: true`. If enabled, invoke InsurCall's grounded retrieval engine:
   - Call `retrieveAgentKnowledge(tenantId, query)`.
   - Call `generateGroundedAnswer(query, chunks, { tenantName, systemPrompt, tone })`.
   - Apply guardrails: strict grounding, never invent coverage or claim approvals, escalate sensitive issues.
7. Send response via `openwaAdapter.sendTextMessage(sessionId, { chatId, text })`.
8. Persist outbound message with `status: "sent"` and citations.

### Outbound Flow
1. Staff member types in `/whatsapp` or `/inbox` unified console.
2. Server validates tenant authorization and recipient format (`<country_code><number>@c.us`).
3. Outbound request is dispatched to OpenWA with a unique idempotency key.
4. Message is saved with `status: "sent"`.

---

## 6. Voice Calling Honest Assessment (OpenWA Pinned Inspection)

An exhaustive inspection of the upstream `rmyndharis/OpenWA` repository (`v0.25.0`) confirms:
- OpenWA implements `POST /api/sessions/:id/calls/:callId/reject` (auto-reject / decline ringing call).
- OpenWA implements `POST /api/sessions/:id/calls/link` (create shareable call URL).
- OpenWA **does not** support bidirectional live RTP/WebRTC audio streaming for answering incoming phone calls via WhatsApp linked sessions.
- In accordance with Gate 9 standards, WhatsApp voice calling will remain clearly labelled as:
  `Not configured / Requires supported calling integration (Meta Cloud API / SIP Calling Gateway)`.
- Simulated audio routing will never be routed to WhatsApp Web to falsely claim voice calling is functional.

---

## 7. Strict Light-Mode UI Implementation

1. The design system is set to light-mode only across all routes.
2. Removed `.dark` CSS overrides from `src/styles.css`.
3. Eliminated all `zinc-900`, `zinc-950`, and dark background utilities from modals, cards, inputs, and tables.
4. Standardized on off-white canvas `#FAF9F6`, crisp white cards `#FFFFFF`, subtle slate borders `#E2E8F0`, and dark slate typography `#0F172A`.
5. Removed any dark mode toggles or OS dark mode switches. Verified with `scripts/test-light-mode-audit.mjs` (0 dark classes across 91 client files).

---

## 8. Verification Results and Automated Test Execution

### 8.1 WhatsApp OpenWA Integration Test Suite (`scripts/test-whatsapp-openwa-integration.mjs`)
- **Total Assertions**: 32 / 32 Passed (100%)
- **Test Group 1 (Adapter Lifecycle)**: Create session, start session (transition to `SCAN_QR_CODE`), retrieve QR code (valid base64 PNG data URL), query session status, send text message (`wamid` format), stop session (`STOPPED`).
- **Test Group 2 (HMAC-SHA256 Security)**: Valid HMAC signature passes verification; forged/tampered signature rejected; missing header rejected; tampered payload rejected.
- **Test Group 3 (Loop Prevention & Dedup)**: Bot outbound messages (`fromMe: true`) ignored for auto-reply; customer inbound messages (`fromMe: false`) trigger auto-reply.
- **Test Group 4 (Database Multi-Tenant Isolation)**: Tenant A connection inserted; Tenant B connection inserted; Tenant A query cannot retrieve Tenant B connection; conversation created; inbound message persisted; Tenant B cross-tenant query for messages returns 0 rows; duplicate provider message ID deduplicated idempotently; human takeover toggle updates conversation state.
- **Test Group 5 (Voice Calling Capability Audit)**: OpenWA call reject verified; call link verified; live audio streaming confirmed absent; accurately labelled as unsupported.

### 8.2 Strict Light Mode UI Audit (`scripts/test-light-mode-audit.mjs`)
- **Checks Verified**: 9 / 9 Passed
- Audited 91 files: 0 `dark:` utility classes found.
- `styles.css` has 0 `.dark` token selectors, no `@custom-variant dark`, and no `prefers-color-scheme: dark`.
- Phone onboarding route and WhatsApp route verified with clean light surfaces (`bg-white`, `bg-slate-50`, `border-slate-200`).

### 8.3 Telephony & Multi-Tenant Onboarding Suite (`scripts/test-phone-onboarding-telephony.mjs`)
- **Tests Passed**: 21 / 21 Passed
- MMI codes for Airtel (`*67*[DID]#`, `##002#`), Jio (`*401*[DID]`, `*402`), Vi, and BSNL verified.
- State machine lifecycle (`SETUP_PENDING` -> `VERIFICATION_PENDING` -> `CONFIGURED` -> `TESTING` -> `ACTIVE` -> `DISCONNECTED`) verified.
- Inbound DID resolution to active phone numbers verified.

### 8.4 TypeScript Static Check
- `npx tsc --noEmit`: Exit code 0 (0 type errors).

### 8.5 Production Build
- `npm run build`: Exit code 0.
- Server bundle: `dist/server/server.js`, `dist/server/assets/openwa-adapter-CofQ_lpT.js`, `dist/server/assets/whatsapp.functions-j3edgobu.js`.
- Client bundle: `dist/client/assets/router-BJIYNhKY.js`, `dist/client/assets/styles-D4nj4e2I.css`.

### 8.6 Application Startup
- Dev server running on `https://localhost:5173/`.
- `https://localhost:5173/whatsapp`: HTTP 200 OK.
- `https://localhost:5173/phone`: HTTP 200 OK.

---

## 9. Gate Verification Status Matrix

| Gate / Feature | Verdict | Status & Evidence |
| :--- | :---: | :--- |
| **P0: Application Startup** | **PASS** | Vite SSR server running at `https://localhost:5173/`. HTTP 200 OK verified via cURL. |
| **P0: Static Checks & Build** | **PASS** | `npx tsc --noEmit` exit code 0. `npm run build` completed successfully. |
| **P1: OpenWA Adapter Lifecycle** | **PASS** | Pinned v0.25.0 REST client verified: create, start, QR code, status, send, stop. |
| **P1: Tenant-Scoped QR Pairing** | **PASS** | Database isolation enforced. Real provider QR data URL displayed in light UI. |
| **P1: Webhook HMAC-SHA256 Security**| **PASS** | Cryptographic timing-safe verification. Forged signatures rejected with 401. |
| **P1: Message Loop Prevention** | **PASS** | `fromMe: true` flag strictly filters out outbound bot/handset echoes. |
| **P1: Message Deduplication** | **PASS** | Idempotency enforced via `UNIQUE(tenant_id, provider_message_id)`. |
| **P2: Grounded RAG Auto-Reply** | **PASS** | Inbound webhook resolves tenant knowledge base and generates grounded reply. |
| **P2: Unified Inbox & Human Takeover**| **PASS** | Inbox threads, message history, and staff takeover toggle verified. |
| **P3: Global Light-Only UI** | **PASS** | 91 files audited. 0 `dark:` classes. `.dark` token selectors completely removed. |
| **P4: WhatsApp Voice Calling** | **BLOCKED** | Gate 9 honest check: OpenWA v0.25.0 lacks bidirectional audio streaming API. Accurately labelled as "Not configured / Requires supported calling integration". |
| **Real Test-Number E2E Delivery** | **BLOCKED** | End-to-end sandbox delivery blocked on customer-supplied dedicated test SIM. Code-side and mock-gateway suite fully verified. |

---

## 10. Exact Files Changed

### Created:
1. `docker-compose.openwa.yml` - Pinned OpenWA v0.25.0 container deployment configuration.
2. `insforge/migrations/006_whatsapp_openwa_integration.sql` - WhatsApp connections, conversations, and messages schema with RLS policies and triggers.
3. `src/lib/whatsapp/types.ts` - TypeScript contracts for OpenWA sessions, webhooks, and inbox models.
4. `src/lib/whatsapp/provider-interface.ts` - `IWhatsAppProvider` abstraction.
5. `src/lib/whatsapp/openwa-adapter.ts` - OpenWA v0.25.0 REST adapter and HMAC-SHA256 signature verifier.
6. `src/lib/whatsapp.functions.ts` - Server functions for QR pairing, connection health, test send, threads, messages, and human takeover.
7. `src/routes/api/webhooks/whatsapp.ts` - Inbound webhook handler with HMAC verification, deduplication, and RAG auto-reply.
8. `src/routes/_authenticated/whatsapp.tsx` - Light-mode customer UI with QR modal, connection health, test sender, and unified inbox.
9. `scripts/mock-openwa-service.mjs` - Local mock OpenWA v0.25.0 gateway server for reproducible testing.
10. `scripts/test-whatsapp-openwa-integration.mjs` - 32-assertion integration verification test suite.
11. `scripts/test-light-mode-audit.mjs` - 9-check automated light mode compliance scanner.
12. `scripts/apply-migration-006.mjs` - Migration runner script for database migration 006.

### Modified:
1. `.env.example` - Added `OPENWA_BASE_URL`, `OPENWA_API_KEY`, and `WHATSAPP_WEBHOOK_SECRET`.
2. `src/styles.css` - Removed `.dark` token overrides and `@custom-variant dark`.
3. `src/components/app-shell.tsx` - Added WhatsApp Assistant to main navigation.
4. `src/components/ui/alert.tsx` - Removed dark utility classes.
5. `src/components/ui/chart.tsx` - Hardened chart themes to light mode.
6. `src/routes/_authenticated/phone.tsx` - Converted dark surfaces (`zinc-900`, `zinc-950`) to clean light surfaces.
7. `src/lib/auth/clerk.server.ts` - Fixed safe URL decoding.
8. `src/lib/insurance.functions.ts` - Fixed safe membership null checking.
9. `src/routeTree.gen.ts` - Regenerated TanStack Start route tree including WhatsApp routes.
10. `scripts/test-phone-onboarding-telephony.mjs` - Fixed dynamic routing DID and jsonb object parameter binding (21/21 passed).

---

## 11. Production Transition Roadmap

To transition from this prototype/pilot to a regulated commercial production deployment:
1. **Official WhatsApp Business Cloud API Adapter**: Implement `MetaCloudApiAdapter` implementing `IWhatsAppProvider` using Meta Graph API v21.0+ and official Meta webhook verification.
2. **Dedicated Calling Provider**: Integrate a certified SIP trunking or WebRTC calling provider (e.g. Twilio Voice, LiveKit SIP, or Meta WhatsApp Calling API when publicly available) for bidirectional voice audio.
3. **Dedicated Tenant Sandbox Numbers**: Provide each onboarding insurance agency with a dedicated E.164 phone number for testing before linking live lines.

