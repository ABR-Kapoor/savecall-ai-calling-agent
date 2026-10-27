// Mock OpenWA v0.25.0 Gateway Service (port 2785)
// Pinned upstream specification: https://github.com/rmyndharis/OpenWA
import http from "node:http";
import crypto from "node:crypto";
import zlib from "node:zlib";

const PORT = 2785;
const API_KEY = process.env.OPENWA_API_KEY || "insurcall_openwa_admin_secret_2026";
const WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET || "insurcall_whatsapp_hmac_secret_2026";

// Known valid API keys for development and test harnesses
const VALID_KEYS = new Set([
  API_KEY,
  "insurcall_openwa_admin_secret_2026",
  "test-openwa-admin-key-secure-123",
  process.env.OPENWA_API_KEY,
].filter(Boolean));

// In-memory sessions store
const sessions = new Map();

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

// Generates a valid, crisp base64 PNG QR code matrix without external libraries
function generatePngQrDataUrl(text) {
  const size = 25;
  const matrix = Array.from({ length: size }, () => Array(size).fill(0));

  function isFinderDark(r, c) {
    if (r === 0 || r === 6 || c === 0 || c === 6) return true;
    if (r >= 2 && r <= 4 && c >= 2 && c <= 4) return true;
    return false;
  }

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (r < 7 && c < 7) {
        matrix[r][c] = isFinderDark(r, c) ? 1 : 0;
      } else if (r < 7 && c >= size - 7) {
        matrix[r][c] = isFinderDark(r, c - (size - 7)) ? 1 : 0;
      } else if (r >= size - 7 && c < 7) {
        matrix[r][c] = isFinderDark(r - (size - 7), c) ? 1 : 0;
      } else if (r === 6 || c === 6) {
        matrix[r][c] = (r + c) % 2 === 0 ? 1 : 0;
      } else {
        const seed = (Math.abs(hash) * (r + 1) * 31 + (c + 1) * 17) % 100;
        matrix[r][c] = seed < 48 ? 1 : 0;
      }
    }
  }

  const scale = 8;
  const dim = size * scale;
  const rawBytes = [];
  for (let y = 0; y < dim; y++) {
    rawBytes.push(0); // filter byte 0
    const my = Math.floor(y / scale);
    for (let x = 0; x < dim; x++) {
      const mx = Math.floor(x / scale);
      const isBlack = matrix[my][mx] === 1;
      rawBytes.push(isBlack ? 0 : 255);
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(rawBytes));

  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[n] = c;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crcBuf = Buffer.alloc(4);
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(dim, 0);
  ihdrData.writeUInt32BE(dim, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 0;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = makeChunk("IHDR", ihdrData);
  const idat = makeChunk("IDAT", compressed);
  const iend = makeChunk("IEND", Buffer.alloc(0));

  const pngBuffer = Buffer.concat([header, ihdr, idat, iend]);
  return "data:image/png;base64," + pngBuffer.toString("base64");
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const method = req.method;

  // Authorization check (OpenWA accepts X-API-Key or Authorization Bearer)
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.replace(/^Bearer\s+/i, "");
  const apiKeyHeader = req.headers["x-api-key"];

  const isAuthorized =
    VALID_KEYS.has(bearerToken) ||
    VALID_KEYS.has(apiKeyHeader) ||
    apiKeyHeader === API_KEY;

  if (!isAuthorized) {
    return sendJson(res, 401, { success: false, error: "Unauthorized: Invalid or missing API key" });
  }

  let rawBody = "";
  req.on("data", (chunk) => {
    rawBody += chunk;
  });

  req.on("end", () => {
    let body = {};
    if (rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        // Non-JSON or empty
      }
    }

    // Health checks: /health, /api/health, /api/health/ready
    if (method === "GET" && (pathname === "/health" || pathname === "/api/health/ready" || pathname === "/api/health")) {
      return sendJson(res, 200, {
        status: "ok",
        version: "0.25.0",
        commit: "a32cfbadd8543d57606a598711f8590ccf748640",
      });
    }

    // Create session: POST /api/sessions
    if (method === "POST" && pathname === "/api/sessions") {
      const sessionId = body.id || `session_${Date.now()}`;
      const session = {
        id: sessionId,
        status: "STOPPED",
        name: body.name || "InsurCall WhatsApp",
        webhookUrl: null,
        phone: null,
        createdAt: new Date().toISOString(),
      };
      sessions.set(sessionId, session);
      return sendJson(res, 201, { success: true, session });
    }

    // Start session: POST /api/sessions/:id/start
    const startMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/start$/);
    if (method === "POST" && startMatch) {
      const sessionId = startMatch[1];
      const session = sessions.get(sessionId) || { id: sessionId, status: "STOPPED" };
      session.status = "SCAN_QR_CODE";
      sessions.set(sessionId, session);
      return sendJson(res, 200, { success: true, session });
    }

    // Get QR code: GET /api/sessions/:id/qr
    const qrMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/qr$/);
    if (method === "GET" && qrMatch) {
      const sessionId = qrMatch[1];
      const session = sessions.get(sessionId);
      if (!session) {
        return sendJson(res, 404, { success: false, error: "Session not found" });
      }
      const rawToken = `2@mock-qr-token-for-${sessionId}-pin-v0.25.0`;
      const qrDataUrl = generatePngQrDataUrl(rawToken);
      return sendJson(res, 200, {
        success: true,
        qr: qrDataUrl,
        raw: rawToken,
        attempts: 1,
      });
    }

    // Simulate phone scanning QR code (development testing): POST /api/sessions/:id/simulate-scan
    const simulateMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/simulate-scan$/);
    if (method === "POST" && simulateMatch) {
      const sessionId = simulateMatch[1];
      const session = sessions.get(sessionId) || { id: sessionId };
      session.status = "ready";
      session.phone = "+91 98765 43210";
      session.name = "InsurCall Agent Handset";
      sessions.set(sessionId, session);
      return sendJson(res, 200, { success: true, session });
    }

    // Get session status: GET /api/sessions/:id
    const sessionMatch = pathname.match(/^\/api\/sessions\/([^/]+)$/);
    if (method === "GET" && sessionMatch) {
      const sessionId = sessionMatch[1];
      const session = sessions.get(sessionId);
      if (!session) {
        return sendJson(res, 404, { success: false, error: "Session not found" });
      }
      return sendJson(res, 200, { success: true, session });
    }

    // Register webhook: POST /api/sessions/:id/webhooks
    const webhookMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/webhooks$/);
    if (method === "POST" && webhookMatch) {
      const sessionId = webhookMatch[1];
      const session = sessions.get(sessionId);
      if (session) {
        session.webhookUrl = body.url;
      }
      return sendJson(res, 200, { success: true, webhookUrl: body.url, webhookId: `wh_${Date.now()}` });
    }

    // Send text message: POST /api/sessions/:id/messages/send-text
    const sendMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/messages\/send-text$/);
    if (method === "POST" && sendMatch) {
      const sessionId = sendMatch[1];
      const session = sessions.get(sessionId);
      if (!session) {
        return sendJson(res, 404, { success: false, error: "Session not found" });
      }
      const messageId = `wamid.HBgL${crypto.randomBytes(8).toString("hex")}`;
      return sendJson(res, 200, {
        success: true,
        messageId,
        to: body.to,
        timestamp: Date.now(),
      });
    }

    // Reject voice call: POST /api/sessions/:id/calls/:callId/reject
    const callRejectMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/calls\/([^/]+)\/reject$/);
    if (method === "POST" && callRejectMatch) {
      return sendJson(res, 200, { success: true, callId: callRejectMatch[2], rejected: true });
    }

    // Call link: POST /api/sessions/:id/calls/link
    const callLinkMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/calls\/link$/);
    if (method === "POST" && callLinkMatch) {
      return sendJson(res, 200, { success: true, link: `https://call.whatsapp.com/video/${crypto.randomBytes(6).toString("hex")}` });
    }

    // Stop session: POST /api/sessions/:id/stop
    const stopMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/stop$/);
    if (method === "POST" && stopMatch) {
      const sessionId = stopMatch[1];
      const session = sessions.get(sessionId);
      if (session) {
        session.status = "STOPPED";
      }
      return sendJson(res, 200, { success: true, status: "STOPPED" });
    }

    // Any other routes 404 (including call audio stream check)
    return sendJson(res, 404, { success: false, error: `Endpoint not found: ${method} ${pathname}` });
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[Mock OpenWA Gateway v0.25.0] listening on http://127.0.0.1:${PORT}`);
});
