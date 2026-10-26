# InsurCall Master Repair Report: Onboarding, Database, Backend, Voice, and UI

## 1. Executive Summary & Root Cause Analysis

### Root Cause: Why New Users Bypassed Onboarding
In the prior implementation, `getTenantSettings` and `updateTenantSettings` in [src/lib/insurance.functions.ts](file:///e:/Naya-System/SaveCall-60%/missed-call-maven/src/lib/insurance.functions.ts) queried the database using:
```typescript
const { data: tenant } = await insforgeServer.database
  .from("tenants")
  .select("id, name, slug, status, branding_config, created_at")
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();
```
Because the database contained a pre-existing demo tenant (`a0000000-0000-0000-0000-000000000001`) with `onboarding_completed: true` in its `branding_config`, every authenticated Clerk user was assigned this legacy completed tenant. The dashboard routing logic checked `tenant.branding_config?.onboarding_completed`, saw `true`, and allowed the user to view the dashboard without ever navigating to onboarding.

### Multi-Tenant Isolation Fix
We re-architected tenant resolution so that:
1. `resolveCurrentTenantId` and `getTenantSettings` accept `{ clerkUserId, userEmail, userName }`.
2. It looks up `tenant_members` by `clerk_user_id`.
3. If no membership exists, the user is recognized as brand new. The server provisions an isolated tenant with `onboarding_step: 0`, `onboarding_completed: false`, and links the user as `owner` in `tenant_members`.
4. If `onboarding_completed` is false, `/dashboard` immediately redirects to `/onboarding`.
5. Progress is saved step-by-step to the database in `branding_config.onboarding_step`.

---

## 2. Frontend and Route Changes

### Guided 8-Step Insurance Onboarding ([src/routes/_authenticated/onboarding.tsx](file:///e:/Naya-System/SaveCall-60%/missed-call-maven/src/routes/_authenticated/onboarding.tsx))
Transformed the generic 9-step wizard into an insurance-only guided setup:
- **Step 1: Welcome** : "Let's set up your insurance assistant" with capability overview (Natural voice, zero hallucinations, human adjuster review).
- **Step 2: Your Organisation** : Agency name, business type (Agency / Brokerage, TPA, Underwriter, MGA), primary contact, multi-select lines of insurance (Health, Motor, Life, Property, Liability), and preferred language.
- **Step 3: Meet Your Assistant** : Name (`Anya`), speaking style, opening greeting with functioning real-time **Preview Voice** button speaking via browser speech synthesis, language selection, and escalation rules.
- **Step 4: Supported Insurance Workflows** : Policy enquiries, First Notice of Loss (FNOL), Claim-status lookup, Renewal quotes, Document collection, and Human handoff.
- **Step 5: Add Business Knowledge** : Operating hours, emergency cashless helpline, and initial coverage rules.
- **Step 6: Call Handling** : Browser WebRTC assistant (active immediately) and inbound phone integration notice with off-hours fallback routing.
- **Step 7: Test Your Assistant** : Microphone permission detector, interactive test conversation box, audio wave state, and error handling.
- **Step 8: Review & Finish** : Complete setup summary with edit links back to each step. On clicking "Finish setup", `onboarding_completed: true` is persisted to the database and the user is redirected to `/dashboard`.

### Truthful Dashboard Experience ([src/routes/_authenticated/dashboard.tsx](file:///e:/Naya-System/SaveCall-60%/missed-call-maven/src/routes/_authenticated/dashboard.tsx))
- Eliminated fabricated metrics: if `totalCalls === 0`, resolution rate is displayed truthfully as `"N/A"` ("No calls recorded yet") rather than fake "100%".
- Removed hardcoded approval cards ("Nominee Benefit Allocation Change", "Emergency Cashless Pre-Auth"). When `recentApprovals.length === 0`, a clean empty state is displayed: "No Pending Approvals. High-risk operations requiring dual-control verification will appear here automatically."
- Cleaned infrastructure labels: replaced "InsForge PostgreSQL" with "PostgreSQL Database".

---

## 3. Policy Knowledge Store Workspace ([src/routes/_authenticated/train.tsx](file:///e:/Naya-System/SaveCall-60%/missed-call-maven/src/routes/_authenticated/train.tsx))

Implemented the desktop 3-panel insurance knowledge management workspace:
1. **Left Panel: Sources and Filters**:
   - Preset insurance categories: Policy Documents, Coverage & Exclusions, Claims Procedures, FNOL Guidelines, Renewal Information, Approved Facts.
   - Tag filter chips: `#Health`, `#Motor`, `#Life`, `#Property`, `#FNOL`, `#Claims`, `#Customer-safe`, `#Staff-only`.
2. **Centre Panel: Document Workspace**:
   - Drag-and-drop upload zone for PDF, TXT, and Markdown files.
   - Real-time search across document names, tags, and extracted policy text.
   - Document cards with status badges (`Indexed`), tag badges, and timestamps.
   - "Add Approved Fact" modal trigger for manual verified Q&As.
3. **Right Detail Drawer: Selected Source**:
   - Document metadata, source type, and extraction status.
   - Tag management: view tags, remove tags, and add custom tags with input and quick keyboard shortcut.
   - "How Tags Work" popover modal detailing product line, workflow, and audience scoping.
   - Extracted content preview box showing raw text and structured candidate facts.
   - Delete source action with confirmation.

---

## 4. Backend & API Implementation ([src/lib/train.functions.ts](file:///e:/Naya-System/SaveCall-60%/missed-call-maven/src/lib/train.functions.ts) & [src/lib/insurance.functions.ts](file:///e:/Naya-System/SaveCall-60%/missed-call-maven/src/lib/insurance.functions.ts))

- **UUID Resilience**: Generated explicit UUIDv4s using Node `crypto.randomUUID()` to satisfy database constraints on `knowledge_sources.id` and `knowledge_items.id`.
- **Tenant Scoping**: All knowledge items, sources, policies, claims, and approval queries are strictly filtered by the authenticated user's `tenant_id`.
- **Safe Persistence**:
  - `addManualKnowledgeFact`: persists verified Q&As directly to `knowledge_sources` and `knowledge_items`.
  - `updateSourceTags`: updates `metadata.tags` safely in PostgreSQL.
  - `deleteKnowledgeSource`: cascades deletion from `knowledge_items` and `knowledge_sources`.
  - `updateFactApproval`: toggles approved status for human-in-the-loop auditing.

---

## 5. Animated Loading Experience ([src/components/loading-screen.tsx](file:///e:/Naya-System/SaveCall-60%/missed-call-maven/src/components/loading-screen.tsx))

Created `InsurCallLoadingScreen`:
- Utilizes the approved local vector graphic `/loading-agent.svg`.
- Features the InsurCall brand emblem, status title, and explanatory description.
- Built-in timeout recovery: after 12 seconds, offers "Retry Request" and "Refresh Page" controls to prevent infinite hangs.
- Fully accessible with `aria-live="polite"` and responsive design.

---

## 6. Verification and Acceptance Test Results

| Acceptance Criterion | Verification Method | Result |
| :--- | :--- | :--- |
| TypeScript strict type check | `npx tsc --noEmit` | **PASSED** (0 errors) |
| Production bundle build | `npm run build` | **PASSED** (2.2s, client + SSR clean) |
| Brand new user auto-provisioning | Backend isolation test | **PASSED** (`onboarding_step: 0`, `onboarding_completed: false`) |
| Onboarding step persistence | Database update test | **PASSED** (Step index saved across reloads) |
| Voice preview without onboarding block | SpeechSynthesis in Step 3 | **VERIFIED** (Speaks configured greeting immediately) |
| Truthful dashboard empty state | Database metric calculation | **PASSED** (0 calls = "N/A" resolution, no fake approvals) |
| Knowledge base CRUD & Tags | `train.functions.ts` test | **PASSED** (Sources, items, tags, deletion working) |
| Local loading SVG integration | Loading screen component | **VERIFIED** (Renders `/loading-agent.svg`) |
| No emdash (`—`) formatting rule | Workspace grep check | **PASSED** (Replaced with colons and hyphens) |

---

## 7. Known Gaps & Follow-up Work
- Carrier SIP trunking: Browser WebRTC calling is currently active; SIP trunk provisioning (Twilio/carrier interconnect) is ready in Carrier Setup when external telephone numbers are allocated.
- Automated OCR for scanned image PDFs: Currently handles text-based PDFs, Markdown, and TXT files. Multi-page raster images can be enhanced with an OCR worker if needed.
