# InsurCall Development Entry Point

Welcome to the InsurCall repository. InsurCall is an insurance-specific customer support and operations platform integrating conversational AI voice calling and WhatsApp messaging.

For the central architectural and engineering reference, read:
- [INSURCALL_SOURCE_OF_TRUTH.md](docs/INSURCALL_SOURCE_OF_TRUTH.md)

---

## Repository Guidelines

1. **Dual-Channel Coexistence**:
   - The AI Voice Agent (`/voice`, `/calls`, `agent/`, `bin/livekit/`) and WhatsApp Messaging (`/whatsapp`, `src/lib/whatsapp/`) are coexisting product pillars.
   - Do not remove or hide calling functionality.
2. **Outbound Safety Gates**:
   - Outbound WhatsApp auto-replies must remain fail-closed in development.
   - Enforce server-side kill switches and recipient allowlists (`src/lib/whatsapp/outbound-guard.server.ts`).
3. **No Synthetic / Fake Data**:
   - All production dashboard metrics, contacts, calls, and claims must derive from authenticated tenant database records.
   - Empty states must be truthful, not artificially populated.
4. **Tenant Isolation**:
   - Every database query and vector retrieval must enforce `tenant_id` scoping.
5. **Aesthetics & Theme**:
   - Maintain a crisp, light insurance operations aesthetic with `#087F8C` teal accents.
