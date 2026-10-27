# InsurCall: Phone Number Onboarding & Voice Telephony Architecture Guide

## 1. Overview & Business Owner Vision

InsurCall is an AI voice receptionist designed for Indian insurance agencies, broking firms, and corporate TPAs, with international expansion capability. A business owner must be able to connect their business phone line, link verified policy knowledge, simulate agent conversations, and activate live calling without understanding SIP headers, PostgreSQL internals, pgvector dimensions, or WebRTC signaling.

This document specifies the telephony architecture, the three connection paths, carrier MMI integration codes, regulatory compliance (DoT and TRAI), security boundaries, and the durable state machine governing phone numbers.

---

## 2. The Three Phone Number Connection Paths

### Path 1: Mobile Call Forwarding (Preferred & Default Path)
**Target User:** Independent insurance agents, micro-brokerages, and clinic front-desks who operate primarily from a mobile number and standard SIM card.

#### How It Works
1. The business retains its existing mobile phone, physical SIM / eSIM, and telecom plan (Airtel, Jio, Vi, BSNL).
2. InsurCall assigns a dedicated Inbound Routing DID from its licensed telecom gateway pool (e.g., `+91 80 4736 1829`).
3. The business dials a standard GSM/MMI forwarding code on their handset.
4. When the business owner is busy on another call or does not answer within 20 seconds, the carrier automatically diverts the incoming caller to the InsurCall gateway.
5. The gateway preserves the original caller ID (CLI), identifies the registered tenant, and bridges the audio to the agency's trained AI receptionist.

#### Department of Telecommunications (DoT) Directive on USSD Call Forwarding (March 28, 2024)
> [!IMPORTANT]
> **DoT Directive 16-6/2020-TC (Effective April 15, 2024):**
> On March 28, 2024, the Department of Telecommunications (DoT), Ministry of Communications, Government of India, directed all Access Service Licensees to discontinue USSD-based call forwarding services (such as `*401*`, `*21*`, `*67*`) to curb cybercrime, unauthorized SIM redirection, and financial fraud. Subscribers must configure call forwarding via alternative non-USSD mechanisms:
> 1. **Primary Compliant Method:** Mobile Handset Settings (Android / iOS Supplementary Services).
> 2. **Carrier Self-Care Portals / Mobile Apps:** MyJio, Airtel Thanks, and Vi mobile applications.
> 3. **Legacy USSD MMI Codes:** Retained as a secondary reference where specifically supported on enterprise lines.

#### Primary DoT-Compliant Handset Settings Procedure
- **Android Handsets:**
  1. Open the standard Phone / Dialer application.
  2. Tap the three dots menu (top right) -> **Settings**.
  3. Select **Supplementary Services** (Samsung) or **Calling Accounts / Advanced Settings** (Pixel, OnePlus, Xiaomi).
  4. Tap **Call Forwarding** -> **Voice Calls**.
  5. Select **When Busy** or **When Unanswered**.
  6. Enter the assigned InsurCall Routing DID (e.g. `+91 80 4736 1829`).
  7. Tap **Turn On** or **Enable**.
- **Apple iOS (iPhone):**
  1. Open **Settings** on the iPhone.
  2. Scroll down and tap **Phone**.
  3. Tap **Call Forwarding** and switch the toggle to **ON**.
  4. Tap **Forward to** and enter the assigned InsurCall Routing DID.
  5. Return to the previous screen; settings save automatically.
- **Fixed-Line vs Mobile Differentiation:**
  - Standard mobile numbers follow cellular handset settings.
  - Fixed-line / JioFiber Voice numbers must be configured via the MyJio Home app or carrier fixed-line enterprise portal, as handset GSM MMI dial codes do not execute over FTTH landlines.

#### Carrier MMI Dial Codes & Reference
| Carrier | Conditional Forward (Busy) | Conditional Forward (No Answer) | Unconditional Forward (All Calls) | Status Query | Cancellation / Rollback |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Bharti Airtel** | `*67*[DID]#` | `*61*[DID]#` | `*21*[DID]#` | `*#61#` | `##002#` |
| **Reliance Jio** | `*401*[DID]` | `*401*[DID]` | `*401*[DID]` | `*#401#` | `*402` |
| **Vodafone Idea (Vi)**| `*67*[DID]#` | `*61*[DID]#` | `*21*[DID]#` | `*#61#` | `##002#` |
| **BSNL Mobile** | `*67*[DID]#` | `*61*[DID]#` | `*21*[DID]#` | `*#61#` | `##002#` |
| **Tata Tele (Smartflo)**| Admin portal forward | Admin portal forward | Admin portal forward | Portal check | Toggle in portal |

#### Carrier Charges & Disclosure
- **Billing Notice:** Forwarded minutes are treated by Indian telecom operators as standard outgoing minutes from the business's SIM card. Under modern unlimited recharge packs (Airtel, Jio, Vi), forwarded minutes consume standard plan allowances without additional per-call surcharge.
- **Rollback Procedure:** Dialing `##002#` (or `*402` on Reliance Jio), or toggling off Call Forwarding in handset settings, immediately restores handset-only ringing.

---

### Path 2: Enterprise SIP Trunk / Cloud PBX
**Target User:** Multi-agent brokerages and contact centers with existing enterprise telephony (Tata Tele Business Services Smartflo, Exotel, Twilio, Asterisk, or FreePBX).

#### How It Works
1. InsurCall provisions a secure SIP endpoint: `sip:sip.insurcall.ai:5061`.
2. The agency registers their SIP trunk using IP whitelist authorization and digest credentials.
3. Inbound calls to the agency's existing DID are forwarded via SIP INVITE directly into the InsurCall LiveKit SIP bridge.
4. Supports G.711u, G.711a, and Opus audio codecs over TLS transport.

---

### Path 3: Dedicated Hosted Indian Number (+91 DID)
**Target User:** New agencies establishing an institutional presence who require a fresh virtual landline (011 / 022 / 080) or national toll-free (1800) number.

#### Regulatory & KYC Requirements
- In compliance with the Department of Telecommunications (DoT) Access Services and Virtual Network Operator (VNO) directives, virtual Indian DIDs cannot be provisioned anonymously.
- Business KYC is mandatory:
  1. Certificate of Incorporation / Partnership Deed / Udyam Registration.
  2. Agency Goods and Services Tax Identification Number (GSTIN).
  3. Authorized Signatory Identity Proof (Aadhaar / PAN / Passport).
  4. Physical office address verification for telecom circle assignment.

---

## 3. Strict Separation of Inbound and Outbound Calling

InsurCall strictly separates inbound reception from outbound call origination to prevent caller ID spoofing and comply with TRAI regulations.

### Inbound Calling Verification
- Verifies carrier routing is active.
- Resolves normalized destination DID to the authenticated tenant and assigned agent.
- Caller ID is preserved from the carrier SIP signaling (`P-Asserted-Identity` or `From` header).
- AI agent announces its automated nature and answers queries using grounded RAG knowledge.

### Outbound Calling Security Controls
- **Anti-Spoofing Rule:** Businesses CANNOT use arbitrary mobile numbers as outbound caller ID without cryptographic or provider authorization proof.
- **DND (Do Not Disturb) Registry:** Outbound calls to Indian mobile numbers must cross-reference TRAI National Customer Preference Register (NCPR) unless express written consent exists.
- **Destinations:** Outbound calling is restricted to verified Indian E.164 numbers (`+91XXXXXXXXXX`). International, premium rate, and short-code destinations are blocked at the gateway boundary.
- **Concurrency & Budget Limits:** Enforces tenant-level concurrency limits (e.g., maximum 5 simultaneous calls on Starter tier) to prevent toll fraud.

---

## 4. Indian Regulatory Compliance (DoT & TRAI)

### Department of Telecommunications (DoT) Guidelines
- **Software vs Telecom Operator Boundary:** InsurCall operates as an Application Service Provider (ASP) integrated with licensed Telecom Service Providers (TSPs) and Virtual Network Operators (VNOs). InsurCall does not sell unauthorized PSTN switching services.
- **PSTN to VoIP Interconnect:** Under DoT Unified License (UL) Clause 2.2, direct routing between public PSTN and private VoIP networks without traversing a licensed telecom gateway is prohibited. InsurCall terminates all telephone audio via licensed partner gateways (Tata Tele / Exotel / Airtel Enterprise).
- **CLI Preservation:** Original calling party numbers must not be modified or stripped during forwarding.

### TRAI Call Recording & Privacy Mandate
- In accordance with the Digital Personal Data Protection (DPDP) Act and TRAI directives, callers must be informed if a voice session is processed or recorded.
- InsurCall agents announce automated assistance within the opening 5 seconds of call arrival: *"Hello! I am Anya, an AI assistant for [Agency Name]. How may I help you today?"*

---

## 5. Durable Phone Number State Machine

Every phone number in InsurCall traverses a strictly validated lifecycle stored in the `phone_numbers` table:

```
[NOT_CONFIGURED]
       |
       v
[SETUP_PENDING] --------> (Dial carrier MMI code on mobile phone)
       |
       v
[VERIFICATION_PENDING] -> (Carrier network acknowledges forwarding)
       |
       v
 [CONFIGURED] -----------> (Simulate test call with agent voice synthesis)
       |
       v
   [TESTING] ------------> (Click Activate AI Receptionist)
       |
       v
    [ACTIVE] ------------> (Receives live production customer calls)
       |
       +-----------------> [DISCONNECTED] (Rollback via ##002# or *402)
       |
       +-----------------> [SUSPENDED]    (Billing or compliance hold)
```

### Database Schema Enforcement
- **Multi-Tenant RLS:** Both `phone_numbers` and `telephony_connections` have PostgreSQL Row Level Security enabled. Policies ensure `tenant_id` matches the authenticated Clerk member's organization.
- **Uniqueness Constraint:** `UNIQUE (tenant_id, phone_number)` ensures no tenant can register duplicate numbers, while distinct tenants cannot claim the same provider DID simultaneously.
- **Audit Logging:** Every state transition (`PHONE_NUMBER_CONFIGURED`, `PHONE_VERIFICATION_CONFIRMED`, `PHONE_TEST_CALL_COMPLETED`, `PHONE_NUMBER_ACTIVATED`, `PHONE_NUMBER_DISCONNECTED`) is recorded in `audit_logs` with actor ID and timestamp.

---

## 6. Telephony Inbound Webhook Specification

### Endpoint
`POST /api/webhooks/telephony`

### Security
- Verified using HMAC-SHA256 signature in `x-telephony-signature` or bearer gateway token.
- Raw payload is matched against normalized E.164 destination numbers.

### Processing Pipeline
1. Inbound request arrives from carrier gateway containing `To` (dialed DID) and `From` (caller mobile).
2. InsurCall executes database lookup on `phone_numbers` matching `phone_number = To` OR `forwarding_config->>'routingDid' = To`.
3. If number is not `ACTIVE` or `TESTING`, the gateway returns HTTP 403 with carrier rejection announcement.
4. If valid, InsurCall creates a live session in `call_sessions` table with tenant isolation.
5. Returns LiveKit SIP bridge dispatch instructions:
   ```json
   {
     "status": "accepted",
     "callSid": "tel_1730000000000",
     "tenantId": "c0000000-0000-0000-0000-000000000001",
     "phoneNumberId": "d0000000-0000-0000-0000-000000000001",
     "roomName": "tel_1730000000000",
     "routing": {
       "type": "livekit_sip_bridge",
       "sipUri": "sip:tel_1730000000000@livekit.insurcall.ai",
       "callerIdPreserved": true
     }
   }
   ```

---

## 7. Manual Acceptance Test Procedure (Step-by-Step)

For agency owners and QA engineers verifying a live connection:

### Step 1: Business Registration
1. Open InsurCall and sign in via Clerk.
2. In the navigation sidebar, click **Phone & Telephony**.

### Step 2: Configure Call Forwarding
1. Click **Connect Business Number**.
2. Select your mobile carrier: **Bharti Airtel**, **Reliance Jio**, **Vodafone Idea**, or **BSNL**.
3. Enter your 10-digit mobile number (e.g. `9876543210`).
4. Select forwarding mode: **When Busy or Unanswered**.
5. Click **Generate Activation Code**.

### Step 3: Dial Carrier Code
1. On your mobile phone, open the dialer app.
2. Enter the generated MMI code:
   - For Airtel / Vi: `*67*+918047361829#`
   - For Jio: `*401*+918047361829`
3. Press **Call**. Wait for the screen notification: *"Call forwarding when busy: Registration was successful."*

### Step 4: Verify Carrier Connection
1. In the InsurCall dashboard, click **Verify Connection**.
2. Status updates to **Carrier Forwarded** (`CONFIGURED`).

### Step 5: Execute Test Call
1. Click **Run Test Call**.
2. The system executes a simulated audio session connecting the agent's greeting and RAG retrieval.
3. Review audio synthesis latency (typically 120ms to 240ms) and verified agent greeting.
4. Status transitions to **Ready for Activation** (`TESTING`).

### Step 6: Activate Live Calling
1. Click **Activate Live Agent**.
2. Status updates to **Active (Live)** (`ACTIVE`).
3. Place a real call to your mobile number from another phone and decline the call. Confirm that the InsurCall AI receptionist answers and greets the caller.

### Step 7: Rollback / Deactivation
1. When testing is complete or if you wish to pause the AI assistant, click **Disconnect**.
2. Dial `##002#` (or `*402` on Jio) on your mobile handset to disable forwarding.
