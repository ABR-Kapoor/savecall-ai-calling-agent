# SaveCall Research and Evaluation Plan

## 1. Research framing

A useful research direction for SaveCall is **reliable multilingual real-time voice agents that execute business workflows safely under noisy, interrupted, correction-heavy conditions**.

Working hypothesis:

> A structured, stateful, policy-controlled voice-agent pipeline with validated tools and post-action verification will complete more business tasks correctly, commit fewer unauthorized actions, and provide more faithful failure behavior than an unconstrained ASR-to-LLM-to-TTS baseline.

This is a hypothesis to test, not a result to claim in advance.

Possible benchmark title: **HinglishTelBench: Evaluating Safe Tool-Using Telephone Agents for Multilingual Business Workflows**. Treat this as a research project/benchmark and keep the product implementation usable even if the research study changes.

## 2. Research questions

- RQ1: How does telephone-bandwidth audio and noise affect intent/entity accuracy?
- RQ2: How accurately does the agent retain state after corrections and interruptions?
- RQ3: How accurately does it select tools and populate normalized arguments?
- RQ4: Does confirmation plus verification reduce unauthorized or falsely reported actions?
- RQ5: How do English, Hindi, and Hinglish compare across the same tasks?
- RQ6: How does end-to-end latency relate to task completion and user-perceived quality?
- RQ7: Does tenant-scoped evidence retrieval reduce unsupported answers?
- RQ8: Can the agent identify when it should ask a clarification question or escalate?

## 3. Baselines and ablations

Compare only implementations that are actually built and held to the same scenario set:

- A: ASR -> LLM -> TTS
- B: ASR -> tenant-scoped retrieval -> LLM -> TTS
- C: ASR -> structured state -> policy -> validated tools -> TTS
- D: state + retrieval + policy + confirmation + verification + escalation

Potential ablations: remove retrieval, structured state, explicit confirmation, post-action verification, or human escalation. Keep the ablation controlled so only the intended component changes.

## 4. Scenario dimensions

Languages: English, Hindi, Hinglish.

Audio conditions: clean, telephone-bandwidth, moderate noise, overlapping speech, rapid speech, hesitation, clipping where safely simulated.

Dialogue phenomena: correction, interruption, ambiguity, repeated information, incomplete utterance, spelling of names, date/time correction, topic change, refusal, request for human, and opt-out.

Tasks: FAQ, service/pricing question, business hours, lead capture, availability lookup, booking, rescheduling, cancellation, and escalation.

Start with a small manually audited pilot, then expand a versioned scenario set. An initial 100–150 scenarios may be practical; the final sample size should be justified by coverage and statistical goals rather than convenience alone.

## 5. Scenario ground truth

Each scenario should specify:
- scenario ID and version
- language and audio condition
- task and expected final structured state
- expected tool and normalized arguments where relevant
- whether confirmation is required
- which facts must come from knowledge versus live tools
- permitted/unpermitted outcomes
- exact success and failure criteria
- expected escalation behavior

Version YAML/JSON fixtures. Record the hash/version of every dataset release. Use synthetic or consented/anonymized data; never put real customer secrets or recordings in a public dataset.

## 6. Metrics

Speech and language:
- ASR WER/CER where appropriate
- Entity Error Rate for names, phone numbers, dates, times, prices, addresses
- intent precision/recall/F1
- normalized state accuracy after each turn and at final state

Knowledge and actions:
- retrieval Recall@K/MRR or other justified retrieval metrics
- citation/evidence support rate
- unsupported-answer rate
- tool selection accuracy
- argument exact-match/normalized accuracy
- tool execution and verification success
- task completion based on ground truth and authoritative state
- unauthorized action rate
- false confirmation rate (assistant reports an action without verified success)
- clarification and escalation precision/recall

Realtime:
- time to speech endpoint
- ASR finalization latency
- time to first model token/audio
- TTS first-audio latency
- end-to-end turn latency p50/p90/p95/p99
- call disconnect/failure rate

Human evaluation where feasible:
- intelligibility, naturalness, helpfulness, trustworthiness, and appropriateness of escalation, with rubric and multiple raters if possible.

## 7. Experimental controls and reproducibility

Record for each run:
- code commit/build version
- agent/config/policy version
- LLM provider/model/quantization and parameters
- ASR/TTS model versions and settings
- retrieval/embedding/reranker configuration
- hardware, driver, software, and deployment placement
- dataset/scenario/audio hashes
- random seeds where applicable
- timeouts/retry policy
- provider outage state and run exclusions

Do not compare models with different scenarios or silently discard failures. Report failure categories and confidence intervals where suitable. Separate live provider measurements from reproducible offline evaluation.

## 8. Safety metrics are first-class

Define success as the correct underlying task outcome, not fluent language or an assistant claim. A booking is successful only if the authoritative booking record is created and matches requested values. An action is unsafe if it is executed without required confirmation/authorization, even when it happens to produce a desired outcome.

Keep at least these explicit metrics:
- unauthorized action rate
- false confirmation rate
- verification failure rate
- cross-tenant leakage rate (target zero)
- escalation miss rate for unsafe/unsupported requests

## 9. Research integrity

- Do not insert invented benchmark scores into the UI, paper, README, or marketing.
- Clearly distinguish simulations from live actions.
- Report limitations, provider/model versions, sample selection, evaluation date, and annotation method.
- Obtain required consent/review before recording or processing real calls.
- Preserve negative and failed results; do not cherry-pick only successful calls.
- Research evaluation must never be allowed to bypass production authorization policies.
