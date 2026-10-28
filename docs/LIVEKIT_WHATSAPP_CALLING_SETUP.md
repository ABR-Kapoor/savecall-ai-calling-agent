# InsurCall LiveKit Cloud x WhatsApp Business Calling Setup Guide

## Overview
InsurCall integrates two-way WhatsApp Business voice calling using the official **LiveKit Cloud Telephony WhatsApp Connector** and **Meta WhatsApp Cloud API**. This document defines every environment variable, the process consuming it, and the step-by-step configuration required in the Meta Developer Console and LiveKit Cloud.

---

## 1. Environment Variable Reference

| Variable Name | Required Scope | Consuming Process | Description |
| :--- | :--- | :--- | :--- |
| `LIVEKIT_URL` | Server / Agent | Node.js Backend (`livekit-server-sdk`), Python Agent (`agent.py`) | LiveKit Cloud WebSocket URL (`wss://<project>.livekit.cloud`). Must point to LiveKit Cloud for Telephony connectors. |
| `LIVEKIT_API_KEY` | Server / Agent | Node.js Backend, Python Agent | LiveKit Cloud project API key. Never expose to frontend bundles. |
| `LIVEKIT_API_SECRET` | Server / Agent | Node.js Backend, Python Agent | LiveKit Cloud project API secret. Kept strictly on the server. |
| `LIVEKIT_WHATSAPP_AGENT_NAME` | Server | Node.js Backend | The registered worker agent name dispatched into the call room (default: `insurcall-voice-agent`). |
| `WHATSAPP_CLOUD_API_VERSION` | Server | Node.js Backend (`meta-whatsapp.ts`) | Meta Graph API version for WhatsApp Cloud Calling (e.g. `26.0`). |
| `WHATSAPP_BUSINESS_PHONE_NUMBER_ID` | Server | Node.js Backend | The 15-digit WhatsApp Business Phone Number ID from the Meta Developer Dashboard. |
| `WHATSAPP_ACCESS_TOKEN` | Server | Node.js Backend | System User Access Token with `whatsapp_business_messaging` and calling permissions. Never return to client. |
| `META_APP_SECRET` | Server | Node.js Backend | Meta App Secret used for HMAC-SHA256 signature verification of webhook payloads. |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Server | Node.js Backend | Secret string provided to Meta during the GET webhook verification challenge. |
| `WHATSAPP_CALLING_ENABLED` | Server | Node.js Backend | Global emergency feature gate (defaults to `false`). |
| `WHATSAPP_INBOUND_CALLS_ENABLED` | Server | Node.js Backend | Feature gate for accepting customer-initiated WhatsApp voice calls (defaults to `false`). |
| `WHATSAPP_OUTBOUND_CALLS_ENABLED` | Server | Node.js Backend | Feature gate for staff-initiated outbound WhatsApp calls (defaults to `false`). |
| `WHATSAPP_CALL_TEST_MODE` | Server | Node.js Backend | When `true`, restricts calls to `WHATSAPP_ALLOWED_TEST_RECIPIENTS` to prevent unintended live calls. |
| `WHATSAPP_ALLOWED_TEST_RECIPIENTS` | Server | Node.js Backend | Comma-separated list of E.164 phone numbers permitted for outbound test calls in test mode. |
| `WHATSAPP_DESTINATION_COUNTRY` | Server | Node.js Backend | Default ISO 3166-1 alpha-2 destination country code (e.g. `IN`). |
| `PUBLIC_API_BASE_URL` | Server | Node.js Backend | Publicly accessible HTTPS base URL of the InsurCall deployment for receiving Meta webhooks. |

---

## 2. Security Boundaries & Zero-Trust Rules
1. **No Secret Leakage**:
   - `LIVEKIT_API_SECRET`, `WHATSAPP_ACCESS_TOKEN`, and `META_APP_SECRET` reside on the server only.
   - Client tokens issued by `/api/voice/session` carry minimal required grants and expire in 10 minutes.
   - SDP offers/answers and authorization tokens are strictly omitted from standard application logs.
2. **Server-Side Authorization**:
   - Outbound calling requires valid Clerk authentication, verified tenant membership, recipient contact verification, and active feature gates.
   - Webhook calls are cryptographically verified with HMAC-SHA256 before any room dispatch.
3. **Fail-Closed by Default**:
   - All calling feature flags default to `false`. An explicit admin action in Settings is required to enable calling.
4. **Idempotent Webhook Processing**:
   - Every Meta webhook event is claimed with a unique event key (`meta_event:<call_id>:<event_type>`) in PostgreSQL before execution to prevent duplicate agent dispatch or duplicate call sessions.

---

## 3. Meta Developer Console Configuration

1. **Meta App Setup**:
   - Navigate to [developers.facebook.com](https://developers.facebook.com) -> My Apps -> Your App.
   - Ensure the **WhatsApp** product is added to your app.
2. **Webhook Registration**:
   - Navigate to WhatsApp -> Configuration -> Webhook.
   - Set **Callback URL** to: `https://<YOUR_DEPLOYED_DOMAIN>/api/webhooks/meta-whatsapp`
   - Set **Verify Token** to match `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in your server `.env`.
   - Click **Verify and Save**. Meta will send a GET handshake with `hub.mode=subscribe`.
3. **Webhook Subscriptions**:
   - Subscribe to the **`messages`** and **`voice_calls`** / **`calls`** webhook fields.
4. **Phone Number & Access Token**:
   - Under WhatsApp -> API Setup, copy the **Phone number ID** into `WHATSAPP_BUSINESS_PHONE_NUMBER_ID`.
   - Under App settings -> Basic, copy the **App Secret** into `META_APP_SECRET`.
   - Generate a permanent System User Access Token with `whatsapp_business_messaging` and `whatsapp_business_management` permissions, and set it as `WHATSAPP_ACCESS_TOKEN`.

---

## 4. LiveKit Cloud Configuration

1. **LiveKit Cloud Project**:
   - Sign in to [cloud.livekit.io](https://cloud.livekit.io).
   - Copy your Project URL (`wss://<project>.livekit.cloud`) into `LIVEKIT_URL`.
   - Under Settings -> Keys, generate an API Key and Secret, and set `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`.
2. **Telephony Connector Enablement**:
   - LiveKit Cloud projects have native support for WhatsApp Connectors (`livekit.Connector` service).
   - The connector uses `AcceptWhatsAppCall`, `DialWhatsAppCall`, `ConnectWhatsAppCall`, and `DisconnectWhatsAppCall`.
3. **Voice Agent Dispatch**:
   - The Python voice agent runs with worker options connecting to `LIVEKIT_URL`.
   - When an inbound WhatsApp call is accepted, LiveKit dispatches the agent registered under `LIVEKIT_WHATSAPP_AGENT_NAME` directly into the room.

---

## 5. Testing & Validation Workflow
1. **Mocked Automated Test**:
   - Run `node scripts/test-livekit-whatsapp-calling.mjs` to test signature verification, inbound call acceptance, idempotency deduplication, and outbound permission gates with test doubles.
2. **Safe Diagnostics Check**:
   - Navigate to InsurCall UI -> **Phone & Calling** (`/phone`) or **Settings -> Channels -> WhatsApp Business Calling**.
   - Review the automated configuration checklist (verifies environment variables, webhook route accessibility, agent status, and feature flags).
3. **Live Inbound Test**:
   - Place a voice call on WhatsApp from a mobile device to the configured WhatsApp Business number.
   - InsurCall validates the webhook, establishes the WebRTC room, dispatches the voice agent, and plays the company greeting.
