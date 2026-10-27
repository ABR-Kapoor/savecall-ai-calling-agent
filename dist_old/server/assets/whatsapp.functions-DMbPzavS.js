import { t as createServerFn } from "./createServerFn-CIHAFgYl.js";
import { t as insforgeServer } from "./client.server-97EpFyCS.js";
import { t as createServerRpc } from "./createServerRpc-B90ckaqP.js";
import { u as resolveCurrentTenantId } from "./insurance.functions-BLePgOSY.js";
import { n as defaultOpenWAAdapter } from "./openwa-adapter-BuLTV2EY.js";
import { z } from "zod";
import crypto from "node:crypto";
//#region src/lib/whatsapp.functions.ts?tss-serverfn-split
/**
* InsurCall WhatsApp Server Functions
* Multi-tenant connection management, QR pairing, unified inbox, and human takeover.
*/
function withoutWebhookSecret(connection) {
	if (!connection) return null;
	const { webhook_secret: _secret, ...safeConnection } = connection;
	return safeConnection;
}
var ScopedWhatsAppInput = z.object({
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional()
});
/**
* 1. Get current WhatsApp connection for the authenticated tenant
*/
var getWhatsAppConnection_createServerFn_handler = createServerRpc({
	id: "a4866e5f33b8c3c58fb1cef8398de0208e5f172486802b11eb1b41e77068aa19",
	name: "getWhatsAppConnection",
	filename: "src/lib/whatsapp.functions.ts"
}, (opts) => getWhatsAppConnection.__executeServer(opts));
var getWhatsAppConnection = createServerFn({
	method: "GET",
	strict: false
}).validator((input) => ScopedWhatsAppInput.parse(input ?? {})).handler(getWhatsAppConnection_createServerFn_handler, async ({ data: input }) => {
	const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
	if (!tenantId) return {
		connection: null,
		providerHealth: {
			healthy: false,
			status: "Unauthorized"
		}
	};
	const [connRes, health] = await Promise.all([insforgeServer.database.from("whatsapp_connections").select("*").eq("tenant_id", tenantId).maybeSingle(), defaultOpenWAAdapter.checkHealth()]);
	const connection = connRes.data || null;
	if (connection && connection.provider_session_id && connection.status !== "CONNECTED") try {
		const liveSession = await defaultOpenWAAdapter.getSession(connection.provider_session_id);
		if (liveSession.status === "ready" || liveSession.status === "authenticated") {
			await insforgeServer.database.from("whatsapp_connections").update({
				status: "CONNECTED",
				phone_number: liveSession.phone || connection.phone_number,
				connected_at: (/* @__PURE__ */ new Date()).toISOString(),
				updated_at: (/* @__PURE__ */ new Date()).toISOString()
			}).eq("id", connection.id);
			connection.status = "CONNECTED";
			connection.phone_number = liveSession.phone || connection.phone_number;
		}
	} catch {}
	return {
		connection: withoutWebhookSecret(connection),
		providerHealth: health
	};
});
var InitiateSessionInput = z.object({
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional(),
	sessionName: z.string().min(2).max(50).optional()
});
/**
* 2. Initiate WhatsApp session and generate real provider QR code
*/
var initiateWhatsAppSession_createServerFn_handler = createServerRpc({
	id: "dd48e98c262f6db60778d78e641007764764eb2a63dfff5d9cc1e506a2c70873",
	name: "initiateWhatsAppSession",
	filename: "src/lib/whatsapp.functions.ts"
}, (opts) => initiateWhatsAppSession.__executeServer(opts));
var initiateWhatsAppSession = createServerFn({
	method: "POST",
	strict: false
}).validator((input) => InitiateSessionInput.parse(input)).handler(initiateWhatsAppSession_createServerFn_handler, async ({ data: input }) => {
	const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
	if (!tenantId) throw new Error("403: Forbidden - Active tenant membership required");
	const health = await defaultOpenWAAdapter.checkHealth();
	if (!health.healthy) throw new Error(`WhatsApp gateway service is offline (${health.status}). Please start the OpenWA service.`);
	const sessionName = input.sessionName?.trim() || `insurcall-${tenantId.slice(0, 8)}`;
	let { data: record } = await insforgeServer.database.from("whatsapp_connections").select("*").eq("tenant_id", tenantId).eq("session_name", sessionName).maybeSingle();
	const webhookSecret = record?.webhook_secret || crypto.randomBytes(24).toString("hex");
	if (!record) {
		const { data: inserted, error: insErr } = await insforgeServer.database.from("whatsapp_connections").insert({
			tenant_id: tenantId,
			session_name: sessionName,
			status: "STARTING",
			webhook_secret: webhookSecret,
			auto_reply_enabled: true,
			human_takeover_enabled: false
		}).select().single();
		if (insErr) throw new Error(insErr.message);
		record = inserted;
	}
	let providerSessionId = record.provider_session_id;
	if (!providerSessionId) providerSessionId = (await defaultOpenWAAdapter.createSession(sessionName)).id;
	await defaultOpenWAAdapter.startSession(providerSessionId);
	const webhookUrl = `${process.env["SAVECALL_API_URL"] || process.env["APP_BASE_URL"] || "http://127.0.0.1:5173"}/api/webhooks/whatsapp`;
	try {
		const wh = await defaultOpenWAAdapter.registerWebhook(providerSessionId, {
			url: webhookUrl,
			secret: webhookSecret
		});
		await insforgeServer.database.from("whatsapp_connections").update({ webhook_id: wh.webhookId }).eq("id", record.id);
	} catch (whErr) {
		console.warn("[OpenWA] Webhook registration warning:", whErr);
	}
	let qrData = null;
	let qrStatus = "STARTING";
	try {
		const qrRes = await defaultOpenWAAdapter.getQrCode(providerSessionId);
		qrData = qrRes.qr;
		qrStatus = qrRes.status === "ready" ? "CONNECTED" : "QR_READY";
	} catch {
		qrStatus = "STARTING";
	}
	const qrExpiresAt = new Date(Date.now() + 6e4).toISOString();
	const { data: updated } = await insforgeServer.database.from("whatsapp_connections").update({
		provider_session_id: providerSessionId,
		status: qrStatus,
		qr_code: qrData,
		qr_expires_at: qrExpiresAt,
		webhook_secret: webhookSecret,
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("id", record.id).select().single();
	return {
		success: true,
		connection: withoutWebhookSecret(updated)
	};
});
var SessionActionInput = z.object({
	id: z.string().uuid(),
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional()
});
/**
* 3. Refresh live QR code
*/
var refreshWhatsAppQr_createServerFn_handler = createServerRpc({
	id: "2160a98ace36990dd06f0995317c4422b88a98ff4972e54e9442e8a88fe760b6",
	name: "refreshWhatsAppQr",
	filename: "src/lib/whatsapp.functions.ts"
}, (opts) => refreshWhatsAppQr.__executeServer(opts));
var refreshWhatsAppQr = createServerFn({
	method: "POST",
	strict: false
}).validator((input) => SessionActionInput.parse(input)).handler(refreshWhatsAppQr_createServerFn_handler, async ({ data: input }) => {
	const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
	if (!tenantId) throw new Error("403: Forbidden");
	const { data: record, error } = await insforgeServer.database.from("whatsapp_connections").select("*").eq("id", input.id).eq("tenant_id", tenantId).maybeSingle();
	if (error || !record || !record.provider_session_id) throw new Error("Connection record not found");
	const qrRes = await defaultOpenWAAdapter.getQrCode(record.provider_session_id);
	const newStatus = qrRes.status === "ready" || qrRes.status === "authenticated" ? "CONNECTED" : "QR_READY";
	const qrExpiresAt = new Date(Date.now() + 6e4).toISOString();
	await insforgeServer.database.from("whatsapp_connections").update({
		status: newStatus,
		qr_code: qrRes.qr,
		qr_expires_at: qrExpiresAt,
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("id", record.id);
	return {
		success: true,
		qr: qrRes.qr,
		status: newStatus,
		qrExpiresAt
	};
});
var disconnectWhatsAppSession_createServerFn_handler = createServerRpc({
	id: "837df2bbb846477561b4da27152a8b23dd479f424b27665f413b75b9ebbf3636",
	name: "disconnectWhatsAppSession",
	filename: "src/lib/whatsapp.functions.ts"
}, (opts) => disconnectWhatsAppSession.__executeServer(opts));
var disconnectWhatsAppSession = createServerFn({
	method: "POST",
	strict: false
}).validator((input) => SessionActionInput.parse(input)).handler(disconnectWhatsAppSession_createServerFn_handler, async ({ data: input }) => {
	const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
	if (!tenantId) throw new Error("403: Forbidden");
	const { data: record, error } = await insforgeServer.database.from("whatsapp_connections").select("*").eq("id", input.id).eq("tenant_id", tenantId).maybeSingle();
	if (error || !record) throw new Error("Connection not found");
	if (record.provider_session_id) await defaultOpenWAAdapter.stopSession(record.provider_session_id);
	await insforgeServer.database.from("whatsapp_connections").update({
		status: "DISCONNECTED",
		qr_code: null,
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("id", record.id);
	return { success: true };
});
var TestMessageInput = z.object({
	id: z.string().uuid(),
	recipientPhone: z.string().min(8).max(20),
	messageText: z.string().min(1).max(1e3),
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional()
});
/**
* 5. Send a test WhatsApp message from the connected account
*/
var sendWhatsAppTestMessage_createServerFn_handler = createServerRpc({
	id: "5190d7f2b82ab5a8a7aded89f28a14121cdf19fbc2d8ccce3fc5b512785045a1",
	name: "sendWhatsAppTestMessage",
	filename: "src/lib/whatsapp.functions.ts"
}, (opts) => sendWhatsAppTestMessage.__executeServer(opts));
var sendWhatsAppTestMessage = createServerFn({
	method: "POST",
	strict: false
}).validator((input) => TestMessageInput.parse(input)).handler(sendWhatsAppTestMessage_createServerFn_handler, async ({ data: input }) => {
	const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
	if (!tenantId) throw new Error("403: Forbidden");
	const { data: conn } = await insforgeServer.database.from("whatsapp_connections").select("*").eq("id", input.id).eq("tenant_id", tenantId).maybeSingle();
	if (!conn || !conn.provider_session_id) throw new Error("WhatsApp connection is not initialized");
	const cleanDigits = input.recipientPhone.replace(/\D/g, "");
	const chatId = `${cleanDigits}@c.us`;
	const idempotencyKey = `test_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
	const sendRes = await defaultOpenWAAdapter.sendTextMessage(conn.provider_session_id, {
		chatId,
		text: input.messageText,
		idempotencyKey
	});
	await insforgeServer.database.from("whatsapp_messages").insert({
		tenant_id: tenantId,
		connection_id: conn.id,
		direction: "outbound",
		sender_type: "system",
		chat_id: chatId,
		phone: `+${cleanDigits}`,
		body: input.messageText,
		status: "sent",
		provider_message_id: sendRes.messageId,
		idempotency_key: idempotencyKey
	});
	return {
		success: true,
		messageId: sendRes.messageId,
		timestamp: sendRes.timestamp
	};
});
var getWhatsAppConversations_createServerFn_handler = createServerRpc({
	id: "6706b82883cc23bf0241e886e471a5ad2bec20977b8d238c841c208e3c95188c",
	name: "getWhatsAppConversations",
	filename: "src/lib/whatsapp.functions.ts"
}, (opts) => getWhatsAppConversations.__executeServer(opts));
var getWhatsAppConversations = createServerFn({
	method: "GET",
	strict: false
}).validator((input) => ScopedWhatsAppInput.parse(input ?? {})).handler(getWhatsAppConversations_createServerFn_handler, async ({ data: input }) => {
	const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
	if (!tenantId) return [];
	const { data: conversations, error } = await insforgeServer.database.from("whatsapp_conversations").select("*").eq("tenant_id", tenantId).order("last_message_at", { ascending: false }).limit(100);
	if (error) throw new Error(error.message);
	return conversations || [];
});
var ConversationMessagesInput = z.object({
	conversationId: z.string().uuid(),
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional()
});
/**
* 7. List messages for a specific conversation thread
*/
var getWhatsAppMessages_createServerFn_handler = createServerRpc({
	id: "2edb08fba265dd1b4700a675f616ef9078bf1e3468ab370cfa010d0db6fa70fc",
	name: "getWhatsAppMessages",
	filename: "src/lib/whatsapp.functions.ts"
}, (opts) => getWhatsAppMessages.__executeServer(opts));
var getWhatsAppMessages = createServerFn({
	method: "GET",
	strict: false
}).validator((input) => ConversationMessagesInput.parse(input)).handler(getWhatsAppMessages_createServerFn_handler, async ({ data: input }) => {
	const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
	if (!tenantId) return [];
	const { data: conv } = await insforgeServer.database.from("whatsapp_conversations").select("id").eq("id", input.conversationId).eq("tenant_id", tenantId).maybeSingle();
	if (!conv) throw new Error("403: Forbidden - Conversation not found in tenant");
	const { data: messages, error } = await insforgeServer.database.from("whatsapp_messages").select("*").eq("conversation_id", input.conversationId).eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(100);
	if (error) throw new Error(error.message);
	return (messages || []).reverse();
});
var SendChatMessageInput = z.object({
	conversationId: z.string().uuid(),
	text: z.string().min(1).max(4e3),
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional()
});
/**
* 8. Send staff outbound reply in conversation (with human takeover)
*/
var sendWhatsAppChatMessage_createServerFn_handler = createServerRpc({
	id: "002122668dae3048b3d5e5dbfb5e98150c38ba360a7f55b7e955348db3b08a2d",
	name: "sendWhatsAppChatMessage",
	filename: "src/lib/whatsapp.functions.ts"
}, (opts) => sendWhatsAppChatMessage.__executeServer(opts));
var sendWhatsAppChatMessage = createServerFn({
	method: "POST",
	strict: false
}).validator((input) => SendChatMessageInput.parse(input)).handler(sendWhatsAppChatMessage_createServerFn_handler, async ({ data: input }) => {
	const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
	if (!tenantId) throw new Error("403: Forbidden");
	const { data: conv } = await insforgeServer.database.from("whatsapp_conversations").select("id, connection_id, chat_id, customer_phone").eq("id", input.conversationId).eq("tenant_id", tenantId).maybeSingle();
	if (!conv) throw new Error("Conversation not found");
	const { data: conn } = await insforgeServer.database.from("whatsapp_connections").select("id, provider_session_id").eq("id", conv.connection_id).eq("tenant_id", tenantId).maybeSingle();
	if (!conn || !conn.provider_session_id) throw new Error("Active WhatsApp connection not found");
	const idempotencyKey = `staff_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
	const sendRes = await defaultOpenWAAdapter.sendTextMessage(conn.provider_session_id, {
		chatId: conv.chat_id,
		text: input.text,
		idempotencyKey
	});
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const { data: msg } = await insforgeServer.database.from("whatsapp_messages").insert({
		tenant_id: tenantId,
		connection_id: conn.id,
		conversation_id: conv.id,
		direction: "outbound",
		sender_type: "human_staff",
		chat_id: conv.chat_id,
		phone: conv.customer_phone,
		body: input.text,
		status: "sent",
		provider_message_id: sendRes.messageId,
		idempotency_key: idempotencyKey,
		created_at: now,
		updated_at: now
	}).select().single();
	await insforgeServer.database.from("whatsapp_conversations").update({
		last_message_text: input.text,
		last_message_at: now,
		updated_at: now
	}).eq("id", conv.id);
	return {
		success: true,
		message: msg
	};
});
var TakeoverToggleInput = z.object({
	conversationId: z.string().uuid(),
	humanTakeover: z.boolean(),
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional()
});
/**
* 9. Toggle human takeover on a conversation
*/
var toggleWhatsAppHumanTakeover_createServerFn_handler = createServerRpc({
	id: "b30e22df8794c813a017561bba6ea2d6261387dd24e8d334871b7aa220b95477",
	name: "toggleWhatsAppHumanTakeover",
	filename: "src/lib/whatsapp.functions.ts"
}, (opts) => toggleWhatsAppHumanTakeover.__executeServer(opts));
var toggleWhatsAppHumanTakeover = createServerFn({
	method: "POST",
	strict: false
}).validator((input) => TakeoverToggleInput.parse(input)).handler(toggleWhatsAppHumanTakeover_createServerFn_handler, async ({ data: input }) => {
	const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
	if (!tenantId) throw new Error("403: Forbidden");
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const status = input.humanTakeover ? "human_takeover" : "open";
	const { data: updated, error } = await insforgeServer.database.from("whatsapp_conversations").update({
		human_takeover: input.humanTakeover,
		human_takeover_by: input.humanTakeover ? input.clerkUserId || "staff" : null,
		human_takeover_at: input.humanTakeover ? now : null,
		status,
		updated_at: now
	}).eq("id", input.conversationId).eq("tenant_id", tenantId).select().maybeSingle();
	if (error || !updated) throw new Error("Failed to update takeover state");
	return {
		success: true,
		conversation: updated
	};
});
var AutoReplyToggleInput = z.object({
	connectionId: z.string().uuid(),
	autoReplyEnabled: z.boolean(),
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional()
});
/**
* 10. Toggle automated AI replies on the connection
*/
var toggleWhatsAppAutoReply_createServerFn_handler = createServerRpc({
	id: "4942b59e9e74a323d5201e08801b96206c57254500880a19edaeef32f3500eb9",
	name: "toggleWhatsAppAutoReply",
	filename: "src/lib/whatsapp.functions.ts"
}, (opts) => toggleWhatsAppAutoReply.__executeServer(opts));
var toggleWhatsAppAutoReply = createServerFn({
	method: "POST",
	strict: false
}).validator((input) => AutoReplyToggleInput.parse(input)).handler(toggleWhatsAppAutoReply_createServerFn_handler, async ({ data: input }) => {
	const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
	if (!tenantId) throw new Error("403: Forbidden");
	const { data: updated, error } = await insforgeServer.database.from("whatsapp_connections").update({
		auto_reply_enabled: input.autoReplyEnabled,
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("id", input.connectionId).eq("tenant_id", tenantId).select().maybeSingle();
	if (error || !updated) throw new Error("Failed to update auto-reply setting");
	return {
		success: true,
		connection: withoutWebhookSecret(updated)
	};
});
//#endregion
export { disconnectWhatsAppSession_createServerFn_handler, getWhatsAppConnection_createServerFn_handler, getWhatsAppConversations_createServerFn_handler, getWhatsAppMessages_createServerFn_handler, initiateWhatsAppSession_createServerFn_handler, refreshWhatsAppQr_createServerFn_handler, sendWhatsAppChatMessage_createServerFn_handler, sendWhatsAppTestMessage_createServerFn_handler, toggleWhatsAppAutoReply_createServerFn_handler, toggleWhatsAppHumanTakeover_createServerFn_handler };
