# InsurCall: Dual-Channel AI Voice & WhatsApp Operations Platform

InsurCall is an insurance-specific operations platform providing autonomous customer support and First Notice of Loss (FNOL) intake across two mandatory, coexisting channels: **conversational AI voice calling** (WebRTC / LiveKit) and **WhatsApp messaging** (Multi-Device Gateway).

Primary architecture, contracts, safety gates, and environment specs are documented in:
[INSURCALL_SOURCE_OF_TRUTH.md](docs/INSURCALL_SOURCE_OF_TRUTH.md).

---

## Key Capabilities

1. **Autonomous Conversational Voice Agent**:
   - WebRTC media streaming via self-hosted LiveKit (`bin/livekit/livekit-server.exe`) on port 7880.
   - Python conversational voice agent (`agent/agent.py`) with sub-30ms Silero VAD, interruption handling, Groq Cloud LLM, and Ollama fallback.
   - Live call room (`/voice`) and persistent session registry (`/calls`).

2. **WhatsApp Multi-Device Messaging**:
   - Multi-device WhatsApp messaging with OpenWA HTTP gateway and Baileys engine.
   - Unified inbox (`/whatsapp`), contact resolution, multi-device LID normalization, and thread state tracking.

3. **Outbound Safety Kill Switch & Recipient Protection**:
   - Independent server-side kill switch (`WHATSAPP_OUTBOUND_KILL_SWITCH`).
   - Fail-closed outbound behavior in development with explicit recipient allowlist (`WHATSAPP_TEST_ALLOWLIST`).
   - Loop prevention: rejects self-messages, outbound echoes, group auto-replies, and unmapped LIDs.

4. **Insurance Grounded RAG & Dual-Control Approvals**:
   - Vector retrieval scoped strictly by tenant (`WHERE tenant_id = :tenantId`) with pgvector similarity matching.
   - Fails closed on uncertain coverage queries (<0.65 similarity); creates structured staff handoffs in `approval_requests`.
   - Dual-control governance for policy endorsements and beneficiary updates (`/change-requests`).

5. **Insurance Operations Dashboard & System Diagnostics**:
   - Operations Overview (`/dashboard`) focused on real business metrics: conversations, voice calls, open claims, and staff approvals.
   - System Diagnostics (`/settings` -> System Diagnostics) displaying truthful status for Database, WhatsApp Gateway, LiveKit WebRTC, Voice Worker, and LLM Providers.

---

## Quick Start

### 1. Launch LiveKit Media Server
```bash
start-livekit.bat
```

### 2. Launch Voice Agent Worker
```bash
start-voice-agent.bat
```

### 3. Launch Web Application
```bash
npm run dev
```

### 4. Or Launch Full Stack
```bash
start-all.bat
```

---

## Verification & Audits

```bash
# Type check TypeScript codebase
npx tsc --noEmit

# Production build
npm run build

# Light-mode UI contract audit
node scripts/test-light-mode-audit.mjs

# Database integrity & schema inventory
node scripts/inspect-live-database-readonly.mjs
```
