# SaveCall Target Architecture

## 1. Existing stack and change policy

The repository currently advertises TanStack Start, React, TypeScript, Vite, Tailwind CSS, Radix UI, Clerk, InsForge/PostgreSQL, LiveKit, Groq, and Ollama. Treat this as the starting point, not proof that every integration works. Keep the current stack unless the audit demonstrates a concrete problem that cannot reasonably be fixed within it.

Do not replace Clerk, InsForge, LiveKit, or the routing framework merely because another option is fashionable. Before changing an infrastructure provider, document the reason, migration, data implications, rollback, cost, and operational burden.

## 2. Separate control plane from realtime data plane

### Control plane

Owns authenticated product configuration and management:
- users, organizations, memberships, roles, and permissions
- AI Employee configuration/versioning
- knowledge sources and ingestion status
- tools/integrations and permission grants
- policies and deployment mode
- call history, summaries, analytics, billing later
- audit records and tenant administration

### Realtime data plane

Owns active call execution:
- WebRTC/media connection and room lifecycle
- speech detection and turn management
- transcription and conversation state
- retrieval and policy checks
- LLM inference and response generation
- typed tool requests and execution
- speech synthesis and audio delivery
- interruption/barge-in and escalation

The control plane configures what an AI Employee is allowed to do. The data plane enforces that configuration during a call. The UI cannot override server-side policy.

## 3. Recommended logical flow

```text
Business user dashboard
  -> authenticated control-plane API
  -> organization/AI Employee configuration
  -> PostgreSQL + RLS

Caller/browser
  -> authenticated/signed session creation
  -> LiveKit room and short-lived least-privilege token
  -> realtime agent session
       -> speech/turn manager
       -> transcription
       -> conversation state
       -> tenant-scoped knowledge retrieval
       -> policy/action planner
       -> validated tool executor
       -> LLM response generation
       -> TTS/audio output
  -> verified event and outcome records
  -> dashboard analytics
```

Do not treat the LLM as the source of truth for identity, authorization, available slots, booking outcomes, customer records, or whether an action succeeded.

## 4. Browser call vs telephone call

### Browser/WebRTC MVP

Use LiveKit as the realtime media transport when configured. A browser-native Web Speech/Web Audio path may exist as a development fallback, but it is a separate runtime path and must expose its limitations. Do not claim seamless fallback unless conversation state, captions, interruption behavior, failure recovery, and user-visible state have been tested across the transition.

### PSTN/SIP later

The telephone path must be treated as a separate integration boundary:
`PSTN/carrier -> SIP/PBX or supported SIP gateway -> LiveKit/realtime agent -> validated business tools`.

A dialplan file or webhook endpoint alone is not an end-to-end telephony implementation. Verify carrier/PBX configuration, signatures/authentication, audio format, call lifecycle events, transfers, hangup behavior, and failure handling in an integration test.

## 5. Provider abstraction

Encapsulate inference behind a server-only interface such as:

```ts
export type ModelMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type InferenceRequest = {
  messages: ModelMessage[];
  maxOutputTokens: number;
  temperature?: number;
  deadlineMs: number;
  privacyClass: "public" | "internal" | "sensitive";
};

export type InferenceResult = {
  text: string;
  provider: string;
  model: string;
  latencyMs: number;
  requestId: string;
};

export interface LLMProvider {
  generate(request: InferenceRequest): Promise<InferenceResult>;
}
```

Adapt the interface to current code conventions rather than copying this blindly. Provider adapters may include Groq and Ollama. Configuration decides which providers are allowed; a user query keyword heuristic is not a sufficient privacy classifier. Local-only mode must never silently fall back to a cloud provider.

Use an overall request deadline, cancellation, bounded retries, and clear failure classes. Sequential timeouts must not consume the entire voice-turn budget. Record provider/model and timings, but not sensitive prompts by default.

## 6. Voice runtime responsibilities

Keep modules conceptually separate:
- `session`: identity/authorization, tenant resolution, call creation, token issuance
- `media`: LiveKit/browser transport integration
- `turn-manager`: VAD/utterance completion, barge-in, timeout handling
- `transcription`: speech-to-text adapter and language metadata
- `conversation-state`: typed state with correction/merge rules
- `knowledge`: tenant-scoped retrieval with source references
- `policy`: permissions, required confirmation, escalation rules
- `tools`: typed integrations and verified outcomes
- `generation`: provider selection and response generation
- `speech`: text sanitization and TTS adapter
- `events`: structured call trace and metrics

The first implementation need not create one file per responsibility. Avoid premature fragmentation; enforce boundaries where they improve testability and security.

## 7. Data and side effects

- PostgreSQL is the system of record for organizations, configs, calls, and business outcomes.
- Knowledge retrieval may use PostgreSQL/pgvector or the existing supported InsForge capabilities, but the tenant filter and source lineage must be explicit.
- Real-world actions must flow through typed tool functions, not LLM-generated SQL or generic arbitrary HTTP access.
- Use transactions for multi-row state changes where supported.
- Use idempotency keys for actions that may be retried after a timeout.
- Persist action intent, validation, result, and verification separately when the action is consequential.

## 8. Deployment boundaries

Vercel can serve the web/control-plane parts that fit its runtime and configured adapter limits. Stateful media workers, persistent audio streams, SIP/PBX services, and model serving may require the always-on university server or another persistent host. Do not assume serverless functions can maintain an indefinite call session.

Development must work without live credentials by using explicit mocks/sandbox adapters. Production credentials must be server-side only. Provide health/readiness endpoints and operational instructions for each separately deployed component.

## 9. Architecture rules

- Every cross-component call has an explicit timeout and typed error handling.
- Call/event IDs must be correlated across media, inference, tools, and persistence.
- Never log raw audio/transcripts by default unless the configured retention and consent settings allow it.
- Every external integration has a configuration/health state surfaced to administrators.
- A disabled or unhealthy integration must not be shown as ready.
- Document actual runtime topology as deployed; do not document aspirational topology as implemented.
