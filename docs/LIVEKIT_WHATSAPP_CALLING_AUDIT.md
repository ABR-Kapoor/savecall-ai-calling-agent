# InsurCall LiveKit Cloud x WhatsApp Business Calling Architecture Audit

## 1. Executive Summary
This document establishes the verified baseline of InsurCall's existing architecture, calling infrastructure, voice-agent pipeline, WhatsApp gateways, and the target integration for two-way WhatsApp Business voice calling using official LiveKit Cloud Connectors and Meta WhatsApp Cloud API.

No destructive Git actions or database resets were executed. All audits reflect the active repository state.

---

## 2. Existing Architecture & Technology Stack

| Layer | Component | Version / Library | Status |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React 19 + TanStack Router + Vite | React 19.2.0, TanStack Router 1.170.18, Vite 8.1.5 | Active & Verified |
| **Styling & Design** | Tailwind CSS 4 + Lucide Icons | Strictly Light Mode, Curated Slate/Blue Theme | Compliant (Zero dark mode) |
| **Backend Framework** | TanStack Start + Nitro server handlers | TanStack Start 1.168.32, Nitro 3.0.260603-beta | Active & Verified |
| **Database** | PostgreSQL on InsForge | @insforge/sdk 1.5.2, pg 8.23.0 | 7 Active Migrations, Live DB verified |
| **Authentication** | Clerk (JWT + Organization Membership) | @clerk/clerk-react 5.0.0, @clerk/backend 1.24.0 | Multi-tenant isolation active |
| **LiveKit Server SDK** | Node.js Server SDK | livekit-server-sdk 2.9.7 | Verified: ConnectorClient built-in |
| **LiveKit Client SDK** | WebRTC In-browser Audio | livekit-client 2.9.2, @livekit/components-react 2.6.13 | Active on /voice and demo |
| **Voice Agent Runtime** | Python LiveKit Agents | livekit-agents >=0.8.0, livekit-plugins-silero | agent/agent.py with sub-30ms Silero VAD |
| **AI LLM Inference** | Groq Cloud + Local Ollama Fallback | openai/gpt-oss-120b (Groq), qwen2.5:7b (Local) | Hybrid routing with RAG tools |
| **WhatsApp Gateways** | Multi-Gateway Strategy | OpenWA/Baileys (Web session) + Meta Cloud API | Baileys multi-device sync + Meta Cloud |

---

## 3. LiveKit WhatsApp Connector Capabilities Verification

Inspection of `node_modules/livekit-server-sdk/dist/ConnectorClient.d.ts` confirms native support for official WhatsApp calling APIs in the installed SDK version (`2.9.7`):

1. **`dialWhatsAppCall(options: DialWhatsAppCallOptions): Promise<DialWhatsAppCallResponse>`**
   - Initiates outbound WhatsApp call via Meta Cloud API.
   - Parameters: `whatsappPhoneNumberId`, `whatsappToPhoneNumber`, `whatsappApiKey`, `whatsappCloudApiVersion`, `roomName`, `agents`, `participantIdentity`, `participantMetadata`, `destinationCountry`, `ringingTimeout`.
2. **`acceptWhatsAppCall(options: AcceptWhatsAppCallOptions): Promise<AcceptWhatsAppCallResponse>`**
   - Connects an incoming call from Meta into a LiveKit Cloud room.
   - Parameters: `whatsappPhoneNumberId`, `whatsappApiKey`, `whatsappCloudApiVersion`, `whatsappCallId`, `sdp`, `roomName`, `agents`, `participantIdentity`, `participantMetadata`, `waitUntilAnswered`.
3. **`connectWhatsAppCall(whatsappCallId: string, sdp: SessionDescription): Promise<ConnectWhatsAppCallResponse>`**
   - Connects established WhatsApp call using the SDP answer from Meta.
4. **`disconnectWhatsAppCall(whatsappCallId: string, whatsappApiKey: string, disconnectReason?: DisconnectReason): Promise<DisconnectWhatsAppCallResponse>`**
   - Disconnects active WhatsApp call with clean resource release.

---

## 4. Voice Agent Audio & RAG Pipeline Audit

The existing voice agent (`agent/agent.py`) connects to LiveKit rooms using `WorkerOptions` and listens for customer participants:
1. **Participant Metadata**:
   - Reads `participant.metadata` JSON containing `voice_session_id`, `tenant_id`, `customer_id`, `customer_name`, `customer_number`.
2. **Dynamic Configuration Tool**:
   - Calls remote tool `get_agent_config` via HTTP POST to `/api/agent/tools` to load the tenant's approved knowledge base, system prompt, and custom greeting template.
3. **Insurance Function Tools**:
   - `get_policy`: Policy details, coverage, and premium due dates.
   - `get_claim_status`: Claim progress, filed date, and settlement amounts.
   - `search_policy_docs`: Semantic retrieval from tenant-isolated policy documents.
   - `send_otp` / `verify_otp`: 2-Factor authentication before sensitive operations.
   - `update_contact_details`, `change_nominee`, `cancel_policy`: Policyholder servicing with audit trails.
   - `request_human_escalation`: Escalates call to senior claims officer.
4. **Real-Time Audio Handling**:
   - Silero VAD allows full-duplex conversational audio with sub-30ms barge-in and interruption handling.
   - Edge-TTS / Piper provides human-grade speech synthesis.

**Integration Strategy for WhatsApp Calls**:
When LiveKit's `ConnectorClient` accepts or dials a WhatsApp call, it joins the caller as a participant into a dedicated LiveKit room. By passing `participantMetadata` containing the tenant and customer context, the existing `agent/agent.py` automatically binds to the caller, provides personalized greeting, and executes grounded insurance RAG without modifying the core speech pipeline.

---

## 5. WhatsApp Integration Status & Gaps

### Current Status:
- Text conversations, multi-device history sync, and inbound messaging are operational via `real-baileys-service.mjs` and `/api/webhooks/whatsapp`.
- `src/lib/whatsapp/meta-cloud-adapter.ts` provides Graph API v21.0 primitives for text messaging and signature verification.
- Outbound safety guard (`src/lib/whatsapp/outbound-guard.server.ts`) protects real phone numbers with explicit test allowlists.

### Identified Gaps to Close:
1. **Missing Meta WhatsApp Calling Webhook Handler**:
   - A dedicated public webhook route `/api/webhooks/meta-whatsapp` is required to handle Meta's GET verification handshake and POST call events (`calls` with SDP offer/answer and call termination).
2. **Missing LiveKit WhatsApp Connector Service**:
   - Need a server module (`src/lib/voice/livekit-whatsapp.server.ts`) managing `ConnectorClient` operations, validation, error handling, and session state.
3. **Database Schema Extension**:
   - `call_sessions` currently tracks WebRTC calls. Must be extended with `channel: 'whatsapp'`, `meta_call_id`, `caller_wa_id`, `direction`, and granular `lifecycle_status`.
   - Need `whatsapp_call_events` table for idempotent webhook processing.
4. **Obsolete Carrier-Forwarding UI**:
   - `/phone` currently displays carrier forwarding dial codes (`*21*`) and SIM setup. Must be replaced with the WhatsApp Business Calling management dashboard.
5. **Calls Workspace Enhancements**:
   - `/calls` must display WhatsApp voice sessions with channel badges, caller identity, and manual outbound calling controls.

---

## 6. Action Plan
1. Update `.env.example` and `.env` with canonical keys (safe placeholders only).
2. Create and run migration `008_whatsapp_cloud_calling.sql`.
3. Implement `src/lib/voice/livekit-whatsapp.server.ts`.
4. Implement `src/routes/api/webhooks/meta-whatsapp.ts`.
5. Implement server functions in `src/lib/whatsapp-calling.functions.ts`.
6. Update `/phone` page to WhatsApp Business Calling management.
7. Update `/calls` workspace with WhatsApp call support.
8. Update Settings -> Channels with WhatsApp Calling controls.
9. Execute automated test suite with mocked LiveKit/Meta providers.
10. Finalize setup documentation in `docs/LIVEKIT_WHATSAPP_CALLING_SETUP.md`.
