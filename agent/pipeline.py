"""
SaveCall Voice Pipeline
Integrates Groq / Faster-Whisper (STT), Groq Llama 3.3 / Qwen 2.5 (LLM), and Edge-TTS / Piper (TTS).
"""

import os
import uuid
import logging
import edge_tts
from livekit.agents import tts, APIConnectOptions
from livekit.plugins import silero, openai, groq

logger = logging.getLogger("savecall-pipeline")

STT_BASE_URL = os.environ.get("STT_BASE_URL", "http://localhost:9000/v1")
STT_MODEL = os.environ.get("STT_MODEL", "Systran/faster-whisper-medium")

LLM_BASE_URL = os.environ.get("LOCAL_LLM_BASE_URL", os.environ.get("LLM_BASE_URL", "http://localhost:11434"))
LLM_MODEL = os.environ.get("LLM_MODEL", "qwen2.5:7b")

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")

TTS_VOICE = os.environ.get("TTS_VOICE", "en-IN-NeerjaNeural")
TTS_BASE_URL = os.environ.get("TTS_BASE_URL", "http://localhost:8888")
TTS_MODEL = os.environ.get("TTS_MODEL", "en_US-lessac-medium")

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
    if GROQ_API_KEY:
        try:
            logger.info("Initializing Groq Whisper STT")
            return groq.STT(model="whisper-large-v3-turbo", api_key=GROQ_API_KEY)
        except Exception as e:
            logger.warning(f"Groq STT initialization notice: {e}. Falling back to local STT...")
    
    logger.info(f"Connecting STT to {STT_BASE_URL} ({STT_MODEL})")
    return openai.STT(
        base_url=STT_BASE_URL,
        model=STT_MODEL,
        api_key="none"
    )

def create_llm():
    if GROQ_API_KEY:
        try:
            logger.info(f"Initializing Groq LLM ({GROQ_MODEL})")
            return groq.LLM(model=GROQ_MODEL, api_key=GROQ_API_KEY)
        except Exception as e:
            logger.warning(f"Groq LLM initialization notice: {e}. Falling back to Ollama...")

    # Fallback to Local Ollama
    ollama_v1 = f"{LLM_BASE_URL.rstrip('/')}/v1"
    logger.info(f"Connecting LLM to Ollama at {ollama_v1} ({LLM_MODEL})")
    return openai.LLM(
        base_url=ollama_v1,
        model=LLM_MODEL,
        api_key="ollama"
    )

def create_tts():
    try:
        logger.info(f"Initializing EdgeTTS (voice: {TTS_VOICE})")
        return EdgeTTS(voice=TTS_VOICE)
    except Exception as e:
        logger.warning(f"EdgeTTS init failed: {e}. Attempting OpenAI/Piper fallback...")
        tts_v1 = f"{TTS_BASE_URL.rstrip('/')}/v1"
        return openai.TTS(
            base_url=tts_v1,
            model=TTS_MODEL,
            api_key="none"
        )
