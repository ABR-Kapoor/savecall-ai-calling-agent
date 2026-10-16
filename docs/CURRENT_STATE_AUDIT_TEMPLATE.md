# SaveCall Current-State Audit

> The IDE agent must copy this file to `CURRENT_STATE_AUDIT.md` and fill it from actual code evidence. Do not leave this as a generic checklist or infer status from the README.

## Status definitions

- `verified`: directly traced in source and covered by a relevant test or repeatable manual verification
- `partial`: some implementation exists but one or more acceptance criteria are absent
- `missing`: no working implementation found
- `unsafe`: code path exists but violates a security, data-integrity, or truthful-outcome requirement
- `unknown`: insufficient evidence; state what must be inspected

## Audit matrix

| Area | Status | Source/migration/test evidence | Concrete finding | Severity | Recommended fix |
|---|---|---|---|---|---|
| Auth/session verification | unknown | | | | |
| User-to-tenant membership | unknown | | | | |
| Tenant scope for every query | unknown | | | | |
| RLS and cross-tenant tests | unknown | | | | |
| AI Employee configuration persistence | unknown | | | | |
| Knowledge ingestion and approval | unknown | | | | |
| Tenant-scoped retrieval | unknown | | | | |
| LiveKit token/session lifecycle | unknown | | | | |
| Browser fallback behavior | unknown | | | | |
| Model provider privacy policy | unknown | | | | |
| Conversation state and corrections | unknown | | | | |
| Tool schema/authorization | unknown | | | | |
| Confirmation and verification | unknown | | | | |
| Fake/demo data isolation | unknown | | | | |
| Call events and truthful outcomes | unknown | | | | |
| Transcripts/retention | unknown | | | | |
| Human handoff | unknown | | | | |
| Telephony webhook authentication | unknown | | | | |
| Build/lint/typecheck/tests | unknown | | | | |
| Deployment architecture | unknown | | | | |
| README correctness | unknown | | | | |

## Baseline commands

Record each command exactly and include exit code / essential output:

| Command | Result | Notes |
|---|---|---|
| install from lockfile | unknown | |
| lint | unknown | |
| typecheck | unknown | |
| production build | unknown | |
| unit/integration tests | unknown | |

## Top risks

Rank at least the five highest risks by severity and exploitability/customer impact.

## First patch set

List the smallest P0 change set, files to touch, tests to add, migration needs, and rollback considerations.
