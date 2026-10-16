# Claude Code instructions

Follow the repository's `AGENTS.md` as the primary engineering contract. Before coding, read `START_HERE.md`, `docs/PRODUCT_VISION.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY_AND_TENANCY.md`, `docs/IMPLEMENTATION_ROADMAP.md`, and `docs/TESTING_AND_RELEASE.md`. Read the remaining `docs/` files whenever relevant to the task.

Begin major work with the audit workflow in `IDE_EXECUTION_PROMPT.md`. Do not make source changes in the initial audit pass. Never infer that a feature works from the README; trace source and tests. Prioritize tenant isolation, authentication, removal of synthetic production data, and truthful tool outcomes before feature work.
