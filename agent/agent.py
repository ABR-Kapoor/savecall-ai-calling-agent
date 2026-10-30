"""
InsurCall LiveKit AI Voice Agent: Secure Tool Layer
Connects to LiveKit Cloud rooms, performs real-time full-duplex conversational audio
with sub-30ms Silero VAD barge-in/interruption, and dispatches authorized insurance tools.
"""

import asyncio
import json
import logging
import os
from dotenv import load_dotenv

load_dotenv()

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
    create_vad,
    create_stt,
    create_llm,
    create_tts,
)
from tools import execute_remote_tool

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("savecall-agent")

LIVEKIT_URL = os.environ.get("LIVEKIT_URL", "")
LIVEKIT_API_KEY = os.environ.get("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.environ.get("LIVEKIT_API_SECRET", "")
if not LIVEKIT_URL.startswith("wss://") or not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
    raise RuntimeError("Set LIVEKIT_URL (wss://), LIVEKIT_API_KEY, and LIVEKIT_API_SECRET for LiveKit Cloud")

async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting to room: {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Wait for the customer participant to join
    participant = await ctx.wait_for_participant()
    logger.info(f"Voice participant joined: {participant.identity}")

    # Resolve scope only from the server-created LiveKit agent dispatch.
    metadata = {}
    try:
        if ctx.job.metadata:
            metadata = json.loads(ctx.job.metadata)
    except Exception as e:
        raise RuntimeError("Could not parse trusted LiveKit session metadata") from e

    session_id = metadata.get("session_id")
    tenant_id = metadata.get("tenant_id")
    agent_id = metadata.get("agent_id")
    customer_id = metadata.get("customer_id")
    is_public_demo = metadata.get("public_demo") is True
    rag_available = metadata.get("rag_available") is True
    customer_name = "Public demo visitor" if is_public_demo else "Policyholder"
    if not session_id or not tenant_id or not agent_id:
        raise RuntimeError("LiveKit dispatch is missing trusted tenant or session scope")

    # Fetch dynamic company knowledge base, tone, and greeting from database
    company_name = "InsurCall"
    greeting_template = "Hello. Welcome to {{company_name}} support. How may I help you today?"

    if not is_public_demo:
        try:
            cfg_resp = await execute_remote_tool(session_id, tenant_id, customer_id, "get_agent_config", {})
            if cfg_resp.get("ok"):
                company_name = cfg_resp.get("company_name", company_name)
                b_cfg = cfg_resp.get("branding_config", {})
                agent_cfg = b_cfg.get("agent_config", {}) if isinstance(b_cfg, dict) else {}
                greeting_template = agent_cfg.get("greeting", greeting_template)
                logger.info(f"Loaded dynamic agent config for {company_name}")
        except Exception as e:
            logger.warning(f"Could not load dynamic agent config: {e}")

    vad = create_vad()
    stt = create_stt()
    ai_llm = create_llm()
    
    tts = create_tts()

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
    async def search_policy_docs(query: str, tags: str = "") -> str:
        """Search verified policy documents and underwriting guidelines to answer customer questions.
        Args:
            query: The specific customer question or policy coverage topic.
            tags: Optional domain tag or comma-separated tags to filter documents (e.g. 'Life', 'Motor', 'Health', 'Claims', 'FNOL', 'Customer-safe').
        """
        if not rag_available:
            return json.dumps({
                "ok": True,
                "rag_available": False,
                "grounded": False,
                "citations": [],
                "answer": "No approved organisation knowledge is connected to this assistant yet.",
            })

        tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
        res = await execute_remote_tool(session_id, tenant_id, customer_id, "search_policy_docs", {
            "query": query,
            "agent_id": agent_id,
            "tags": tag_list,
        })
        citations = res.get("citations", []) if isinstance(res, dict) else []
        valid_citations = [
            {
                "sourceName": item.get("sourceName"),
                "pageNumber": item.get("pageNumber"),
                "similarity": item.get("similarity"),
            }
            for item in citations
            if isinstance(item, dict) and isinstance(item.get("sourceName"), str) and item.get("sourceName").strip()
        ]
        if valid_citations:
            packet = json.dumps({"type": "sources", "citations": valid_citations}).encode("utf-8")
            await ctx.room.local_participant.publish_data(packet)
        return json.dumps(res)

    @llm.function_tool
    async def request_human_escalation(reason: str) -> str:
        """Escalate the conversation to a human supervisor or senior claims specialist."""
        res = await execute_remote_tool(session_id, tenant_id, customer_id, "request_human_escalation", {
            "reason": reason,
        })
        return json.dumps(res)

    tools = [search_policy_docs] if is_public_demo else [
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

    dynamic_instructions = f"""You are InsurCall, an insurance support assistant for {company_name}.
APPROVED-KNOWLEDGE RULES:
- Before answering any policy-specific insurance question, call search_policy_docs with the caller's question.
- State coverage, exclusions, waiting periods, required documents, claim status, deadlines, prices, and insurer-specific processes only when supported by authorised evidence or a successful account tool.
- If RAG is unavailable or returns no suitable evidence, you may explain a common insurance term at a high level, but explicitly label it as general information and say it does not confirm the caller's policy. For policy-specific questions, abstain and guide the caller to the insurer or an authorised representative.
- Never fill missing policy evidence with standard-policy assumptions. Do not invent contacts, procedures, or expected outcomes.
- Never make or imply a binding coverage or claim decision.
- In public demo mode, do not ask for policy numbers, identity details, or other sensitive data.
- Never claim that a handoff or other action succeeded unless its tool confirms success.
- Keep responses concise and conversational.
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
    session_kwargs["tts"] = tts

    session = AgentSession(**session_kwargs)
    await session.start(agent, room=ctx.room)
    logger.info(f"SaveCall voice session started with cloud speech and local VAD turn detection for {customer_name}")

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
