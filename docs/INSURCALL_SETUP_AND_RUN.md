# InsurCall Setup and Run Guide: Production Backend & WhatsApp Gateway

This document provides complete, reproducible instructions for launching InsurCall with the real Baileys Multi-Device WhatsApp gateway, running database migrations, executing automated verification suites, and operating the application in a local or staging environment.

---

## 1. Upstream Pinned Specification

InsurCall integrates upstream **OpenWA / Baileys Multi-Device** as an isolated provider adapter for WhatsApp account linking, QR pairing, history synchronization, and bi-directional customer messaging.

- **Upstream Repository**: `https://github.com/rmyndharis/OpenWA`
- **Pinned Release**: `v0.25.0`
- **Pinned Commit Object**: `a32cfbadd8543d57606a598711f8590ccf748640`
- **Default Gateway Port**: `2785`
- **Engine Protocol**: Baileys Multi-Device direct socket (`@whiskeysockets/baileys`)
- **History Sync Configuration**: `syncFullHistory: true`

> **Important Risk Notice**: OpenWA is an unofficial WhatsApp gateway. It must only be used with dedicated sandbox/test numbers for prototypes and pilots. It is never guaranteed against account action by Meta and must not be used for paying regulated insurance production customers without a separate compliance determination.

---

## 2. Environment Configuration

Copy `.env.example` to `.env` if `.env` does not already exist:

```bash
cp .env.example .env
```

Ensure the following variables are configured in `.env`:

```env
# PostgreSQL Database (Direct connection for InsurCall migrations and backend functions)
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?sslmode=require

# Clerk Authentication (Multi-tenant identity)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# OpenWA / Baileys WhatsApp Gateway (Port 2785)
OPENWA_BASE_URL=http://127.0.0.1:2785
OPENWA_API_KEY=insurcall_openwa_admin_secret_2026
WHATSAPP_WEBHOOK_SECRET=ad80b78a70e1bdb54d24d90a63907b3cef4610b782e090a2
APP_BASE_URL=https://localhost:5173

# Groq Cloud LLM (Voice & Message Auto-Reply Grounding)
GROQ_API_KEY=gsk_...
GROQ_BASE_URL=https://api.groq.com/openai/v1
```

---

## 3. Database Migrations

The WhatsApp and telephony integrations require migrations `005`, `006`, and `007`, plus the `is_demo` isolation flag:

```bash
# 1. Apply Phone Numbers and Carrier Telephony schema
node scripts/apply-migration-005.mjs

# 2. Apply WhatsApp Connections, Conversations, and Messages schema
node scripts/apply-migration-006.mjs

# 3. Apply WhatsApp Integrity Compound Indexes and Uniqueness constraints
node scripts/apply-migration-007.mjs

# 4. Migrate demo flag and reload PostgREST schema cache
node scratch/migrate-whatsapp-demo-flag.mjs
node scripts/reload-schema.mjs
```

---

## 4. Starting the Services

### 4.1 Running the Real Baileys Multi-Device Service (Port 2785)

Start the Baileys WhatsApp Multi-Device gateway directly on port 2785 with persistent session handling:

```bash
node --env-file=.env scripts/real-baileys-service.mjs
```

Features enabled:
- `syncFullHistory: true`: Ingests real past conversations and contacts from the paired device.
- Full event pipeline: `messaging-history.set`, `chats.upsert`, `contacts.upsert`, `messages.upsert`, `messages.update`.
- Auto-restores existing authenticated sessions from `data/sessions/` on startup.
- Persistent webhook registration (`data/sessions/:id/webhook.json`).
- Live diagnostics endpoint at `GET /api/sessions/:id/diagnostics`.

### 4.2 Starting the InsurCall Application (Port 5173)

Start the InsurCall development server (Vite + TanStack Start):

```bash
npm run dev
```

The application will bind to:
- **Local Application URL**: `https://localhost:5173` (or `https://127.0.0.1:5173`)
- **Overview**: `https://localhost:5173/dashboard`
- **WhatsApp Inbox**: `https://localhost:5173/whatsapp`
- **AI Agent Studio**: `https://localhost:5173/agent`
- **Knowledge & Training**: `https://localhost:5173/train`
- **Approvals & Handoffs**: `https://localhost:5173/change-requests`
- **Insurance Records**: `https://localhost:5173/policies`

---

## 5. Automated Verification Suites

The repository contains automated verification suites ensuring security, gateway contracts, deduplication, tenant isolation, and strict light mode UI.

### 1. Baileys Sync Pipeline & Idempotency Suite (8 Checks)

Validates history synchronization ingestion, message deduplication, unknown contact phone formatting (no fake names), tenant isolation, demo exclusion from live inbox queries, and message delivery status updates:

```bash
node --env-file=.env scratch/test-baileys-sync-pipeline.mjs
```
*Expected Outcome*: **8/8 checks passed (All tests passed successfully)**.

### 2. WhatsApp OpenWA Integration Suite (32 Assertions)

Validates OpenWA adapter lifecycle, QR code generation, webhook HMAC-SHA256 signature verification, message deduplication, loop prevention (`fromMe: true`), database multi-tenant isolation, staff human takeover, and WhatsApp voice calling limitations:

```bash
npx tsx scripts/test-whatsapp-openwa-integration.mjs
```
*Expected Outcome*: **32/32 assertions passed**.

### 3. Strict Light Mode UI Audit (9 Checks)

Audits all CSS tokens, components, and routes to ensure zero `.dark` selectors, zero `dark:` utility classes, and complete light mode compliance across customer-facing surfaces:

```bash
node scripts/test-light-mode-audit.mjs
```
*Expected Outcome*: **9/9 checks verified (91 files scanned, 0 dark classes found)**.

### 4. Phone Telephony & Multi-Tenant Onboarding Suite (21 Tests)

Validates Indian carrier MMI code generation (Airtel, Jio, Vi, BSNL), phone number state machine, webhook DID routing, and audit logs:

```bash
node scripts/test-phone-onboarding-telephony.mjs
```
*Expected Outcome*: **21/21 tests passed**.

### 5. Bounded History Sync & Resilience Suite (5 Tests)

Validates multi-batch bounded synchronization (200 msgs/batch), idempotent duplicate delivery prevention, timeout recovery, partial failures, and tenant isolation:

```bash
node --env-file=.env scratch/test-bounded-history-sync.mjs
```
*Expected Outcome*: **5/5 tests passed**.

### 6. Outbound Message Safety Guard

By default, outbound WhatsApp messaging over the linked socket is blocked to protect user privacy and prevent unintended messages:
- `ALLOW_OUTBOUND_WHATSAPP`: Must be set to `"true"` in environment to allow the gateway to transmit messages over the WhatsApp socket.
- `ENABLE_WHATSAPP_AI_AUTOREPLY`: Must be set to `"true"` to enable automated AI responses.
- `whatsapp_connections.auto_reply_enabled`: Database flag must be enabled per connection.

### 7. Static TypeScript Check

Ensures zero type errors and strict type safety without `any` or `@ts-ignore`:

```bash
npx tsc --noEmit
```
*Expected Outcome*: **Exit code 0 (0 errors)**.

### 8. Production Build

Builds both the SSR server bundle and client assets:

```bash
npm run build
```
*Expected Outcome*: **Exit code 0**.

---

## 6. End-to-End Customer Flow Walkthrough

1. **Sign In**: Navigate to `https://localhost:5173/` and sign in with authorized tenant credentials via Clerk.
2. **Access WhatsApp**: Click **WhatsApp Assistant** in the sidebar navigation or browse to `https://localhost:5173/whatsapp`.
3. **Inspect Real-Time Connection Diagnostic Panel**: View socket state, authenticated phone number, account name, history sync count, and webhook health under the WhatsApp Connection tab.
4. **Scan QR Code (First Time Setup)**: If not already authenticated, click **Connect WhatsApp Number**. Scan the QR code using WhatsApp > Linked Devices on a dedicated test phone.
5. **Live Inbox Ingestion**: As WhatsApp Multi-Device completes history sync, actual chats and contacts appear in the unified inbox. No fake contacts are displayed.
6. **Developer Simulation Sandbox**: To test specific underwriting scenarios without messaging real policyholders, open the **Developer Simulation Sandbox** modal. Simulated fixtures are tagged `is_demo: true` and remain excluded from the live inbox unless explicitly toggled on for inspection.
