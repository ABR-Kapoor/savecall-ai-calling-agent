import crypto from "node:crypto";
//#region src/lib/whatsapp/openwa-adapter.ts
/**
* InsurCall OpenWA Provider Adapter
* Pinned Upstream Specification: rmyndharis/OpenWA v0.25.0
* Pinned Commit / Tag Object: a32cfbadd8543d57606a598711f8590ccf748640
*/
var OpenWAAdapter = class OpenWAAdapter {
	baseUrl;
	apiKey;
	webhookSecret;
	constructor(baseUrlOrConfig, apiKeyParam) {
		if (typeof baseUrlOrConfig === "object" && baseUrlOrConfig !== null) {
			this.baseUrl = (baseUrlOrConfig.baseUrl || process.env["OPENWA_BASE_URL"] || "http://127.0.0.1:2785").replace(/\/+$/, "");
			this.apiKey = baseUrlOrConfig.apiKey || process.env["OPENWA_API_KEY"] || "";
			this.webhookSecret = baseUrlOrConfig.webhookSecret || process.env["WHATSAPP_WEBHOOK_SECRET"];
		} else {
			this.baseUrl = (baseUrlOrConfig || process.env["OPENWA_BASE_URL"] || "http://127.0.0.1:2785").replace(/\/+$/, "");
			this.apiKey = apiKeyParam || process.env["OPENWA_API_KEY"] || "";
			this.webhookSecret = process.env["WHATSAPP_WEBHOOK_SECRET"];
		}
	}
	async request(path, options = {}) {
		if (!this.apiKey) throw new Error("OpenWA is not configured: OPENWA_API_KEY is required");
		const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
		const method = options.method || "GET";
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 1e4);
		const headers = {
			"X-API-Key": this.apiKey,
			Authorization: `Bearer ${this.apiKey}`,
			Accept: "application/json",
			...options.headers
		};
		let bodyString;
		if (options.body !== void 0) {
			headers["Content-Type"] = "application/json";
			bodyString = JSON.stringify(options.body);
		}
		try {
			const init = {
				method,
				headers,
				signal: controller.signal
			};
			if (bodyString !== void 0) init.body = bodyString;
			const response = await fetch(url, init);
			if (!response.ok) {
				const errorText = await response.text().catch(() => "");
				let errorJson = {};
				try {
					errorJson = JSON.parse(errorText);
				} catch {}
				const msg = errorJson.message || errorJson.error || `OpenWA API error: HTTP ${response.status} ${response.statusText}`;
				throw new Error(msg);
			}
			if (response.status === 204) return;
			return await response.json();
		} catch (err) {
			if (err instanceof Error && err.name === "AbortError") throw new Error(`OpenWA gateway request timed out: ${method} ${path}`);
			throw err;
		} finally {
			clearTimeout(timeout);
		}
	}
	/**
	* Health check to confirm OpenWA gateway readiness
	*/
	async checkHealth() {
		try {
			const res = await this.request("/api/health/ready", { timeoutMs: 3e3 });
			return {
				healthy: res.status === "ok" || res.status === "ready",
				status: res.status || "healthy",
				version: res.version || "v0.25.0"
			};
		} catch (err) {
			return {
				healthy: false,
				status: `offline: ${err instanceof Error ? err.message : "Service unreachable"}`
			};
		}
	}
	/**
	* Create a session in OpenWA
	*/
	async createSession(name, customId) {
		const payload = { name };
		if (customId) payload.id = customId;
		return this.request("/api/sessions", {
			method: "POST",
			body: payload
		});
	}
	/**
	* Start WhatsApp engine for session
	*/
	async startSession(sessionId) {
		return this.request(`/api/sessions/${encodeURIComponent(sessionId)}/start`, { method: "POST" });
	}
	/**
	* Retrieve active QR code from engine
	*/
	async getQrCode(sessionId) {
		return this.request(`/api/sessions/${encodeURIComponent(sessionId)}/qr`, { method: "GET" });
	}
	/**
	* Fetch current session details
	*/
	async getSession(sessionId) {
		return this.request(`/api/sessions/${encodeURIComponent(sessionId)}`, { method: "GET" });
	}
	/**
	* Stop session and disconnect
	*/
	async stopSession(sessionId) {
		try {
			return {
				success: true,
				status: (await this.request(`/api/sessions/${encodeURIComponent(sessionId)}/stop`, { method: "POST" })).status || "disconnected"
			};
		} catch (err) {
			return {
				success: false,
				status: err instanceof Error ? err.message : "Failed to stop session"
			};
		}
	}
	/**
	* Delete session and clear stored credentials
	*/
	async deleteSession(sessionId) {
		await this.request(`/api/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
	}
	/**
	* Send an outbound text message
	*/
	async sendTextMessage(sessionId, params) {
		const headers = {};
		if (params.idempotencyKey) headers["Idempotency-Key"] = params.idempotencyKey;
		return this.request(`/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`, {
			method: "POST",
			headers,
			body: {
				chatId: params.chatId,
				text: params.text
			}
		});
	}
	/**
	* Register a webhook endpoint on OpenWA for this session
	*/
	async registerWebhook(sessionId, params) {
		const body = {
			url: params.url,
			secret: params.secret,
			events: params.events || [
				"message.received",
				"message.sent",
				"message.ack",
				"message.failed",
				"session.status",
				"session.qr",
				"session.authenticated",
				"session.disconnected",
				"call.received"
			]
		};
		const res = await this.request(`/api/sessions/${encodeURIComponent(sessionId)}/webhooks`, {
			method: "POST",
			body
		});
		return {
			webhookId: res.id || `wh_${Date.now()}`,
			url: res.url || params.url
		};
	}
	/**
	* Reject a ringing call (Baileys only in OpenWA)
	*/
	async rejectCall(sessionId, callId) {
		const res = await this.request(`/api/sessions/${encodeURIComponent(sessionId)}/calls/${encodeURIComponent(callId)}/reject`, { method: "POST" });
		return { success: Boolean(res.success) };
	}
	/**
	* Generate a shareable WhatsApp call link
	*/
	async createCallLink(sessionId, params) {
		return this.request(`/api/sessions/${encodeURIComponent(sessionId)}/calls/link`, {
			method: "POST",
			body: { startTime: params.startTime }
		});
	}
	/**
	* Instance-level cryptographic verification of inbound webhook signatures
	*/
	verifyWebhookSignature(rawBody, signatureHeader, secret) {
		const key = secret || this.webhookSecret || process.env["WHATSAPP_WEBHOOK_SECRET"] || "";
		return OpenWAAdapter.verifyWebhookSignature(rawBody, signatureHeader, key);
	}
	/**
	* Cryptographic verification of inbound webhook signatures using HMAC-SHA256
	*/
	static verifyWebhookSignature(rawBody, signatureHeader, secret) {
		if (!signatureHeader || !secret) return false;
		try {
			const rawSig = signatureHeader.startsWith("sha256=") ? signatureHeader.slice(7).trim() : signatureHeader.trim();
			const computed = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
			const sigBuffer = Buffer.from(rawSig, "utf8");
			const compBuffer = Buffer.from(computed, "utf8");
			if (sigBuffer.length !== compBuffer.length) return false;
			return crypto.timingSafeEqual(sigBuffer, compBuffer);
		} catch {
			return false;
		}
	}
};
var defaultOpenWAAdapter = new OpenWAAdapter();
//#endregion
export { defaultOpenWAAdapter as n, OpenWAAdapter as t };
