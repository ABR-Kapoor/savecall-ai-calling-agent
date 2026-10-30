"""
SaveCall Voice Pipeline
Integrates Groq / Faster-Whisper (STT), Groq Llama 3.3 / Qwen 2.5 (LLM), and Edge-TTS / Piper (TTS).
"""

import os
import uuid
import logging
import edge_tts
from livekit.agents import tts, APIConnectOptions
from livekit.plugins import silero, groq
try:
    from livekit.plugins import openai
except ImportError:
    openai = None

logger = logging.getLogger("savecall-pipeline")

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")
AI_PROVIDER = os.environ.get("AI_PROVIDER", "auto").lower()

TTS_VOICE = os.environ.get("TTS_VOICE", "en-IN-NeerjaNeural")

INSURANCE_SYSTEM_PROMPT = """
You are SaveCall, a friendly, professional, empathetic, and secure AI voice receptionist for insurance policyholders.
You speak clearly in English, Hindi, or Hinglish based on the customer's language.

Key Rules:
1. Greet the caller warmly and let them know you can help with their policies, claim status, or updates.
2. You have tools to look up policies (get_policy), check claim status (get_claim_status), and process updates.
3. For changes like contact details, nominee updates, or cancellations:
   - Always inform the customer that an OTP verification is required for security.
   - Call send_otp with the appropriate purpose.
   - Wait for the customer to speak their OTP, then call verify_otp.
   - Read back the exact details and ask for explicit confirmation before submitting.
4. Keep spoken responses concise, natural, and conversational (1 to 3 short sentences per turn).
"""

class EdgeTTS(tts.TTS):
    def __init__(self, voice: str = TTS_VOICE):
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False),
            sample_rate=24000,
            num_channels=1,
        )
        self.voice = voice

    def synthesize(self, text: str, *, conn_options: APIConnectOptions = APIConnectOptions()) -> tts.ChunkedStream:
        return EdgeChunkedStream(tts=self, input_text=text, conn_options=conn_options, voice=self.voice)

class EdgeChunkedStream(tts.ChunkedStream):
    def __init__(self, *, tts: tts.TTS, input_text: str, conn_options: APIConnectOptions, voice: str):
        super().__init__(tts=tts, input_text=input_text, conn_options=conn_options)
        self.voice = voice

    async def _run(self, output_emitter: tts.AudioEmitter) -> None:
        output_emitter.initialize(
            request_id=str(uuid.uuid4()),
            sample_rate=24000,
            num_channels=1,
            mime_type="audio/mp3",
        )
        communicate = edge_tts.Communicate(self.input_text, self.voice)
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                output_emitter.push(chunk["data"])
        output_emitter.flush()

def create_vad():
    return silero.VAD.load()

def create_stt():
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is required for cloud speech recognition")
    logger.info("Initializing Groq Whisper STT")
    return groq.STT(model="whisper-large-v3-turbo", api_key=GROQ_API_KEY)

def create_llm():
    providers = {}
    if GROQ_API_KEY:
        providers["groq"] = groq.LLM(model=GROQ_MODEL, api_key=GROQ_API_KEY)
    if GEMINI_API_KEY and openai is not None:
        providers["gemini"] = openai.LLM(
            model=GEMINI_MODEL,
            api_key=GEMINI_API_KEY,
            base_url=f"{os.environ.get('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta').rstrip('/')}/openai",
        )

    if not providers:
        raise RuntimeError("Configure GROQ_API_KEY or GEMINI_API_KEY for cloud language inference.")

    preferred = AI_PROVIDER if AI_PROVIDER in providers else "groq" if "groq" in providers else "gemini"
    ordered = [providers[preferred]] + [provider for name, provider in providers.items() if name != preferred]
    if len(ordered) == 1:
        logger.info(f"Initializing {preferred.title()} Cloud LLM")
        return ordered[0]

    logger.info(f"Initializing {preferred.title()} Cloud LLM with provider failover")
    from livekit.agents import llm
    return llm.FallbackAdapter(llm=ordered, attempt_timeout=12.0, max_retry_per_llm=0)

def create_tts():
    logger.info(f"Initializing cloud Edge TTS (voice: {TTS_VOICE})")
    return EdgeTTS(voice=TTS_VOICE)
