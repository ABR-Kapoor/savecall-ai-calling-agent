# SaveCall AI Calling Agent (Missed Call Blue)

> **Next-Generation Autonomous Voice Receptionist & Policy Care Agent**  
> Answers missed calls, automates customer care, verifies claims and policies, schedules appointments, and conducts natural, empathetic phone conversations in **Hindi, English, and Hinglish** with sub-250ms conversational response latency.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [System Architecture](#-system-architecture)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#1-installation)
  - [Environment Configuration](#2-environment-configuration)
  - [Running Locally with HTTPS](#3-running-locally-with-https)
- [Voice Calling & Microphone Security](#-voice-calling--microphone-security)
- [Hybrid LLM & Knowledge Base Engine](#-hybrid-llm--knowledge-base-engine)
- [Telephony & Asterisk Integration](#-telephony--asterisk-integration)
- [API Reference](#-api-reference)
- [Vercel & Production Deployment](#-vercel--production-deployment)
- [Project Structure](#-project-structure)
- [Security & Privacy](#-security--privacy)

---

## 🌟 Overview

SaveCall AI (`missed-call-blue`) solves the missed-call problem for insurance providers, clinics, agencies, and businesses. When a customer calls or enters the voice portal:
1. The AI voice agent answers immediately with an authenticated, personalized greeting.
2. It looks up their active policy coverages, claim statuses, and previous appointments in real time.
3. It listens continuously to their speech, processes intent with high-speed LLM reasoning, and responds naturally through voice.
4. If sensitive modifications are requested (nominee changes, phone updates), it executes a 4-tier security verification workflow with simulated OTP authorization.

---

## 🏗 System Architecture

```text
               +-------------------------------------------------------------+
               |                  Caller / User Interface                     |
               |   • Smartphone WebRTC / Web Speech In-Call HUD             |
               |   • Real-Time Audio Waves, Live Captions, Interactive Keypad|
               +------------------------------+------------------------------+
                                              |
                   HTTPS (Secure Context)    |   Microphone Audio Streams
                                              v
               +-------------------------------------------------------------+
               |              TanStack Start Full-Stack Server               |
               |                                                             |
               |  [/api/voice/session]       [/api/voice/chat]               |
               |  • Token Authentication    • Dynamic System Prompt Builder |
               |  • Customer Auto-Provision • Spoken Text Sanitizer          |
               +--------------+------------------------------+---------------+
                              |                              |
               +--------------v---------------+              |
               |      LiveKit Media Gateway   |              |
               |  • WebRTC Audio Tracks       |              |
               |  • Native Audio Fallback     |              |
               +------------------------------+              |
                                                             |
                               +-----------------------------+
                               |
                               v
               +-------------------------------------------------------------+
               |                 Hybrid AI Inference Engine                  |
               |                                                             |
               |  Primary (Cloud): Groq Cloud (qwen/qwen3.8-27b ~240ms)      |
               |  Fallback (Cloud): Groq Cloud (openai/gpt-oss-120b)          |
               |  Offline (Local): Ollama (qwen2.5:7b @ 127.0.0.1:11434)     |
               +------------------------------+------------------------------+
                                              |
                                              v
               +-------------------------------------------------------------+
               |             InsForge / PostgreSQL Knowledge DB              |
               |  • Tenants, Agent Personas, Policies, Claims, Audit Logs    |
               |  • Approved Knowledge Base Items (FAQs & Business Rules)    |
               +-------------------------------------------------------------+
```

---

## ⚡ Key Features

- **Sub-250ms Voice Latency:** Powered by Groq Cloud LPUs running `qwen/qwen3.8-27b` with automatic failover to `openai/gpt-oss-120b` and local Ollama (`qwen2.5:7b`).
- **HTTPS Microphone Secure Context:** Pre-configured with `@vitejs/plugin-basic-ssl` to ensure modern browsers (Chrome, Edge, Safari) grant immediate, unblocked microphone and Web Speech API access.
- **Fail-Safe Calling Resilience:** Decoupled architecture ensures calls never drop prematurely due to remote network timeouts—the call stays active until the user explicitly taps **End Call**.
- **Dynamic Persona & Knowledge Training:** The agent dynamically trains its system prompt from your database settings, company policy guidelines, FAQs, and customer profiles.
- **Interactive Smartphone HUD:** Includes an animated voice aura with pulsing ripple rings, real-time waveform equalizer, live dual-turn captions, quick prompt chips, and a classic 2x3 phone keypad.
- **Multilingual Spoken Fluidity:** Naturally handles Hindi, English, and Hinglish, switching languages smoothly based on caller cues.
- **Telephony & PBX Ready:** Asterisk configuration files, SIP extensions, and webhook receivers included for incoming telephone calls.

---

## 💻 Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) + [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) + Lucide Icons + Radix UI Primitives
- **Voice & Media:** LiveKit Client (`@livekit/components-react`), Web Audio API, Web Speech API (`SpeechRecognition`, `speechSynthesis`)
- **AI & LLM:** Groq Cloud SDK / REST API, Ollama Local Runtime
- **Database & Auth:** InsForge SDK / PostgreSQL, Clerk Authentication
- **Deployment:** Vercel (Edge/Serverless) + Docker Compose (Self-hosted)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js:** `v20.x` or `v22.x`+ installed
- **npm** or **pnpm**
- *(Optional for local AI):* [Ollama](https://ollama.com/) running locally with `ollama run qwen2.5:7b`

---

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/ABR-Kapoor/savecall-ai-calling-agent.git
cd savecall-ai-calling-agent
npm install
```

---

### 2. Environment Configuration

Copy the template environment file:

```bash
cp .env.example .env
```

Open `.env` and fill in your keys:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `GROQ_API_KEY` | Groq Cloud API Key | `gsk_...` |
| `GROQ_MODEL` | Fast Voice LLM Model | `qwen/qwen3.8-27b` |
| `LOCAL_LLM_BASE_URL` | Local Ollama Endpoint | `http://localhost:11434` |
| `LLM_MODEL` | Local LLM Model Name | `qwen2.5:7b` |
| `LLM_MODE` | Hybrid Routing Mode | `hybrid` *(or `groq`, `local`)* |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk Auth Public Key | `pk_test_...` |
| `CLERK_SECRET_KEY` | Clerk Auth Secret Key | `sk_test_...` |
| `DATABASE_URL` | PostgreSQL Connection URI | `postgresql://postgres:...` |
| `INSFORGE_PROJECT_ID` | InsForge Project ID | `your_project_id` |
| `INSFORGE_API_KEY` | InsForge Secret API Key | `ik_...` |
| `LIVEKIT_URL` | LiveKit Server WebSocket | `ws://localhost:7880` |

---

### 3. Running Locally with HTTPS

Start the development server:

```bash
npm run dev
```

The server starts over **HTTPS**:
```text
  ➜  Local:   https://localhost:5173/
  ➜  Network: https://192.168.x.x:5173/
```

1. Open **`https://localhost:5173/voice`** in your browser.
2. If prompted by your browser regarding the local self-signed certificate, click **Advanced → Proceed to localhost**.
3. Click **Allow** on the browser microphone permission popup.
4. Click **Start Call** to begin talking with the AI receptionist!

---

## 🎙 Voice Calling & Microphone Security

Modern browsers (Google Chrome, Edge, Safari, Firefox) restrict `navigator.mediaDevices.getUserMedia` and the Web Speech API exclusively to **Secure Contexts (HTTPS or localhost)**. 

### How SaveCall Handles Audio
1. **Zero-Configuration HTTPS:** Vite uses `@vitejs/plugin-basic-ssl` to serve directly over HTTPS during development, avoiding insecure origin blocks.
2. **Dual-Layer Audio Engine:**
   - **LiveKit WebRTC Layer:** Connects to LiveKit voice rooms when available for high-fidelity audio streams.
   - **Browser HD Voice Fallback:** If LiveKit is unreachable, the call seamlessly maintains communication using the browser's native Speech Recognition and High-Definition Speech Synthesis (`en-IN-NeerjaNeural` / Indian English voices).
3. **Punctuation Sanitizer:** Incoming LLM responses are cleaned to strip markdown syntax (`**`, `###`, bullets, `<think>` reasoning tags) before text-to-speech synthesis to ensure speech flows like a real human.

---

## 🧠 Hybrid LLM & Knowledge Base Engine

The conversation logic in [`/src/routes/api/voice/chat.ts`](src/routes/api/voice/chat.ts) employs an intelligent multi-tiered fallback architecture:

```text
Caller Spoken Query
        │
        ▼
   [Is Query Sensitive?] ───(Yes)───► Try Local Ollama First
        │
        ▼ (No)
   Groq Cloud (qwen/qwen3.8-27b)  [~240ms latency]
        │ (If unavailable or timeout)
        ▼
   Groq Cloud (openai/gpt-oss-120b) [~600ms latency]
        │ (If network drops)
        ▼
   Local Ollama (qwen2.5:7b) [100% offline fallback]
```

### Dynamic System Prompt Training
Every call dynamically pulls:
- **Tenant Persona:** Tone, speaking style, language preferences, and company name.
- **Approved Knowledge Base Items:** FAQs, coverage limits, policy conditions, and hospital networks.
- **Customer Identity:** Authenticated policyholder's active policies, sums insured, nominee information, and recent claim incident updates.

---

## 📞 Telephony & Asterisk Integration

For traditional phone network integration, the `telephony/` directory contains:
- **`extensions.conf`:** Dialplan configuration that routes inbound telephone calls to the SaveCall webhook.
- **`pjsip.conf`:** SIP trunk configuration for carrier termination (Twilio, Tata Tele, Airtel, Exotel).
- **`asterisk/conf/`:** Complete containerized Asterisk configuration templates.

Inbound telephony webhooks are processed at:
```http
POST /api/public/telephony
Content-Type: application/json

{
  "caller_number": "+919876543210",
  "call_id": "CALL-883921",
  "direction": "inbound"
}
```

---

## 📡 API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/voice/session` | `POST` | Generates a voice room session, assigns customer details, provisions policy records, and returns LiveKit access tokens. |
| `/api/voice/chat` | `POST` | Processes conversational queries through the trained hybrid LLM pipeline and returns spoken text with agent metadata. |
| `/api/public/telephony` | `POST` | Inbound telephony webhook receiver for PBX and SIP carriers. |

---

## ☁️ Vercel & Production Deployment

This project is configured for one-click deployment on **Vercel** with full TanStack Start serverless support:

1. Push your repository to GitHub.
2. In the [Vercel Dashboard](https://vercel.com/new), import your repository.
3. Vercel automatically detects the `vercel.json` build command (`npm run build`).
4. Add your production environment variables (`GROQ_API_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `DATABASE_URL`, etc.).
5. Click **Deploy**.

> **Note on Vercel Microphone:** When deployed to Vercel, the production URL automatically receives an SSL certificate (`https://your-domain.vercel.app`), guaranteeing full browser microphone permissions on all mobile and desktop devices.

---

## 📁 Project Structure

```text
├── src/
│   ├── components/
│   │   ├── app-shell.tsx              # Main dashboard shell & navigation
│   │   └── ui/                        # Reusable Radix UI design system
│   ├── routes/
│   │   ├── __root.tsx                 # Root layout with providers & Clerk Auth
│   │   ├── index.tsx                  # Public marketing & landing page
│   │   ├── voice.tsx                  # Full-screen smartphone voice call interface
│   │   ├── auth.tsx                   # Clerk sign-in / sign-up routing
│   │   ├── _authenticated/            # Protected agent management dashboard
│   │   │   ├── dashboard.tsx          # Real-time metrics, call volume & charts
│   │   │   ├── calls.tsx              # Call history, transcripts & audio playback
│   │   │   ├── train.tsx              # Knowledge base trainer & document upload
│   │   │   └── settings.tsx           # Voice persona, language & greeting setup
│   │   └── api/
│   │       ├── voice/
│   │       │   ├── session.ts         # Session generation & token minting
│   │       │   └── chat.ts            # Hybrid LLM voice inference engine
│   │       └── public/
│   │           └── telephony.ts       # SIP & PBX carrier webhook handler
│   ├── lib/
│   │   ├── insforge/                  # PostgreSQL client & database operations
│   │   └── utils.ts                   # Class variance authority & formatting helpers
│   ├── router.tsx                     # TanStack Router tree instantiation
│   └── styles.css                     # Tailwind CSS v4 styling rules
├── telephony/                         # Asterisk PBX dialplans and SIP trunks
├── vercel.json                        # Vercel deployment configuration
├── vite.config.ts                     # Vite config with HTTPS basicSsl plugin
└── .env.example                       # Sanitized environment template
```

---

## 🔒 Security & Privacy

- **Zero Secrets in Repository:** Code is pre-sanitized with zero hardcoded API keys. All credentials reside strictly in local `.env` files protected by `.gitignore`.
- **4-Tier Data Protection:** High-risk actions (modifying registered phone numbers, emails, or policy nominees) require secondary OTP verification.
- **Offline Privacy Mode:** Sensitive queries can be routed to local Ollama models (`LLM_MODE=local`) to prevent PII from leaving the local infrastructure.
- **Role-Based Access Control:** Customer database access is scoped by tenant IDs with PostgreSQL row-level security.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
