"""
SaveCall LiveKit Agent: Secure Tool Layer
The Agent holds NO database credentials. Every tool dispatches via an authenticated
RPC to the SaveCall backend which enforces RLS, customer scoping, and risk policies.
"""

import os
import aiohttp
import logging
from typing import Any, Dict

logger = logging.getLogger("savecall-tools")

API_BASE = os.environ.get("SAVECALL_API_URL") or os.environ.get("PUBLIC_API_BASE_URL", "")
AGENT_SECRET = os.environ.get("AGENT_INTERNAL_SECRET", "")

async def execute_remote_tool(
    call_session_id: str,
    tenant_id: str,
    customer_id: str | None,
    tool_name: str,
    arguments: Dict[str, Any]
) -> Dict[str, Any]:
    if not API_BASE.startswith("https://") or not AGENT_SECRET:
        return {
            "ok": False,
            "error": "The secure HTTPS backend callback is not configured. No tenant records were accessed.",
        }

    url = f"{API_BASE.rstrip('/')}/api/agent/tools"
    headers = {
        "Content-Type": "application/json",
        "x-agent-secret": AGENT_SECRET
    }
    payload = {
        "call_session_id": call_session_id,
        "tenant_id": tenant_id,
        "customer_id": customer_id,
        "tool_name": tool_name,
        "arguments": arguments
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                data = await resp.json()
                logger.info(f"Tool {tool_name} returned status {resp.status}")
                return data
    except Exception as e:
        logger.error(f"Error executing remote tool {tool_name}: {e}")
        return {"ok": False, "error": f"Failed to connect to backend: {str(e)}"}
