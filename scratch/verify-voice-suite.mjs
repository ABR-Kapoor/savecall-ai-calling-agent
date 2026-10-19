/**
 * SaveCall Voice System Verification & Health Check Suite
 */
import { execSync } from "child_process";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const API_BASE = "https://localhost:5173";

async function runTests() {
  console.log("=================================================");
  console.log(" SAVECALL VOICE SYSTEM VERIFICATION SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let total = 0;

  function assert(name, condition, details = "") {
    total++;
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} - ${details}`);
    }
  }

  // 1. Test LiveKit Daemon Port 7880
  try {
    const res = await fetch("http://127.0.0.1:7880");
    assert("1. LiveKit WebRTC Daemon (127.0.0.1:7880 reachable)", res.status === 200 || res.status === 404, `Status: ${res.status}`);
  } catch (err) {
    assert("1. LiveKit WebRTC Daemon", false, err.message);
  }

  // 2. Test Voice Session Creation
  let sessionData = null;
  try {
    const res = await fetch(`${API_BASE}/api/voice/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: "Alex Mercer",
        customerEmail: "alex.mercer@example.com"
      })
    });
    sessionData = await res.json();
    assert("2. Voice Session Generation (/api/voice/session)", res.ok && sessionData.token && sessionData.callSessionId, `Status: ${res.status}, ID: ${sessionData?.callSessionId}`);
  } catch (err) {
    assert("2. Voice Session Generation", false, err.message);
  }

  // 3. Test LiveKit Vite Proxy /rtc/v1/validate
  if (sessionData?.token) {
    try {
      const res = await fetch(`${API_BASE}/rtc/v1/validate?access_token=${sessionData.token}`);
      assert("3. Vite WebRTC Proxy (/rtc route to LiveKit)", res.status === 200 || res.status === 400, `Status: ${res.status}`);
    } catch (err) {
      assert("3. Vite WebRTC Proxy", false, err.message);
    }
  }

  // 4. Test Conversational LLM Pipeline (/api/voice/chat)
  try {
    const res = await fetch(`${API_BASE}/api/voice/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "What is my policy cover?",
        customerName: "Alex Mercer",
        callSessionId: sessionData?.callSessionId
      })
    });
    const chatData = await res.json();
    assert("4. Grounded AI Conversation Engine (/api/voice/chat)", res.ok && chatData.reply && chatData.provider, `Provider: ${chatData?.provider}, Reply: "${chatData?.reply?.slice(0, 60)}..."`);
  } catch (err) {
    assert("4. Grounded AI Conversation Engine", false, err.message);
  }

  // 5. Test Call Session Lifecycle Termination (/api/voice/end)
  if (sessionData?.callSessionId) {
    try {
      const res = await fetch(`${API_BASE}/api/voice/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callSessionId: sessionData.callSessionId,
          durationSeconds: 45,
          turnsCount: 3,
          reason: "verification_complete"
        })
      });
      const endData = await res.json();
      assert("5. Call Session Completion & Audit Persistence (/api/voice/end)", res.ok && endData.success, `Success: ${endData?.success}`);
    } catch (err) {
      assert("5. Call Session Completion & Audit Persistence", false, err.message);
    }
  }

  // 6. Test Python Agent Environment
  try {
    const pyOutput = execSync(".\\agent\\venv\\Scripts\\python.exe -c \"import livekit.agents, livekit.plugins.silero, edge_tts; print('AGENT_READY')\"").toString();
    assert("6. Python LiveKit Agent Runtime (Silero VAD + EdgeTTS)", pyOutput.includes("AGENT_READY"), pyOutput.trim());
  } catch (err) {
    assert("6. Python LiveKit Agent Runtime", false, err.message);
  }

  console.log(`\nResults: ${passed} / ${total} tests passed.`);
  if (passed === total) {
    console.log("STATUS: ALL VOICE SYSTEM ACCEPTANCE TESTS PASSED.\n");
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Suite failed:", err);
  process.exit(1);
});
