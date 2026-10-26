"""
SaveCall LiveKit AI Voice Agent: Secure Tool Layer
Connects to self-hosted LiveKit rooms, performs real-time full-duplex conversational audio
with sub-30ms Silero VAD barge-in/interruption, and dispatches authorized insurance tools.
"""

import asyncio
import json
import logging
import os
from dotenv import load_dotenv

from livekit import rtc
from livekit.agents import (
    Agent,
    AgentSession,
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    llm,
)
from livekit.plugins import silero

from pipeline import (
    INSURANCE_SYSTEM_PROMPT,
    create_vad,
    create_stt,
    create_llm,
    create_tts,
    TTS_BASE_URL,
)
from tools import execute_remote_tool

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("savecall-agent")

LIVEKIT_URL = os.environ.get("LIVEKIT_URL", "ws://127.0.0.1:7880")
LIVEKIT_API_KEY = os.environ.get("LIVEKIT_API_KEY", "devkey")
LIVEKIT_API_SECRET = os.environ.get("LIVEKIT_API_SECRET", "secret")

async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting to room: {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Wait for the customer participant to join
    participant = await ctx.wait_for_participant()
    logger.info(f"Customer joined: {participant.identity} with metadata: {participant.metadata}")

    # Extract non-sensitive session metadata securely attached at token generation
    metadata = {}
    try:
        if participant.metadata:
            metadata = json.loads(participant.metadata)
    except Exception as e:
        logger.warning(f"Could not parse participant metadata: {e}")

    session_id = metadata.get("voice_session_id", "demo-session")
    tenant_id = metadata.get("tenant_id", "a0000000-0000-0000-0000-000000000001")
    agent_id = metadata.get("agent_id", "")
    customer_id = metadata.get("customer_id", "c0000000-0000-0000-0000-000000000001")
    customer_name = metadata.get("customer_name") or participant.name or "Policyholder"
    customer_number = metadata.get("customer_number", "")
    customer_email = metadata.get("customer_email", "")

    # Fetch dynamic company knowledge base, tone, and greeting from database
    company_name = "SafeLife Insurance Co."
    custom_system_prompt = ""
    knowledge_base = ""
    greeting_template = "Hello {{customer_name}}! Welcome to {{company_name}} assistance. How may I help you with your policies or claims today?"

    try:
        cfg_resp = await execute_remote_tool(session_id, tenant_id, customer_id, "get_agent_config", {})
        if cfg_resp.get("ok"):
            company_name = cfg_resp.get("company_name", company_name)
            b_cfg = cfg_resp.get("branding_config", {})
            agent_cfg = b_cfg.get("agent_config", {}) if isinstance(b_cfg, dict) else {}
            custom_system_prompt = agent_cfg.get("system_prompt", "")
            knowledge_base = agent_cfg.get("knowledge_base", "")
            greeting_template = agent_cfg.get("greeting", greeting_template)

            db_cust = cfg_resp.get("customer")
            if db_cust and isinstance(db_cust, dict):
                customer_name = db_cust.get("name") or customer_name
                customer_number = db_cust.get("customer_number") or customer_number
                customer_email = db_cust.get("email") or customer_email
            logger.info(f"Loaded dynamic agent config for {company_name} - Caller: {customer_name}")
    except Exception as e:
        logger.warning(f"Could not load dynamic agent config: {e}")

    vad = create_vad()
    stt = create_stt()
    ai_llm = create_llm()
    
    tts = None
    try:
        tts = create_tts()
    except Exception as e:
        logger.warning(f"TTS not available: {e}")

    logger.info(f"Agent initialized for session {session_id} under tenant {tenant_id} - Customer: {customer_name}")

    @llm.function_tool
    async def get_policy(policy_number: str = "") -> str:
        """Fetch policy details, status, and premium due date for the authenticated caller."""
        res = await execute_remote_tool(session_id, tenant_id, customer_id, "get_policy", {"policy_number": policy_number})
        return json.dumps(res)

    @llm.function_tool
    async def get_claim_status(claim_number: str = "") -> str:
        """Fetch submitted claim status and settlement details for the caller."""
        res = await execute_remote_tool(session_id, tenant_id, customer_id, "get_claim_status", {"claim_number": claim_number})
        return json.dumps(res)

    @llm.function_tool
    async def send_otp(purpose: str) -> str:
        """Send an email verification code for security before performing sensitive updates."""
        res = await execute_remote_tool(session_id, tenant_id, customer_id, "send_otp", {"purpose": purpose})
        return json.dumps(res)

    @llm.function_tool
    async def verify_otp(otp_code: str) -> str:
        """Verify the 6-digit OTP code spoken by the customer."""
        res = await execute_remote_tool(session_id, tenant_id, customer_id, "verify_otp", {"otp_code": otp_code})
        return json.dumps(res)

    @llm.function_tool
    async def update_contact_details(email: str = "", phone: str = "") -> str:
        """Update the customer's email or phone number. Requires verified OTP."""
        res = await execute_remote_tool(session_id, tenant_id, customer_id, "update_contact_details", {"email": email, "phone": phone})
        return json.dumps(res)

    @llm.function_tool
    async def change_nominee(policy_number: str, nominee_name: str, relationship: str) -> str:
        """Submit a nominee change request for human approval. Requires verified OTP."""
        res = await execute_remote_tool(session_id, tenant_id, customer_id, "change_nominee", {
            "policy_number": policy_number,
            "nominee_name": nominee_name,
            "relationship": relationship,
        })
        return json.dumps(res)

    @llm.function_tool
    async def cancel_policy(policy_number: str, reason: str) -> str:
        """Submit a policy cancellation / surrender request for retention officer review. Requires verified OTP."""
        res = await execute_remote_tool(session_id, tenant_id, customer_id, "cancel_policy", {
            "policy_number": policy_number,
            "reason": reason,
        })
        return json.dumps(res)

    @llm.function_tool
    async def search_policy_docs(query: str) -> str:
        """Search verified policy documents and underwriting guidelines to answer customer questions."""
        res = await execute_remote_tool(session_id, tenant_id, customer_id, "search_policy_docs", {
            "query": query,
            "agent_id": agent_id,
        })
        return json.dumps(res)

    @llm.function_tool
    async def request_human_escalation(reason: str) -> str:
        """Escalate the conversation to a human supervisor or senior claims specialist."""
        res = await execute_remote_tool(session_id, tenant_id, customer_id, "request_human_escalation", {
            "reason": reason,
        })
        return json.dumps(res)

    tools = [
        get_policy,
        get_claim_status,
        search_policy_docs,
        request_human_escalation,
        send_otp,
        verify_otp,
        update_contact_details,
        change_nominee,
        cancel_policy,
    ]

    # Dynamically compose instructions incorporating company knowledge base
    dynamic_instructions = f"""You are SaveCall AI, the official voice assistant for {company_name}.
You are in a live phone call with policyholder {customer_name}.

COMPANY KNOWLEDGE BASE & PRODUCT GUIDELINES:
{knowledge_base if knowledge_base.strip() else "SafeLife provides comprehensive Health, Motor, and Life policies with instant claim filing and cashless hospital authorization."}

AGENT BEHAVIOR RULES & PERSONA:
{custom_system_prompt if custom_system_prompt.strip() else INSURANCE_SYSTEM_PROMPT}

AUTHENTICATED CALLER PROFILE:
- Name: {customer_name}
- Customer Number: {customer_number}
- Registered Email: {customer_email}
- Carrier: {company_name}

IMPORTANT OPERATIONAL RULES:
- Greet the caller warmly by their name ({customer_name}).
- When they inquire about policy or claim status, always call get_policy or get_claim_status tools.
- Never invent policy numbers. Use their actual active policies retrieved through tools.
- For sensitive updates (nominee change, cancellation, contact change), verify their identity via send_otp and verify_otp.
- Speak naturally and keep voice replies concise (1 to 2 sentences per turn).
"""

    agent = Agent(
        instructions=dynamic_instructions,
        tools=tools,
    )

    session_kwargs = {
        "vad": vad,
        "stt": stt,
        "llm": ai_llm,
        "turn_detection": "vad",
        "allow_interruptions": True,
        "min_endpointing_delay": 0.5,
        "max_endpointing_delay": 2.5,
    }
    if tts:
        session_kwargs["tts"] = tts

    session = AgentSession(**session_kwargs)
    await session.start(agent, room=ctx.room)
    logger.info(f"SaveCall voice session started with local VAD turn detection for {customer_name}")

    # Hook real-time conversation item additions to stream transcript to client
    orig_item_added = getattr(session, "_conversation_item_added", None)
    if orig_item_added:
        def custom_item_added(item, *args, **kwargs):
            try:
                orig_item_added(item, *args, **kwargs)
            except Exception as e:
                logger.warning(f"Item add notice: {e}")
            try:
                role = getattr(item, "role", "agent")
                text = item.text_content if hasattr(item, "text_content") else getattr(item, "text", str(item))
                if text and role in ["user", "assistant", "agent"]:
                    normalized_role = "user" if role == "user" else "agent"
                    packet = json.dumps({"type": "transcript", "role": normalized_role, "text": text}).encode("utf-8")
                    asyncio.create_task(ctx.room.local_participant.publish_data(packet))
            except Exception as e:
                logger.warning(f"Broadcast transcript notice: {e}")
        session._conversation_item_added = custom_item_added

    # Listen for text prompts sent from caller UI
    @ctx.room.on("data_received")
    def on_data_received(data_packet):
        try:
            payload = json.loads(data_packet.data.decode("utf-8"))
            if payload.get("type") == "user_query" and payload.get("text"):
                query_text = payload["text"]
                logger.info(f"Received caller prompt: {query_text}")
                asyncio.create_task(session.generate_reply(user_input=query_text))
        except Exception as e:
            logger.warning(f"Data receive notice: {e}")

    # Initial greeting to caller using dynamic template
    try:
        await asyncio.sleep(0.5)
        greeting = greeting_template.replace("{{customer_name}}", customer_name).replace("{{company_name}}", company_name)
        if not greeting.strip():
            greeting = f"Hello {customer_name}! Welcome to {company_name}. How may I help you with your insurance policies or claims today?"

        logger.info(f"Dispatched greeting to caller: {greeting}")
        
        # Broadcast transcript to UI
        try:
            greeting_bytes = json.dumps({"type": "transcript", "role": "agent", "text": greeting}).encode("utf-8")
            await ctx.room.local_participant.publish_data(greeting_bytes)
        except Exception as err:
            logger.warning(f"Transcript broadcast notice: {err}")

        await session.say(greeting)
    except Exception as e:
        logger.error(f"Greeting dispatch error: {e}", exc_info=True)

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            ws_url=LIVEKIT_URL,
            api_key=LIVEKIT_API_KEY,
            api_secret=LIVEKIT_API_SECRET,
        )
    )
