# SaveCall IDE Instruction Pack

This pack tells an AI coding assistant how to evolve the current SaveCall repository into the intended product without inventing completed functionality or introducing unsafe shortcuts.

## How to install

1. Copy the contents of this folder into the root of `savecall-ai-calling-agent`.
2. Review the existing root `AGENTS.md` before replacing it. Merge this pack's `AGENTS.md` with any still-valid repository-specific instructions; do not blindly erase required InsForge or deployment guidance.
3. Commit the documentation first, so subsequent implementation work has an auditable target.
4. In your IDE assistant, use the prompt in `IDE_EXECUTION_PROMPT.md`.
5. Ask the IDE to execute one phase at a time from `docs/IMPLEMENTATION_ROADMAP.md`. Do not ask it to rewrite the whole application in one pass.

## File map

- `AGENTS.md` — instructions that should guide every coding task.
- `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.cursor/rules/savecall-core.mdc` — lightweight entry points for common IDE coding assistants.
- `IDE_EXECUTION_PROMPT.md` — first prompt to give Cursor, Claude Code, Copilot, or another IDE agent.
- `docs/PRODUCT_VISION.md` — what SaveCall should be for customers and businesses.
- `docs/ARCHITECTURE.md` — system boundaries, deployment model, and component responsibilities.
- `docs/SECURITY_AND_TENANCY.md` — identity, tenant isolation, authorization, and secret-handling rules.
- `docs/VOICE_AGENT_SPEC.md` — live voice behavior, state, tools, confirmations, and failure handling.
- `docs/DATA_AND_API_CONTRACTS.md` — canonical domain model and API design rules.
- `docs/RESEARCH_AND_EVALUATION.md` — scientific evaluation, reproducibility, and benchmark plan.
- `docs/IMPLEMENTATION_ROADMAP.md` — phased build order and priority acceptance criteria.
- `docs/TESTING_AND_RELEASE.md` — tests, commands, release gates, and truthful documentation.
- `docs/DECISIONS_AND_NON_GOALS.md` — defaults, unresolved decisions, and features intentionally out of scope.

## Ground rules

- These files define the target, not proof that a feature currently exists.
- Inspect the code before changing it. Map each requirement to existing files, tests, database tables, and runtime behavior.
- Preserve working functionality unless a documented defect or architectural issue justifies changing it.
- Prefer small, reviewable changes over a full rewrite.
- Fix security and data-integrity blockers before adding functionality.
- Never fabricate customer, policy, claim, appointment, or business records in a production path.
- Never claim production readiness, sub-250 ms latency, full telephony support, or compliance without evidence.
