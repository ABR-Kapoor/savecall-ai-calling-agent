# InsurCall — WhatsApp Text & Voice Safeguards Audit

**Date**: October 28, 2026
**Scope**: WhatsApp text auto-reply safeguards and voice-calling safeguards during pilot stage.

---

## 1. WhatsApp Text Safeguards — Implementation Status

| Control | Location | Status |
|---|---|---|
| Server kill switch (`WHATSAPP_OUTBOUND_KILL_SWITCH`) | `src/lib/whatsapp/outbound-guard.server.ts` | ✅ Implemented |
| Loop prevention (self/outbound echo) | Outbound gate (`fromMe`) | ✅ Implemented |
| Group auto-reply prohibition | Outbound gate (group identity) | ✅ Implemented |
| LID unmapped recipient block | Outbound gate + test allowlist | ✅ Implemented |
| Human staff takeover gate | Outbound gate | ✅ Implemented |
| AI auto-reply feature flag + per-connection toggle | Env flag + `whatsapp_connections.auto_reply_enabled` | ✅ Implemented |
| Groundedness requirement (no ungrounded auto-reply) | Final outbound gate + RAG retrieval | ✅ Implemented (escalates to staff when ungrounded) |
| Cooldown / runaway cascade prevention | Final outbound gate (4s min) | ✅ Implemented |
| Dev/test recipient allowlist + dev sends disabled by default | Outbound gate env flags | ✅ Implemented |
| **Opt-out / STOP suppression enforcement** | — | ❌ **NOT IMPLEMENTED** |
| **Approved WhatsApp templates & customer-service window handling** | Provider-side configuration | ❌ **NOT IMPLEMENTED / NOT VERIFIABLE** |

### Opt-out finding (owner confirmation / technical follow-up required)

- No `opt_out`, `opted_out`, consent, or preference state exists in the WhatsApp schema (`insforge/migrations/006_whatsapp_openwa_integration.sql`, `001_insurance_schema.sql`) or in the outbound guard.
- Inbound webhook flow does not handle `STOP` / `UNSUBSCRIBE` keywords or store suppression state.
- Therefore an opt-out **cannot currently be enforced** at the outbound boundary, and the consent-preferences page correctly states this limitation.
- **Required follow-up**: owner confirmation + backend design for an opt-out state store/enforcement before any proactive messaging feature ships.

### Escalation finding

- Human escalation for ungrounded queries is implemented (`approval_requests` insert + human takeover + staff reply path).

## 2. WhatsApp Voice Calling — Implementation Status

| Item | Status |
|---|---|
| LiveKit `ConnectorClient` WhatsApp calling primitives (`dialWhatsAppCall`, `acceptWhatsAppCall`, `connectWhatsAppCall`, `disconnectWhatsAppCall`) | ✅ Verified in `livekit-server-sdk` 2.9.7 |
| Meta Cloud API calling webhook handler (`/api/webhooks/meta-whatsapp`) | ⚠️ Exists; calling-event coverage **not fully verified** |
| LiveKit WhatsApp connector service | ⚠️ Present (`src/lib/voice/livekit-whatsapp.server.ts`) — not production-verified |
| Actual dial capability (Meta app eligibility, phone-number-ID, Cloud API key, consent) | 🔴 **Not verified** — must not be advertised as active |
| Missed-call → textback flow | ✅ Implemented |

**Conclusion**: WhatsApp voice calling is **conditionally unverified**. It must not be presented as available until provider eligibility, webhook coverage, consent, and runtime behaviour are confirmed.

---

## 3. Phase 4 dispositions

1. **Implemented & verified this segment**: kill switch, loop/group/LID/takeover/grounded/cooldown guards, escalation path.
2. **Documented limitation**: opt-out suppression not yet enforceable; templates/window handling provider-side.
3. **Pending owner confirmation**: WhatsApp voice calling activation readiness; consent requirements for calls.

No destructive or unrelated changes were made in this segment.
