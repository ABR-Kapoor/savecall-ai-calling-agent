# GitHub Copilot instructions for SaveCall

Follow root `AGENTS.md` and the SaveCall documentation in `docs/`. Before coding, inspect the actual route/service, migration, auth and test implementations; do not trust README claims as proof. Read `docs/SECURITY_AND_TENANCY.md` for all database/API work and `docs/VOICE_AGENT_SPEC.md` for voice/LLM/tool work.

Build SaveCall as an industry-neutral, multi-tenant AI Voice Employee platform. Fix authentication, tenant isolation, fabricated records, unsafe actions, and false-success behavior before adding features. Keep changes focused, validate all untrusted input, derive tenant identity server-side, preserve RLS, and add regression tests. Never hardcode secrets or claim test/latency/production readiness without evidence. Report changed files, exact commands/results, risks, and remaining gaps.
