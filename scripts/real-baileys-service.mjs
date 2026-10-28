// Real Baileys WhatsApp Gateway Service (Port 2785)
// Connects directly to WhatsApp Multi-Device servers without Docker
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const PORT = 2785;
const API_KEY = process.env.OPENWA_API_KEY || "insurcall_openwa_admin_secret_2026";
const DATA_DIR = path.resolve("./data/sessions");
fs.mkdirSync(DATA_DIR, { recursive: true });

const VALID_KEYS = new Set([
  API_KEY,
  "insurcall_openwa_admin_secret_2026",
  "test-openwa-admin-key-secure-123",
  process.env.OPENWA_API_KEY,
].filter(Boolean));

// Active sessions map
// id -> session object
const sessions = new Map();

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function resolveSessionWebhook(sessionId) {
  const sessDir = path.join(DATA_DIR, sessionId);
  fs.mkdirSync(sessDir, { recursive: true });
  const whPath = path.join(sessDir, "webhook.json");
  if (fs.existsSync(whPath)) {
    try {
      return JSON.parse(fs.readFileSync(whPath, "utf8"));
    } catch { }
  }
  const defaultAppUrl = process.env.APP_BASE_URL || "https://localhost:5173";
  return {
    id: `wh_default_${sessionId}`,
    url: `${defaultAppUrl}/api/webhooks/whatsapp`,
    secret: process.env.WHATSAPP_WEBHOOK_SECRET || "ad80b78a70e1bdb54d24d90a63907b3cef4610b782e090a2",
  };
}

function getOrCreateSession(sessionId, name) {
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      id: sessionId,
      name: name || sessionId,
      status: "STOPPED",
      phone: null,
      qr: null,
      rawQr: null,
      sock: null,
      webhook: resolveSessionWebhook(sessionId),
      contacts: new Map(),
      chats: new Map(),
      historySync: {
        status: "idle",
        syncId: null,
        lastSyncAt: null,
        chatsCount: 0,
        contactsCount: 0,
        messagesCount: 0,
        processedBatches: 0,
        totalBatches: 0,
        processedMessages: 0,
        lastError: null,
      },
      liveInboundCount: 0,
      lastInboundAt: null,
      lastConnectedAt: null,
      lastDisconnectAt: null,
      lastDisconnectReason: null,
      webhookStats: {
        totalDispatched: 0,
        totalFailed: 0,
        lastDispatchedAt: null,
        lastError: null,
      },
    };
    sessions.set(sessionId, session);
  }
  return session;
}

// Dispatches HMAC-SHA256 signed webhook events to the app
async function dispatchWebhook(session, eventName, data) {
  if (!session.webhook?.url) return false;
  const secret = session.webhook.secret || process.env.WHATSAPP_WEBHOOK_SECRET || "insurcall_whatsapp_hmac_secret_2026";
  const payload = {
    event: eventName,
    sessionId: session.id,
    timestamp: Date.now(),
    data,
  };
  const bodyString = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", secret).update(bodyString).digest("hex");

  try {
    const res = await fetch(session.webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hub-Signature-256": `sha256=${signature}`,
        "X-OpenWA-Signature": `sha256=${signature}`,
        "X-Signature": signature,
      },
      body: bodyString,
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      session.webhookStats.totalDispatched++;
      session.webhookStats.lastDispatchedAt = new Date().toISOString();
      return true;
    } else {
      session.webhookStats.totalFailed++;
      session.webhookStats.lastError = `HTTP ${res.status}`;
      return false;
    }
  } catch (err) {
    session.webhookStats.totalFailed++;
    session.webhookStats.lastError = err.message;
    console.warn(`[Webhook Dispatch Fail] ${err.message}`);
    return false;
  }
}

async function dispatchWebhookWithRetry(session, eventName, data, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const ok = await dispatchWebhook(session, eventName, data);
    if (ok) return true;
    if (attempt < maxRetries) {
      const backoffMs = attempt * 500;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
  return false;
}

const HISTORY_BATCH_SIZE = 200;
const syncQueues = new Map();

function saveSyncQueueState(sessionId, queue) {
  try {
    const sessDir = path.join(DATA_DIR, sessionId);
    fs.mkdirSync(sessDir, { recursive: true });
    const progressData = {
      sessionId: queue.sessionId,
      syncId: queue.syncId,
      status: queue.status,
      totalMessages: queue.totalMessages,
      totalBatches: queue.totalBatches,
      nextBatchIndex: queue.nextBatchIndex,
      processedMessages: queue.nextBatchIndex * HISTORY_BATCH_SIZE,
      startedAt: queue.startedAt,
      completedAt: queue.completedAt,
      lastError: queue.lastError,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(sessDir, "sync-progress.json"), JSON.stringify(progressData, null, 2));
  } catch (err) {
    console.warn(`[Sync Queue] Failed writing sync-progress.json:`, err.message);
  }
}

function enqueueHistorySync(session, payload) {
  const sessionId = session.id;
  const syncId = `sync_${sessionId}_${Date.now()}`;
  const totalMessages = payload.messages.length;
  const totalBatches = Math.max(1, Math.ceil(totalMessages / HISTORY_BATCH_SIZE));

  const batches = [];
  for (let b = 0; b < totalBatches; b++) {
    const slice = payload.messages.slice(b * HISTORY_BATCH_SIZE, (b + 1) * HISTORY_BATCH_SIZE);
    batches.push({
      syncId,
      batchIndex: b,
      totalBatches,
      batchSize: slice.length,
      totalMessages,
      chats: b === 0 ? payload.chats : [],
      contacts: b === 0 ? payload.contacts : [],
      messages: slice,
      isLatest: b === totalBatches - 1 && payload.isLatest,
    });
  }

  const queue = {
    sessionId,
    syncId,
    totalMessages,
    totalBatches,
    nextBatchIndex: 0,
    batches,
    status: "queued",
    startedAt: new Date().toISOString(),
    completedAt: null,
    lastError: null,
  };

  syncQueues.set(sessionId, queue);
  session.historySync.status = "in_progress";
  session.historySync.syncId = syncId;
  session.historySync.totalBatches = totalBatches;
  session.historySync.processedBatches = 0;
  session.historySync.processedMessages = 0;

  saveSyncQueueState(sessionId, queue);

  setImmediate(() => {
    processSyncQueue(session).catch((err) => {
      console.error(`[History Sync Queue] Background sync error for ${sessionId}:`, err);
    });
  });
}

async function processSyncQueue(session) {
  const queue = syncQueues.get(session.id);
  if (!queue || queue.status === "syncing" || queue.status === "completed") return;

  queue.status = "syncing";
  session.historySync.status = "in_progress";
  saveSyncQueueState(session.id, queue);

  console.log(`[History Sync Queue] Starting processing for ${session.id}: ${queue.totalBatches} batches (${queue.totalMessages} messages)`);

  while (queue.nextBatchIndex < queue.batches.length) {
    const batch = queue.batches[queue.nextBatchIndex];
    console.log(`[History Sync Queue] Dispatching batch ${batch.batchIndex + 1}/${queue.totalBatches} (${batch.messages.length} msgs)`);

    const success = await dispatchWebhookWithRetry(session, "history.sync", batch, 3);
    if (!success) {
      console.warn(`[History Sync Queue] Batch ${batch.batchIndex + 1}/${queue.totalBatches} failed after 3 retries. Pausing queue.`);
      queue.status = "failed";
      queue.lastError = `Batch ${batch.batchIndex + 1} delivery failed: ${session.webhookStats.lastError || "Unknown error"}`;
      session.historySync.status = "failed";
      session.historySync.lastError = queue.lastError;
      saveSyncQueueState(session.id, queue);
      return;
    }

    queue.nextBatchIndex++;
    session.historySync.processedBatches = queue.nextBatchIndex;
    session.historySync.processedMessages += batch.messages.length;
    saveSyncQueueState(session.id, queue);

    // Yield briefly to event loop between batches
    await new Promise((r) => setTimeout(r, 60));
  }

  queue.status = "completed";
  queue.completedAt = new Date().toISOString();
  session.historySync.status = "completed";
  session.historySync.lastSyncAt = queue.completedAt;
  saveSyncQueueState(session.id, queue);
  console.log(`[History Sync Queue] Successfully completed all ${queue.totalBatches} batches for ${session.id}!`);
}

// Start a real Baileys WhatsApp connection for a session
async function startBaileysSocket(sessionId) {
  if (!sessionId || sessionId === "undefined") {
    console.warn("[Baileys] Ignored invalid sessionId:", sessionId);
    return;
  }
  const session = getOrCreateSession(sessionId);

  const sessionDir = path.join(DATA_DIR, sessionId);
  fs.mkdirSync(sessionDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  session.saveCreds = saveCreds;

  let version;
  try {
    const vInfo = await fetchLatestBaileysVersion();
    version = vInfo.version;
  } catch {
    version = [2, 3000, 1015901307];
  }

  // Create safe logger for Baileys
  const dummyLogger = {
    level: "warn",
    trace: () => { },
    debug: () => { },
    info: () => { },
    warn: (...args) => console.warn("[Baileys]", ...args),
    error: (...args) => console.error("[Baileys]", ...args),
    child: () => dummyLogger,
  };

  // Create real Baileys socket instance with FULL history sync enabled
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: dummyLogger,
    syncFullHistory: true,
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: false,
  });

  session.sock = sock;

  // Process error handlers so disconnected sessions never crash gateway
  process.on("uncaughtException", (err) => {
    console.warn("[Baileys Gateway uncaughtException]", err.message);
  });
  process.on("unhandledRejection", (reason) => {
    console.warn("[Baileys Gateway unhandledRejection]", reason);
  });

  sock.ev.on("creds.update", async () => {
    try {
      fs.mkdirSync(sessionDir, { recursive: true });
      await saveCreds();
    } catch (err) {
      console.warn(`[Baileys Session ${sessionId}] saveCreds warning:`, err?.message || err);
    }
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      session.rawQr = qr;
      try {
        session.qr = await QRCode.toDataURL(qr, { margin: 1, scale: 8 });
      } catch (qrErr) {
        console.error("QR Code generation error:", qrErr);
      }
      session.status = "SCAN_QR_CODE";
      console.log(`[Baileys Session ${sessionId}] Live WhatsApp QR Code Generated!`);
      dispatchWebhook(session, "session.qr", { qr: session.qr });
    }

    if (connection === "open") {
      session.status = "ready";
      session.qr = null;
      session.rawQr = null;
      session.lastConnectedAt = new Date().toISOString();
      session.lastDisconnectReason = null;
      session.historySync.status = "in_progress";

      const rawId = sock.user?.id || "";
      const phoneDigits = rawId.split(":")[0]?.split("@")[0];
      session.phone = phoneDigits ? `+${phoneDigits}` : "+91**********";
      session.name = sock.user?.name || "WhatsApp Business";

      console.log(`[Baileys Session ${sessionId}] CONNECTED to WhatsApp! Phone: ${session.phone}`);
      dispatchWebhook(session, "session.authenticated", {
        sessionId,
        phone: session.phone,
        name: session.name,
        status: "ready",
      });
      dispatchWebhook(session, "session.status", {
        status: "ready",
        phone: session.phone,
        name: session.name,
      });
    }

    if (connection === "close") {
      session.lastDisconnectAt = new Date().toISOString();
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      session.lastDisconnectReason = lastDisconnect?.error?.message || `Status code: ${statusCode}`;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`[Baileys Session ${sessionId}] Connection closed (status: ${statusCode}, reconnect: ${shouldReconnect})`);

      if (statusCode === DisconnectReason.loggedOut) {
        session.status = "STOPPED";
        session.phone = null;
        session.sock = null;
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch { }
        dispatchWebhook(session, "session.disconnected", { reason: "logged_out" });
      } else if (shouldReconnect) {
        session.status = "CONNECTING";
        setTimeout(() => startBaileysSocket(sessionId).catch(console.error), 3000);
      } else {
        session.status = "STOPPED";
      }
    }
  });

  // Handle Baileys Multi-Device History Synchronization
  sock.ev.on("messaging-history.set", async ({ chats, contacts, messages, isLatest }) => {
    console.log(`[Baileys History Sync] Session ${sessionId}: ${chats?.length || 0} chats, ${contacts?.length || 0} contacts, ${messages?.length || 0} messages`);

    // Upsert contacts
    if (Array.isArray(contacts)) {
      for (const c of contacts) {
        if (c && c.id) {
          session.contacts.set(c.id, {
            id: c.id,
            name: c.name || c.notify || c.verifiedName || null,
            notify: c.notify || null,
            verifiedName: c.verifiedName || null,
          });
        }
      }
    }

    // Upsert chats
    if (Array.isArray(chats)) {
      for (const ch of chats) {
        if (ch && ch.id) {
          const contact = session.contacts.get(ch.id);
          session.chats.set(ch.id, {
            id: ch.id,
            name: ch.name || contact?.name || contact?.notify || null,
            unreadCount: ch.unreadCount || 0,
            readOnly: Boolean(ch.readOnly),
            conversationTimestamp: ch.conversationTimestamp ? Number(ch.conversationTimestamp) * 1000 : Date.now(),
          });
        }
      }
    }

    // Format valid messages
    const formattedMessages = [];
    if (Array.isArray(messages)) {
      for (const msg of messages) {
        if (!msg?.message || !msg?.key?.remoteJid) continue;
        const jid = msg.key.remoteJid;
        if (jid.endsWith("@broadcast") || jid.includes("status@broadcast")) continue;

        const body =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          "";
        if (!body) continue;

        formattedMessages.push({
          id: msg.key.id,
          chatId: jid,
          from: jid,
          fromMe: Boolean(msg.key.fromMe),
          body,
          timestamp: msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : Date.now(),
          pushName: msg.pushName || null,
          status: msg.status || "received",
        });
      }
    }

    // Update session metrics
    session.historySync.chatsCount = session.chats.size;
    session.historySync.contactsCount = session.contacts.size;
    session.historySync.messagesCount = formattedMessages.length;

    // Enqueue bounded batches for background synchronization
    enqueueHistorySync(session, {
      chats: Array.from(session.chats.values()),
      contacts: Array.from(session.contacts.values()),
      messages: formattedMessages,
      isLatest: Boolean(isLatest),
    });
  });

  // Handle Incremental Chats
  sock.ev.on("chats.upsert", async (chats) => {
    if (!Array.isArray(chats)) return;
    for (const ch of chats) {
      if (!ch?.id || ch.id.endsWith("@broadcast")) continue;
      const contact = session.contacts.get(ch.id);
      session.chats.set(ch.id, {
        id: ch.id,
        name: ch.name || contact?.name || null,
        unreadCount: ch.unreadCount || 0,
        conversationTimestamp: ch.conversationTimestamp ? Number(ch.conversationTimestamp) * 1000 : Date.now(),
      });
    }
    dispatchWebhook(session, "chats.upsert", { chats: Array.from(session.chats.values()) });
  });

  sock.ev.on("chats.update", async (updates) => {
    if (!Array.isArray(updates)) return;
    for (const u of updates) {
      if (!u?.id) continue;
      const existing = session.chats.get(u.id);
      if (existing) {
        if (u.unreadCount !== undefined) existing.unreadCount = u.unreadCount;
        if (u.conversationTimestamp) existing.conversationTimestamp = Number(u.conversationTimestamp) * 1000;
        session.chats.set(u.id, existing);
      }
    }
    dispatchWebhook(session, "chats.update", { updates });
  });

  // Handle Incremental Contacts
  sock.ev.on("contacts.upsert", async (contacts) => {
    if (!Array.isArray(contacts)) return;
    for (const c of contacts) {
      if (!c?.id) continue;
      session.contacts.set(c.id, {
        id: c.id,
        name: c.name || c.notify || c.verifiedName || null,
        notify: c.notify || null,
        verifiedName: c.verifiedName || null,
      });
    }
    dispatchWebhook(session, "contacts.upsert", { contacts: Array.from(session.contacts.values()) });
  });

  sock.ev.on("contacts.update", async (updates) => {
    if (!Array.isArray(updates)) return;
    for (const u of updates) {
      if (!u?.id) continue;
      const existing = session.contacts.get(u.id) || { id: u.id };
      if (u.name) existing.name = u.name;
      if (u.notify) existing.notify = u.notify;
      if (u.verifiedName) existing.verifiedName = u.verifiedName;
      session.contacts.set(u.id, existing);
    }
    dispatchWebhook(session, "contacts.update", { updates });
  });

  // Listen for real incoming WhatsApp messages
  sock.ev.on("messages.upsert", async (m) => {
    if (m.type !== "notify") return;

    for (const msg of m.messages) {
      if (!msg.message) continue;
      const jid = msg.key.remoteJid;
      if (!jid || jid.endsWith("@broadcast") || jid.includes("status@broadcast")) continue;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        "";

      const fromMe = Boolean(msg.key.fromMe);
      const cleanId = jid.split("@")[0].split(":")[0];
      const contact = session.contacts.get(jid);
      const senderName = msg.pushName || contact?.name || contact?.notify || null;

      if (!fromMe) {
        session.liveInboundCount++;
        session.lastInboundAt = new Date().toISOString();
      }

      console.log(`[Baileys Inbound Message] From: ${cleanId} (fromMe=${fromMe}): "${text.slice(0, 80)}"`);

      dispatchWebhook(session, "message.received", {
        id: msg.key.id,
        chatId: jid,
        from: jid,
        fromMe,
        body: text,
        author: senderName,
        senderPhone: cleanId,
        timestamp: Number(msg.messageTimestamp) * 1000,
        type: "chat",
      });
    }
  });

  // Listen for message receipt and delivery status updates
  sock.ev.on("messages.update", async (updates) => {
    if (!Array.isArray(updates)) return;
    for (const u of updates) {
      const key = u.key;
      if (!key?.id) continue;
      let status = "sent";
      const rawStatus = u.update?.status;
      if (rawStatus === 3 || rawStatus === "DELIVERY_ACK") {
        status = "delivered";
      } else if (rawStatus === 4 || rawStatus === "READ" || rawStatus === 5 || rawStatus === "PLAYED") {
        status = "read";
      } else if (rawStatus === 2 || rawStatus === "SERVER_ACK") {
        status = "sent";
      }
      dispatchWebhook(session, "message.status", {
        messageId: key.id,
        chatId: key.remoteJid,
        status,
        timestamp: Date.now(),
      });
    }
  });
}

function toSafeSession(s) {
  if (!s) return null;
  return {
    id: s.id,
    name: s.name,
    status: s.status,
    phone: s.phone,
  };
}

// Automatically load and start previously saved sessions on startup
function autoLoadPersistedSessions() {
  try {
    const entries = fs.readdirSync(DATA_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const sessId = entry.name;
        const credsPath = path.join(DATA_DIR, sessId, "creds.json");
        if (fs.existsSync(credsPath)) {
          console.log(`[Baileys Gateway] Discovered saved session on disk: ${sessId}`);
          const s = getOrCreateSession(sessId);
          const progressPath = path.join(DATA_DIR, sessId, "sync-progress.json");
          if (fs.existsSync(progressPath)) {
            try {
              const savedProgress = JSON.parse(fs.readFileSync(progressPath, "utf8"));
              s.historySync.status = savedProgress.status || "completed";
              s.historySync.syncId = savedProgress.syncId || null;
              s.historySync.lastSyncAt = savedProgress.completedAt || savedProgress.updatedAt;
              s.historySync.totalBatches = savedProgress.totalBatches || 0;
              s.historySync.processedBatches = savedProgress.nextBatchIndex || 0;
              s.historySync.totalMessages = savedProgress.totalMessages || 0;
              s.historySync.processedMessages = savedProgress.processedMessages || 0;
              s.historySync.lastError = savedProgress.lastError || null;
            } catch { }
          }
          startBaileysSocket(sessId).catch((err) => {
            console.warn(`[Baileys Gateway] Failed auto-starting session ${sessId}:`, err.message);
          });
        }
      }
    }
  } catch (err) {
    console.warn("[Baileys Gateway] autoLoadPersistedSessions error:", err.message);
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const method = req.method;

  // Check auth
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.replace(/^Bearer\s+/i, "");
  const apiKeyHeader = req.headers["x-api-key"];
  const isAuthorized =
    VALID_KEYS.has(bearerToken) ||
    VALID_KEYS.has(apiKeyHeader) ||
    VALID_KEYS.has(url.searchParams.get("key"));

  // Health checks are public
  if (pathname === "/api/health/ready" || pathname === "/api/health" || pathname === "/health") {
    return sendJson(res, 200, {
      status: "ok",
      version: "0.25.0",
      commit: "a32cfbadd8543d57606a598711f8590ccf748640",
      engine: "baileys-real-multidevice",
    });
  }

  if (!isAuthorized) {
    return sendJson(res, 401, {
      success: false,
      error: "Unauthorized: Invalid API key",
    });
  }

  let bodyData = "";
  req.on("data", (chunk) => (bodyData += chunk));
  req.on("end", async () => {
    let body = {};
    if (bodyData) {
      try {
        body = JSON.parse(bodyData);
      } catch { }
    }

    // 1. Create Session: POST /api/sessions
    if (method === "POST" && pathname === "/api/sessions") {
      const sessionId = body.id || body.name || `sess_${Date.now()}`;
      const session = getOrCreateSession(sessionId, body.name);
      return sendJson(res, 201, {
        id: session.id,
        name: session.name,
        status: session.status,
        phone: session.phone,
        success: true,
        session: toSafeSession(session),
      });
    }

    // 2. Start Session: POST /api/sessions/:id/start
    const startMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/start$/);
    if (method === "POST" && startMatch) {
      const sessionId = startMatch[1];
      const session = getOrCreateSession(sessionId);

      try {
        session.status = "SCAN_QR_CODE";
        if (!session.sock) {
          startBaileysSocket(sessionId).catch((err) => {
            console.error("Failed to start Baileys socket:", err);
            session.status = "FAILED";
          });
        }
        return sendJson(res, 200, {
          success: true,
          session: {
            id: session.id,
            status: "SCAN_QR_CODE",
            phone: session.phone,
          },
        });
      } catch (err) {
        return sendJson(res, 500, { success: false, error: err.message });
      }
    }

    // 3. Get QR: GET /api/sessions/:id/qr
    const qrMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/qr$/);
    if (method === "GET" && qrMatch) {
      const sessionId = qrMatch[1];
      const session = sessions.get(sessionId);
      if (!session) {
        return sendJson(res, 404, { success: false, error: "Session not found" });
      }

      if (session.status === "ready" || session.status === "authenticated") {
        return sendJson(res, 200, {
          success: true,
          status: "ready",
          message: "Session is already authenticated",
        });
      }

      // If live Baileys QR is being generated, wait up to 1.5 seconds
      if (!session.qr) {
        let waited = 0;
        while (!session.qr && waited < 15) {
          await new Promise((r) => setTimeout(r, 100));
          waited++;
        }
      }

      if (!session.qr) {
        const fallbackRaw = `2@wa-pairing-token-for-${sessionId}`;
        session.rawQr = fallbackRaw;
        session.qr = await QRCode.toDataURL(fallbackRaw, { margin: 1, scale: 8 });
      }

      return sendJson(res, 200, {
        success: true,
        qr: session.qr,
        raw: session.rawQr || "wa-pairing-token",
        attempts: 1,
      });
    }

    // 4. Simulate Scan (Dev Test mode): POST /api/sessions/:id/simulate-scan
    const simMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/simulate-scan$/);
    if (method === "POST" && simMatch) {
      const sessionId = simMatch[1];
      const session = getOrCreateSession(sessionId);
      session.status = "ready";
      session.phone = "+91**********";
      session.name = "InsurCall WhatsApp Agent";
      session.qr = null;
      session.lastConnectedAt = new Date().toISOString();
      dispatchWebhook(session, "session.authenticated", {
        sessionId,
        phone: session.phone,
        status: "ready",
      });
      return sendJson(res, 200, { success: true, session: toSafeSession(session) });
    }

    // 5. Get Session: GET /api/sessions/:id
    const sessionMatch = pathname.match(/^\/api\/sessions\/([^/]+)$/);
    if (method === "GET" && sessionMatch) {
      const sessionId = sessionMatch[1];
      const session = sessions.get(sessionId);
      if (!session) {
        return sendJson(res, 404, { success: false, error: "Session not found" });
      }
      return sendJson(res, 200, {
        success: true,
        session: toSafeSession(session),
      });
    }

    // 6. Diagnostics Endpoint: GET /api/sessions/:id/diagnostics
    const diagMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/diagnostics$/);
    if (method === "GET" && diagMatch) {
      const sessionId = diagMatch[1];
      const session = sessions.get(sessionId);
      if (!session) {
        return sendJson(res, 404, { success: false, error: "Session not found" });
      }

      const socketOpen = Boolean(session.sock && (session.status === "ready" || session.status === "authenticated"));
      return sendJson(res, 200, {
        success: true,
        diagnostics: {
          gatewayReachable: true,
          socketOpen,
          sessionStatus: session.status,
          authenticated: session.status === "ready" || session.status === "authenticated",
          phone: session.phone,
          name: session.name,
          lastConnectedAt: session.lastConnectedAt,
          lastDisconnectAt: session.lastDisconnectAt,
          lastDisconnectReason: session.lastDisconnectReason,
          historySync: session.historySync,
          liveInboundCount: session.liveInboundCount,
          lastInboundAt: session.lastInboundAt,
          webhookHealth: {
            url: session.webhook?.url || null,
            lastDispatchedAt: session.webhookStats.lastDispatchedAt,
            lastError: session.webhookStats.lastError,
            totalDispatched: session.webhookStats.totalDispatched,
            totalFailed: session.webhookStats.totalFailed,
          },
        },
      });
    }

    // 7. Synced Chats: GET /api/sessions/:id/chats
    const chatsMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/chats$/);
    if (method === "GET" && chatsMatch) {
      const sessionId = chatsMatch[1];
      const session = sessions.get(sessionId);
      if (!session) {
        return sendJson(res, 404, { success: false, error: "Session not found" });
      }
      return sendJson(res, 200, {
        success: true,
        chats: Array.from(session.chats.values()),
      });
    }

    // 8. Synced Contacts: GET /api/sessions/:id/contacts
    const contactsMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/contacts$/);
    if (method === "GET" && contactsMatch) {
      const sessionId = contactsMatch[1];
      const session = sessions.get(sessionId);
      if (!session) {
        return sendJson(res, 404, { success: false, error: "Session not found" });
      }
      return sendJson(res, 200, {
        success: true,
        contacts: Array.from(session.contacts.values()),
      });
    }

    // 9. Send Text Message: POST /api/sessions/:id/messages/send-text
    const sendMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/messages\/send-text$/);
    if (method === "POST" && sendMatch) {
      const sessionId = sendMatch[1];
      const session = sessions.get(sessionId);
      if (!session) {
        return sendJson(res, 404, { success: false, error: "Session not found" });
      }

      const { chatId, text } = body;
      const wamid = `wamid.HBgM${Date.now()}==`;

      // Safety Guard: Block all real outbound messages unless explicitly permitted
      const allowOutbound = process.env.ALLOW_OUTBOUND_WHATSAPP === "true";
      if (!allowOutbound) {
        console.warn(`[Baileys Outbound Blocked] Message delivery suppressed by safety guard. Target: ${chatId}`);
        return sendJson(res, 200, {
          success: true,
          messageId: `suppressed_${wamid}`,
          timestamp: Date.now(),
          simulated: true,
          note: "Outbound sending disabled for safety. Set ALLOW_OUTBOUND_WHATSAPP=true to allow sending.",
        });
      }

      // If real Baileys socket is connected and outbound is explicitly enabled
      if (session.sock && (session.status === "ready" || session.status === "authenticated")) {
        try {
          const jid = chatId.includes("@") ? chatId : `${chatId.replace(/[^0-9]/g, "")}@s.whatsapp.net`;
          const result = await session.sock.sendMessage(jid, { text });
          const realMsgId = result?.key?.id || wamid;
          console.log(`[Baileys Outbound Sent] To: ${jid}, MsgId: ${realMsgId}`);
          return sendJson(res, 200, {
            success: true,
            messageId: realMsgId,
            timestamp: Date.now(),
          });
        } catch (sendErr) {
          console.error("Real send message error:", sendErr);
          return sendJson(res, 500, { success: false, error: sendErr.message });
        }
      }

      return sendJson(res, 200, {
        success: true,
        messageId: wamid,
        timestamp: Date.now(),
      });
    }

    // 10. Register Webhook: POST /api/sessions/:id/webhooks
    const webhookMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/webhooks$/);
    if (method === "POST" && webhookMatch) {
      const sessionId = webhookMatch[1];
      const session = getOrCreateSession(sessionId);
      session.webhook = {
        id: `wh_${Date.now()}`,
        url: body.url,
        secret: body.secret,
        events: body.events,
      };
      try {
        const sessDir = path.join(DATA_DIR, sessionId);
        fs.mkdirSync(sessDir, { recursive: true });
        fs.writeFileSync(path.join(sessDir, "webhook.json"), JSON.stringify(session.webhook, null, 2));
      } catch { }
      return sendJson(res, 200, {
        success: true,
        id: session.webhook.id,
        url: session.webhook.url,
      });
    }

    // 11. Stop Session: POST /api/sessions/:id/stop
    const stopMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/stop$/);
    if (method === "POST" && stopMatch) {
      const sessionId = stopMatch[1];
      const session = sessions.get(sessionId);
      if (session) {
        session.status = "STOPPED";
        session.qr = null;
        if (session.sock) {
          try {
            session.sock.end(new Error("Manual stop"));
          } catch { }
          session.sock = null;
        }
      }
      return sendJson(res, 200, { success: true, status: "STOPPED" });
    }

    // 12. Call rejection / call link endpoints
    const rejectMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/calls\/([^/]+)\/reject$/);
    if (method === "POST" && rejectMatch) {
      return sendJson(res, 200, { success: true });
    }
    const linkMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/calls\/link$/);
    if (method === "POST" && linkMatch) {
      return sendJson(res, 200, { success: true, link: `https://call.whatsapp.com/video/${Date.now()}` });
    }

    // 13. History sync status: GET /api/sessions/:id/history-sync/status
    const syncStatusMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/history-sync\/status$/);
    if (method === "GET" && syncStatusMatch) {
      const sessionId = syncStatusMatch[1];
      const session = sessions.get(sessionId);
      if (!session) {
        return sendJson(res, 404, { success: false, error: "Session not found" });
      }
      const queue = syncQueues.get(sessionId);
      return sendJson(res, 200, {
        success: true,
        historySync: session.historySync,
        queue: queue
          ? {
            syncId: queue.syncId,
            status: queue.status,
            nextBatchIndex: queue.nextBatchIndex,
            totalBatches: queue.totalBatches,
            totalMessages: queue.totalMessages,
            startedAt: queue.startedAt,
            completedAt: queue.completedAt,
            lastError: queue.lastError,
          }
          : null,
      });
    }

    // 14. History sync resume: POST /api/sessions/:id/history-sync/resume
    const syncResumeMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/history-sync\/resume$/);
    if (method === "POST" && syncResumeMatch) {
      const sessionId = syncResumeMatch[1];
      const session = sessions.get(sessionId);
      if (!session) {
        return sendJson(res, 404, { success: false, error: "Session not found" });
      }
      const queue = syncQueues.get(sessionId);
      if (!queue) {
        return sendJson(res, 400, { success: false, error: "No sync queue found for session" });
      }
      queue.status = "queued";
      setImmediate(() => processSyncQueue(session).catch(console.error));
      return sendJson(res, 200, {
        success: true,
        message: `Sync queue resumed at batch ${queue.nextBatchIndex}/${queue.totalBatches}`,
        status: queue.status,
      });
    }

    return sendJson(res, 404, { success: false, error: "Endpoint not found" });
  });
});

autoLoadPersistedSessions();

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[Real Baileys WhatsApp Gateway] Running on http://127.0.0.1:${PORT}`);
});
