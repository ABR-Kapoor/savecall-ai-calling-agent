"""
SaveCall LiveKit Agent — Secure Tool Layer
The Agent holds NO database credentials. Every tool dispatches via an authenticated
RPC to the SaveCall backend which enforces RLS, customer scoping, and risk policies.
"""

import os
import aiohttp
import logging
from typing import Any, Dict

logger = logging.getLogger("savecall-tools")

API_BASE = os.environ.get("SAVECALL_API_URL", "https://127.0.0.1:5173")
AGENT_SECRET = os.environ.get("AGENT_INTERNAL_SECRET", "savecall_agent_secret_2026_dev")

async def execute_remote_tool(
    call_session_id: str,
    tenant_id: str,
    customer_id: str,
    tool_name: str,
    arguments: Dict[str, Any]
) -> Dict[str, Any]:
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
        # Disable SSL verification for local dev self-signed cert
        connector = aiohttp.TCPConnector(ssl=False)
        async with aiohttp.ClientSession(connector=connector) as session:
            async with session.post(url, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                data = await resp.json()
                logger.info(f"Tool {tool_name} returned status {resp.status}")
                return data
    except Exception as e:
        logger.error(f"Error executing remote tool {tool_name}: {e}")
        return {"ok": False, "error": f"Failed to connect to backend: {str(e)}"}
