# InsurCall — Local Inference & Data Region Verification

**Date**: October 28, 2026
**Scope**: Trace where AI inference, embeddings, OCR, speech, storage, logging and WhatsApp processing run; verify local-first claims.

---

## 1. Traced data paths

| Path | Implementation | Runtime destination | Local-first? |
|---|---|---|---|
| LLM answer synthesis (chat) | `src/lib/rag/retrieval.server.ts` | Default: local deterministic synthesis; optional Groq (`llama-3.3-70b-versatile`) if `GROQ_API_KEY` + tenant policy allow | ⚠️ Default local; external opt-in fallback exists |
| Embeddings | `src/lib/rag/embeddings.server.ts` (`@xenova/transformers` all-MiniLM-L6-v2) | Local process | ✅ Local |
| Voice LLM / STT / TTS | `agent/pipeline.py` | Groq (STT/TTS/LLM) if keys set; local Ollama fallback for LLM; local plugins otherwise | ⚠️ Hybrid; local fallback present |
| Voice TTS | `agent/pipeline.py` (Edge TTS / Piper / Ollama) | External (Edge TTS) or local | ⚠️ Hybrid |
| Voice STT / VAD | LiveKit agents (Silero VAD; Groq / OpenAI / local) | Hybrid | ⚠️ Hybrid |
| OCR / document parsing | `src/lib/rag/ingestion.server.ts` | Local fallback OCR | ✅ Local fallback |
| WhatsApp messaging | OpenWA/Baileys (Web session) + Meta Cloud API | Third-party provider | External (provider) |
| Database / storage | InsForge PostgreSQL | `https://ufmgh6q8.ap-southeast.insforge.app` (Singapore) | Region flagged — owner confirmation required |
| Error / log handling | `src/lib/error-reporting.ts`, `src/lib/error-capture.ts` (console pipeline) | In-app console / hosting log pipeline | Third-party not verified |

## 2. Findings

1. **Embeddings and default chat synthesis are local-first** — verified in code.
2. **External AI fallbacks exist** (Groq for chat + voice STT/TTS/LLM; Edge TTS for voice) — only when explicitly keyed and permitted by tenant policy. Not active by default.
3. **Database region flagged as Singapore** (`ap-southeast.insforge.app`) — relevant to the intended India data region; owner confirmation required before stating "all data in India".
4. **No third-party telemetry / error-reporting SDK** confirmed in code paths (console-based error capture).
5. **Model training on customer content**: no training/fine-tuning path was found in the inspected inference/retrieval code.

## 3. Dispositions

- Local-first posture: **partially verified** (local default for chat + embeddings; hybrid for voice).
- Data region: **flagged** — Singapore hosting; must not claim India-only without owner confirmation.
- All inference-default and no-training claims must be re-verified at deployed runtime.

---

**Next actions**: confirm runtime deployment region, finalize voice-provider posture, then proceed to Phase 6 (technical implementation & security) verification.
