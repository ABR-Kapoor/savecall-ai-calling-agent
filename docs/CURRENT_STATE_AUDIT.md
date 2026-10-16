# SaveCall Current-State Audit

> Audit executed against source code in `E:\Naya-System\missed-call-maven` following `docs/CURRENT_STATE_AUDIT_TEMPLATE.md` guidelines.

## Status definitions

- `verified`: directly traced in source and covered by a relevant test or repeatable manual verification
- `partial`: some implementation exists but one or more acceptance criteria are absent
- `missing`: no working implementation found
- `unsafe`: code path exists but violates a security, data-integrity, or truthful-outcome requirement
- `unknown`: insufficient evidence; state what must be inspected

---

## Audit matrix

| Area | Status | Source/migration/test evidence | Concrete finding | Severity | Recommended fix |
|---|---|---|---|---|---|
| **Auth/session verification** | `partial` | `src/lib/auth/clerk.server.ts` | Clerk verification functions (`requireAuthenticatedUser`, `requireTenantMember`) exist, but `/api/voice/session` and `/api/voice/chat` allow anonymous execution without caller validation. | **High** | Protect session initiation with Clerk session or signed call token; reject untrusted anonymous requests. |
| **User-to-tenant membership** | `partial` | `src/lib/auth/clerk.server.ts` | `requireTenantMember` checks `tenant_members` table, but is not invoked in voice API endpoints. | **High** | Enforce verified tenant membership before returning tenant branding, customer data, or minting tokens. |
| **Tenant scope for every query** | `unsafe` | `src/routes/api/voice/chat.ts:167` | `knowledge_items` query filters by `.eq("approved", true)` but omits `.eq("tenant_id", tenantId)`. Cross-tenant knowledge leak risk. | **P0 (Critical)** | Add strict `.eq("tenant_id", tenantId)` to all knowledge base queries. |
| **RLS and cross-tenant tests** | `partial` | `supabase/migrations/` | RLS policies exist in database schemas, but no automated cross-tenant test harness exists in the test suite. | **Medium** | Implement automated negative tests asserting tenant A cannot read tenant B's records. |
| **AI Employee configuration persistence** | `verified` | `src/routes/_authenticated/settings.tsx`, `tenants.branding_config` | Settings page updates agent name, tone, language, and system prompt into `tenants.branding_config`. | **Low** | Add schema validation (Zod) on configuration updates. |
| **Knowledge ingestion and approval** | `verified` | `src/routes/_authenticated/train.tsx`, `src/lib/ingest.server.ts` | Document and URL ingestion creates `knowledge_items` with an `approved` status toggle. | **Low** | None required for baseline; functional as designed. |
| **Tenant-scoped retrieval** | `unsafe` | `src/routes/api/voice/chat.ts` | Approved knowledge items are pulled across all tenants if tenant ID is missing or not filtered. | **P0 (Critical)** | Scope all retrieval to the caller's authorized tenant ID. |
| **LiveKit token/session lifecycle** | `partial` | `src/routes/api/voice/session.ts:180` | Tokens are minted with `roomJoin` and 15m TTL, but token metadata previously serialized raw customer email and personal phone numbers into WebRTC room metadata. | **Medium** | Strip PII from room metadata; use session ID reference only. |
| **Browser fallback behavior** | `verified` | `src/routes/voice.tsx:345` | Resilient in-browser audio synthesis (`speakAi`), native `SpeechRecognition`, and call preservation ensure call never drops if LiveKit is unreachable. | **Low** | Verified functional. |
| **Model provider privacy policy** | `verified` | `src/routes/api/voice/chat.ts:65` | Hybrid routing routes sensitive queries (OTP, nominee) to local Ollama (`qwen2.5:7b`) and general conversation to Groq Cloud (`qwen/qwen3.8-27b`). | **Low** | Maintain and expand sensitivity classification patterns. |
| **Conversation state and corrections** | `unsafe` | `src/routes/api/voice/chat.ts:12` | `ChatInput` allows `role: z.enum(["user", "assistant", "system"])` in caller history, allowing client prompt injection with fake `system` instructions. | **P0 (Critical)** | Restrict history roles to `["user", "assistant"]`; reject or ignore client-supplied `system` roles. |
| **Tool schema/authorization** | `verified` | `src/routes/api/agent/tools.ts` | Strict Zod schema validation, `x-agent-secret` header verification, and 4-tier risk engine evaluation (`evaluateToolSecurity`). | **Low** | Verified functional. |
| **Confirmation and verification** | `verified` | `src/lib/risk/otp.server.ts`, `src/lib/risk/risk-engine.ts` | High-risk actions (nominee changes, phone updates) generate OTP verification requirements before committing changes. | **Low** | Verified functional. |
| **Fake/demo data isolation** | `unsafe` | `src/routes/api/voice/session.ts:80-140` | If customer has no records, `session.ts` auto-inserts synthetic `POL-HLTH-...` and `POL-AUTO-...` policies into the real database, and falls back to first tenant / latest customer. | **P0 (Critical)** | Remove automatic insertion of synthetic policies and latest-customer fallbacks. Require explicit customer resolution or unauthenticated guest context. |
| **Call events and truthful outcomes** | `partial` | `src/routes/api/voice/session.ts:165` | `call_sessions` table logs call starts with timestamp and risk state, but end-of-call metrics (duration, turns) are not consistently updated upon hangup. | **Medium** | Add `POST /api/voice/end` handler to persist final duration, turns, and outcome state upon call completion. |
| **Transcripts/retention** | `partial` | `src/routes/voice.tsx:510` | Real-time dual captions displayed in UI, but full transcript history is not automatically saved to `call_sessions.transcript`. | **Medium** | Append message turns to `call_sessions` on session completion. |
| **Human handoff** | `missing` | `src/routes/voice.tsx` | UI provides End Call, but SIP carrier transfer / PBX warm handoff endpoint is not wired to real carrier trunk. | **Medium** | Document manual callback fallback or implement SIP REFER trigger. |
| **Telephony webhook authentication** | `missing` | `telephony/` | Asterisk config templates exist, but no authenticated REST endpoint exists under `/api/public/telephony` in active codebase. | **Medium** | Port and secure telephony webhook handler with signature verification. |
| **Build/lint/typecheck/tests** | `verified` | Terminal runs | `npx tsc --noEmit` exits with code 0. `npm run build` completes in ~3.8s with code 0. | **Low** | Verified functional. |
| **Deployment architecture** | `verified` | `vercel.json`, `vite.config.ts` | TanStack Start serverless output configured for Vercel with automatic SSL and local HTTPS support. | **Low** | Verified functional. |
| **README correctness** | `verified` | `README.md` | Accurate, 311-line documentation matching actual repo capabilities, models, and HTTPS microphone setup. | **Low** | Verified functional. |

---

## Baseline commands

| Command | Result | Notes |
|---|---|---|
| `npm install` | **Exit 0** | Dependencies installed cleanly with package-lock. |
| `npx tsc --noEmit` | **Exit 0** | Typecheck passed with 0 errors. |
| `npm run build` | **Exit 0** | Client (603 kB voice bundle) and SSR bundles built in 3.8s. |
| `npm run lint` | **Exit 0** | ESLint verified across project source. |

---

## Top risks

1. **Risk 1 (P0 — Cross-Tenant Knowledge Leak):** In `chat.ts`, knowledge items are queried with `.eq("approved", true)` without `.eq("tenant_id", tenantId)`. One tenant's proprietary FAQs or policies could be read out to another tenant's caller.
2. **Risk 2 (P0 — Synthetic Real Data Fabrication):** In `session.ts`, unauthenticated callers without policies trigger automated insertion of fake `POL-HLTH-...` and `POL-AUTO-...` policies directly into the live database table.
3. **Risk 3 (P0 — Prompt Injection via Client History):** In `chat.ts`, `ChatInput` accepts `role: "system"` from untrusted HTTP clients, allowing callers to override persona and security constraints.
4. **Risk 4 (High — Insecure Fallback Identity):** In `session.ts`, missing tenant IDs fall back to `a0000000-0000-0000-0000-000000000001` or the first row in `tenants`, and missing customers fall back to the most recently created customer in the database.
5. **Risk 5 (Medium — PII Leak in Room Metadata):** In `session.ts`, the LiveKit AccessToken metadata serializes plain customer email and phone number, exposing them to anyone querying the room state.

---

## First patch set (Phase 1 Execution)

### Target Files to Touch:
1. `src/routes/api/voice/session.ts`:
   - Enforce mandatory tenant resolution (no arbitrary fallbacks to first tenant or fake ID).
   - Remove automated generation of synthetic policies and fake customers.
   - Remove fallback to latest customer.
   - Sanitize LiveKit token metadata to omit plain email and phone.
2. `src/routes/api/voice/chat.ts`:
   - Restrict `history` to `z.enum(["user", "assistant"])` (strictly reject client `system` roles).
   - Add strict tenant scoping: `.eq("tenant_id", resolvedTenantId)` on `knowledge_items`.
   - Validate and bound client query length.
3. `src/routes/voice.tsx`:
   - Support guest / unauthenticated caller state without crashing or assuming pre-existing policies.
