# SaveCall Voice Agent Functional Specification

## 1. Runtime objective

The agent should understand what the caller needs, maintain a consistent structured state, retrieve approved evidence, decide whether an answer or tool is appropriate, execute only authorized actions, verify consequential outcomes, speak clearly, and escalate when required.

Preferred loop:

`OBSERVE -> INTERPRET -> UPDATE STATE -> RETRIEVE -> CHECK POLICY -> DECIDE -> ACT -> VERIFY -> RESPOND -> ESCALATE IF NEEDED`

This is a target behavior. Map it to the current code before restructuring.

## 2. Separate concerns

- **Speech/media:** audio packets, WebRTC/SIP transport, VAD/turn boundaries, interruption handling.
- **Transcription:** audio-to-text, language detection, timestamps/confidence if available.
- **Conversation state:** typed facts, intent, unresolved slots, prior corrections, current task status.
- **Knowledge retrieval:** evidence for factual answers, scoped to tenant and approved sources.
- **Policy:** what the agent can answer/do, required confirmation, allowed hours, escalation rules.
- **Tools:** typed, allowlisted business operations.
- **Generation:** natural language response within policy and evidence.
- **Speech output:** spoken-text cleaning, TTS, playback/cancellation.
- **Event trace:** structured record of what actually occurred.

## 3. Conversation state

Maintain canonical state rather than relying on an ever-growing plain-text history. A conceptual schema:

```ts
type ConversationState = {
  callId: string;
  tenantId: string; // server-resolved, never trusted from model output
  agentId: string;
  language: "en" | "hi" | "hinglish" | "other";
  intent?: string;
  slots: Record<string, { value: unknown; source: "caller" | "tool" | "knowledge"; confidence?: number }>;
  missingSlots: string[];
  pendingAction?: {
    actionId: string;
    toolName: string;
    normalizedArguments: Record<string, unknown>;
    status: "proposed" | "awaiting_confirmation" | "validated" | "executing" | "verified" | "failed" | "cancelled";
  };
  lastCorrectionAt?: string;
};
```

Adapt to real domain types. The model must not be able to write trusted `tenantId`, authorization status, or a verified outcome into the state.

Corrections replace stale values:
- “Friday” -> date Friday
- “Actually Saturday” -> date Saturday, preserving unrelated fields
- “No, Sunday, at 1 PM” -> date Sunday and time 13:00

Track source and confidence for extracted values where useful. Ask a clarification question if ambiguity materially affects the action.

## 4. Knowledge vs action

Knowledge retrieval is for questions such as service details, policies, opening hours, and FAQs. A tool is for current or transactional facts: checking live availability, creating a booking, changing a record, creating a lead, or transferring a call.

Every retrieved factual answer should be supported by approved tenant-owned content or a trusted tool result when current data is needed. If evidence is absent, stale, conflicting, or from another tenant, the agent must not invent an answer.

## 5. Tool contract

Tools are explicit functions with typed request/response schemas. Start with generic, tenant-configurable tools such as:

- `search_approved_knowledge(query)`
- `get_business_hours(date?)`
- `check_availability(service, date_range, duration?)`
- `create_booking(customer_details, service, start_time, idempotency_key)`
- `reschedule_booking(booking_id, new_start_time, idempotency_key)`
- `cancel_booking(booking_id, reason?, idempotency_key)`
- `create_lead(contact_details, interest, consent_state?)`
- `request_human_handoff(reason, summary)`

Implement only tools that have a real backend/integration. A tool must not return a mocked success in production. Include input validation, authorization, typed errors, timeouts, idempotency where relevant, and verification queries.

## 6. Consequential action lifecycle

Use a persisted lifecycle conceptually equivalent to:

`PROPOSED -> CONFIRMATION_PENDING -> VALIDATED -> EXECUTING -> VERIFIED -> CUSTOMER_CONFIRMED`

Alternative terminal outcomes include `REJECTED`, `CANCELLED`, `FAILED`, and `NEEDS_HUMAN`. Avoid a misleading state that suggests the customer confirmed an action if only the tool confirmed it.

Example booking flow:
1. Understand service/date/time and resolve ambiguity.
2. Call the real availability tool.
3. Offer available choices.
4. Ask the caller to explicitly confirm the selected option.
5. Validate permissions and business rules again.
6. Execute the booking using an idempotency key.
7. Query the authoritative booking system to verify it exists and matches the requested details.
8. Tell the caller the result only after verification.
9. Persist the trace and summarize the outcome.

If execution times out, query by idempotency/request ID before retrying. The booking may have succeeded despite a missing response.

## 7. Confirmation policy

Require explicit confirmation for bookings and other side effects unless the tenant's approved workflow explicitly defines otherwise. Require stronger verification/human approval for sensitive or irreversible changes. “Maybe”, “I think so”, silence, background speech, or model inference is not confirmation.

Read back critical fields in natural language before committing if the consequence warrants it. Do not demand repetitive confirmation for harmless FAQ answers.

## 8. Hindi, English, and Hinglish

Support code-switching without forcing the caller into a single language. Preserve meaning of Indian names, phone numbers, dates, times, prices, addresses, and service names. Normalize entities into structured values before executing tools. Confirm ambiguous numeric values in speech, for example dates that could mean different days/months.

Research and test telephone bandwidth, moderate noise, interruptions, rapid speech, hesitation, corrections, and different accents. Do not claim high accuracy from a few clean browser demos.

## 9. Latency and turn taking

Measure components separately and end-to-end:
- speech-end detection / endpointing
- ASR finalization
- state update and retrieval
- tool latency
- time to first generated token/audio
- TTS first audio
- total turn latency

Use streaming where supported. Apply an overall deadline and cancellation. A fallback must not cause duplicate tool execution. On interruption, cancel stale generation/audio when safe and preserve the current state. Track p50, p90, p95, and p99; do not publish a single “sub-250 ms” number without a clear measurement definition and reproducible evidence.

## 10. Failure behavior

- unknown answer: acknowledge uncertainty and offer handoff or callback
- no availability: explain that no matching slot was confirmed and ask for another preference
- provider outage: use an approved fallback, or state the limitation and hand off
- tool timeout: check operation status/idempotency before retrying
- TTS/media failure: make the failure visible, retry within a bound, or end/transfer safely
- customer anger or explicit request for a human: offer/execute the configured handoff
- incomplete or untrusted identity: do not disclose private account details
- policy disallows action: politely explain the limit and provide allowed next steps

## 11. AI disclosure and caller control

The agent must not claim to be a human. Provide a configurable disclosure appropriate to the channel and deployment. Respect explicit opt-out/hangup/human requests. For outbound calling later, enforce consent, do-not-call suppression, time windows, rate limits, and jurisdiction-specific legal requirements before enabling campaigns.

## 12. Call lifecycle and event trace

Use explicit lifecycle statuses such as:
`CREATED -> CONNECTING -> CONNECTED -> ACTIVE -> HANDOFF/ENDING -> COMPLETED/FAILED`

Events should include timestamps and correlation IDs. Suggested events:
`CALL_CREATED`, `CALL_CONNECTED`, `SPEECH_STARTED`, `TRANSCRIPT_FINAL`, `STATE_UPDATED`, `RETRIEVAL_COMPLETED`, `TOOL_PROPOSED`, `CONFIRMATION_RECEIVED`, `TOOL_VALIDATED`, `TOOL_EXECUTED`, `TOOL_VERIFIED`, `ASSISTANT_AUDIO_STARTED`, `HANDOFF_REQUESTED`, `CALL_ENDED`, `CALL_FAILED`.

Never infer a successful event from an assistant utterance. Emit it from the actual component that performed the operation.
