# missed-call-blue

> **Universal AI Voice Receptionist & Policy Care Agent**  
> Answers missed calls, automates customer care, verifies claims and appointments, and speaks naturally in Hindi, English, and Hinglish.

---

## ⚡ Highlights

- **Full-Duplex WebRTC Calling:** LiveKit voice room integration with sub-30ms Silero VAD, interruptions, and browser audio synthesis fallback.
- **Microphone Security:** Runs in HTTPS mode via `@vitejs/plugin-basic-ssl` for native browser microphone and speech recognition access.
- **Hybrid AI Model Engine:** Groq Cloud (`openai/gpt-oss-120b`) for sub-300ms speed with local Ollama (`qwen2.5:7b`) fallback.
- **Dynamic Prompt & Knowledge Training:** Synchronizes agent persona, company policies, and FAQs directly from settings.
- **Vercel & Self-Hosted Ready:** Serverless deployment on Vercel or containerized on Linux Docker VMs.

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
*(Update `.env` with your Clerk, Groq, and LiveKit keys).*

### 3. Run Dev Server (HTTPS Enabled)
```bash
npm run dev
```

Visit **`https://localhost:5173/`** or **`https://localhost:5173/voice`** to start a live call.

---

## ☁️ Deploying on Vercel

1. Import this repository into [Vercel](https://vercel.com/new).
2. Configure environment variables matching `.env.example`.
3. Deploy — Vercel builds the project using `npm run build` and provision serverless functions via `vercel.json`.

---

## 📄 License
MIT License

