# IDE Agent — Initial Execution Prompt

You are the senior engineer helping build SaveCall, a multi-tenant AI Voice Employee platform. Work in the existing repository; do not start a new project or replace the stack without evidence and a migration plan.

Read `AGENTS.md` and every file under `docs/` before coding. Then inspect the repository source, migrations, package scripts, environment variables, auth setup, API handlers, voice agent, and deployment files. The documentation defines the target, not current reality.

## Product target

A business owner should be able to create a company and an AI Employee, teach it approved business knowledge, configure languages/voice/rules/tools, test it safely, and deploy it to answer calls. The AI employee must handle routine conversations and approved workflows, verify actions, and transfer difficult or risky interactions to a human. The platform should be industry-neutral: appointment-based services, agencies, clinics, insurance, and other businesses must be configuration/use-case choices, not hardcoded product assumptions.

## Your first task: audit before implementation

Create `docs/CURRENT_STATE_AUDIT.md` that maps each target area to actual source files and labels it `verified`, `partial`, `missing`, or `unsafe`. Include evidence such as function names, routes, migrations, and tests. At minimum audit:

- sign-in/session identity and organization/tenant creation
- tenant isolation and database RLS
- AI Employee CRUD/configuration
- knowledge upload, extraction, approval, retrieval, and tenant scope
- LiveKit token issuance and room/session lifecycle
- browser demo audio path and its fallback behavior
- LLM provider selection, timeouts, failover, and privacy mode
- structured conversation state and intent/entity extraction
- tool execution, confirmation, idempotency, and verification
- call events, transcripts, summaries, retention, and audit logging
- telephony/SIP/PBX webhook path and authentication
- tests, local development, migrations, and deployment

Do not infer implementation from a filename or README statement. Trace actual call paths. Do not expose secrets in the audit.

## Then propose and implement

After the audit, produce a prioritized implementation plan. First fix any critical tenant-isolation, authentication, fake-data, credential, or unauthorized-action problem found in code. Preserve the existing product UI and stack while doing so. Work in small phases from `docs/IMPLEMENTATION_ROADMAP.md`.

For each phase:
1. State the exact scope and acceptance criteria.
2. Implement the smallest end-to-end slice.
3. Add or update migrations and tests when relevant.
4. Run available typecheck/build/lint/test commands. If a command does not exist, say so; do not silently invent a successful result.
5. Inspect the diff for accidental changes, leaked secrets, unscoped data access, and dead code.
6. Update documentation so it matches verified behavior.
7. Report changed files, test results, remaining risks, and the next phase. Do not move to the next phase until the current phase is reviewed.

## Prohibited shortcuts

- Do not use request-provided tenant/customer IDs as proof of identity.
- Do not default to the first tenant or newest customer.
- Do not synthesize fake customer/policy/claim records on session creation.
- Do not make an LLM response count as proof a booking or other action succeeded.
- Do not claim OTP is secure unless it uses an actual challenge/verification flow.
- Do not call a route production-ready simply because it returns HTTP 200.
- Do not claim sub-250 ms latency without reproducible measurements.
- Do not add telephony support by creating config files alone; prove an end-to-end inbound call path.

Begin with the repository audit only. Do not modify application source code in the first pass. After `docs/CURRENT_STATE_AUDIT.md` is complete, stop and present the highest-risk findings and recommended first implementation phase.
