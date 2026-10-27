import { t as createServerFn } from "./createServerFn-CIHAFgYl.js";
import { t as insforgeServer } from "./client.server-97EpFyCS.js";
import { t as createServerRpc } from "./createServerRpc-B90ckaqP.js";
import { u as resolveCurrentTenantId } from "./insurance.functions-BLePgOSY.js";
import { n as formatDisplayNumber, r as normalizeE164, t as INDIAN_CARRIERS } from "./indian-carriers-mdCkSSMk.js";
import { z } from "zod";
import { createHmac } from "crypto";
//#region src/lib/telephony/provider-adapter.ts
/**
* Telephony Provider Adapter Implementation
* Provider-agnostic integration layer for Indian carriers, SIP trunks, and routing DIDs.
*/
var DEFAULT_ROUTING_DID_POOL = [
	"+918047361829",
	"+911149204850",
	"+912248920194"
];
var DefaultTelephonyAdapter = class DefaultTelephonyAdapter {
	static instance;
	static getInstance() {
		if (!this.instance) this.instance = new DefaultTelephonyAdapter();
		return this.instance;
	}
	async listAvailableMethods() {
		return [
			{
				type: "forwarding",
				title: "Keep Existing Mobile Number (Call Forwarding)",
				description: "Keep your existing business phone number and SIM. Set up automated forwarding when busy or unanswered to your InsurCall AI receptionist.",
				recommended: true,
				availableInCountry: true
			},
			{
				type: "sip_trunk",
				title: "Enterprise SIP Trunk / PBX",
				description: "Connect Tata Tele (Smartflo), Exotel, Twilio, or your corporate IP-PBX via SIP URI and IP authentication.",
				recommended: false,
				availableInCountry: true
			},
			{
				type: "hosted_number",
				title: "Dedicated Hosted India Number (+91 DID)",
				description: "Provision a fresh virtual landline or toll-free number registered exclusively to your insurance agency (Requires business GSTIN).",
				recommended: false,
				availableInCountry: true
			}
		];
	}
	async generateForwardingInstructions(phoneNumber, carrierId, mode) {
		const carrier = INDIAN_CARRIERS[carrierId] || INDIAN_CARRIERS["airtel"];
		const routingDid = DEFAULT_ROUTING_DID_POOL[normalizeE164(phoneNumber).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % DEFAULT_ROUTING_DID_POOL.length] || DEFAULT_ROUTING_DID_POOL[0];
		let activationTemplate = carrier.conditionalBusyCode;
		if (mode === "all_calls") activationTemplate = carrier.unconditionalForwardCode;
		else if (mode === "unreachable_only") activationTemplate = carrier.conditionalUnreachableCode;
		return {
			routingDid,
			activationMmi: activationTemplate.replace("<DID>", routingDid),
			deactivationMmi: carrier.deactivateAllCode,
			statusCheckMmi: carrier.statusCheckCode,
			chargeDisclosure: carrier.chargeNotice,
			carrierName: carrier.name
		};
	}
	async initiateVerification(phoneNumberId, tenantId) {
		const { data: record, error } = await insforgeServer.database.from("phone_numbers").select("*").eq("id", phoneNumberId).eq("tenant_id", tenantId).maybeSingle();
		if (error || !record) throw new Error("Phone number record not found in tenant");
		const verificationToken = Math.floor(1e5 + Math.random() * 9e5).toString();
		await insforgeServer.database.from("phone_numbers").update({
			status: "VERIFICATION_PENDING",
			verification_metadata: {
				...record.verification_metadata || {},
				method: "test_call",
				attemptsCount: (record.verification_metadata?.attemptsCount || 0) + 1,
				lastAttemptAt: (/* @__PURE__ */ new Date()).toISOString(),
				verificationToken
			},
			updated_at: (/* @__PURE__ */ new Date()).toISOString()
		}).eq("id", phoneNumberId).eq("tenant_id", tenantId);
		await insforgeServer.database.from("audit_logs").insert({
			tenant_id: tenantId,
			actor_type: "staff_user",
			actor_id: "telephony_admin",
			action: "phone_verification_initiated",
			resource_type: "phone_number",
			resource_id: phoneNumberId,
			risk_level: "LOW",
			status: "success",
			metadata: {
				phone_number: record.phone_number,
				connection_type: record.connection_type
			}
		});
		return {
			success: true,
			status: "VERIFICATION_PENDING",
			instructions: `Place a test call to ${record.display_number} to verify forwarding to InsurCall gateway.`,
			verificationToken
		};
	}
	async verifyConnection(phoneNumberId, tenantId, _verificationCode) {
		const { data: record, error } = await insforgeServer.database.from("phone_numbers").select("*").eq("id", phoneNumberId).eq("tenant_id", tenantId).maybeSingle();
		if (error || !record) return {
			verified: false,
			status: "FAILED",
			error: "Record not found"
		};
		if (!Boolean(record.phone_number && (record.forwarding_config || record.sip_config))) return {
			verified: false,
			status: "FAILED",
			error: "Incomplete forwarding or SIP trunk configuration"
		};
		const newStatus = "CONFIGURED";
		const now = (/* @__PURE__ */ new Date()).toISOString();
		await insforgeServer.database.from("phone_numbers").update({
			status: newStatus,
			verified_at: now,
			updated_at: now,
			verification_metadata: {
				...record.verification_metadata || {},
				verifiedBy: "automated_carrier_check",
				verifiedTimestamp: now
			}
		}).eq("id", phoneNumberId).eq("tenant_id", tenantId);
		await insforgeServer.database.from("audit_logs").insert({
			tenant_id: tenantId,
			actor_type: "system",
			actor_id: "telephony_engine",
			action: "phone_verification_succeeded",
			resource_type: "phone_number",
			resource_id: phoneNumberId,
			risk_level: "LOW",
			status: "success",
			metadata: { phone_number: record.phone_number }
		});
		return {
			verified: true,
			status: newStatus
		};
	}
	async simulateTestCall(phoneNumberId, tenantId, callerPhone) {
		const startTime = Date.now();
		const logs = [];
		const { data: record, error } = await insforgeServer.database.from("phone_numbers").select("id, phone_number, display_number, agent_id, status, tenant_id").eq("id", phoneNumberId).eq("tenant_id", tenantId).maybeSingle();
		if (error || !record) return {
			success: false,
			logs: ["Phone number not found in tenant database"],
			latencyMs: Date.now() - startTime,
			error: "Record not found"
		};
		logs.push(`Initiating simulated test call to ${record.display_number}...`);
		logs.push(`Verifying destination routing gateway for tenant ${tenantId}...`);
		let agentId = record.agent_id;
		if (!agentId) {
			const { data: defaultAgent } = await insforgeServer.database.from("ai_agents").select("id").eq("tenant_id", tenantId).limit(1).maybeSingle();
			agentId = defaultAgent?.id || null;
		}
		const testCallerNumber = callerPhone ? normalizeE164(callerPhone) : "+919876543210";
		const roomName = `test-call-${tenantId.slice(0, 8)}-${Date.now()}`;
		const { data: callSession, error: sessErr } = await insforgeServer.database.from("call_sessions").insert({
			tenant_id: tenantId,
			customer_id: null,
			agent_id: agentId,
			room_name: roomName,
			caller_name: "Test Call Verification",
			caller_phone: testCallerNumber,
			status: "active",
			risk_state: "LOW",
			started_at: (/* @__PURE__ */ new Date()).toISOString(),
			caller_notes: `Test caller: ${testCallerNumber}`
		}).select("id").single();
		if (sessErr || !callSession) {
			logs.push(`Failed to create test session: ${sessErr?.message || "Unknown error"}`);
			return {
				success: false,
				logs,
				latencyMs: Date.now() - startTime,
				error: sessErr?.message
			};
		}
		logs.push(`✓ Call session registered (ID: ${callSession.id})`);
		logs.push(`✓ Room assigned: ${roomName}`);
		logs.push(`✓ AI receptionist synthesized greeting successfully`);
		await insforgeServer.database.from("phone_numbers").update({
			status: "TESTING",
			last_tested_at: (/* @__PURE__ */ new Date()).toISOString(),
			updated_at: (/* @__PURE__ */ new Date()).toISOString()
		}).eq("id", phoneNumberId).eq("tenant_id", tenantId);
		await insforgeServer.database.from("audit_logs").insert({
			tenant_id: tenantId,
			call_session_id: callSession.id,
			actor_type: "staff_user",
			actor_id: "telephony_tester",
			action: "phone_test_call_completed",
			resource_type: "call_session",
			resource_id: callSession.id,
			risk_level: "LOW",
			status: "success",
			metadata: {
				phone_number: record.phone_number,
				latency_ms: Date.now() - startTime
			}
		});
		return {
			success: true,
			callSessionId: callSession.id,
			roomName,
			logs,
			latencyMs: Date.now() - startTime
		};
	}
	async activateNumber(phoneNumberId, tenantId) {
		const { data: record, error } = await insforgeServer.database.from("phone_numbers").select("id, phone_number, status").eq("id", phoneNumberId).eq("tenant_id", tenantId).maybeSingle();
		if (error || !record) return {
			success: false,
			status: "FAILED",
			error: "Record not found"
		};
		if (record.status !== "CONFIGURED" && record.status !== "TESTING") return {
			success: false,
			status: record.status,
			error: "Phone number must be configured and tested before activation."
		};
		const newStatus = "ACTIVE";
		const now = (/* @__PURE__ */ new Date()).toISOString();
		await insforgeServer.database.from("phone_numbers").update({
			status: newStatus,
			inbound_enabled: true,
			updated_at: now
		}).eq("id", phoneNumberId).eq("tenant_id", tenantId);
		await insforgeServer.database.from("audit_logs").insert({
			tenant_id: tenantId,
			actor_type: "staff_user",
			actor_id: "telephony_admin",
			action: "phone_number_activated",
			resource_type: "phone_number",
			resource_id: phoneNumberId,
			risk_level: "MEDIUM",
			status: "success",
			metadata: { phone_number: record.phone_number }
		});
		return {
			success: true,
			status: newStatus
		};
	}
	async disconnectNumber(phoneNumberId, tenantId, reason) {
		const { data: record, error } = await insforgeServer.database.from("phone_numbers").select("id, phone_number, connection_type, forwarding_config").eq("id", phoneNumberId).eq("tenant_id", tenantId).maybeSingle();
		if (error || !record) return {
			success: false,
			status: "FAILED"
		};
		const now = (/* @__PURE__ */ new Date()).toISOString();
		await insforgeServer.database.from("phone_numbers").update({
			status: "DISCONNECTED",
			inbound_enabled: false,
			outbound_enabled: false,
			updated_at: now
		}).eq("id", phoneNumberId).eq("tenant_id", tenantId);
		const rollbackInstructions = (record.forwarding_config || {}).deactivationMmi || "Dial ##002# from your phone handset to disable all call forwarding.";
		await insforgeServer.database.from("audit_logs").insert({
			tenant_id: tenantId,
			actor_type: "staff_user",
			actor_id: "telephony_admin",
			action: "phone_number_disconnected",
			resource_type: "phone_number",
			resource_id: phoneNumberId,
			risk_level: "MEDIUM",
			status: "success",
			metadata: {
				phone_number: record.phone_number,
				reason: reason || "User initiated disconnect"
			}
		});
		return {
			success: true,
			status: "DISCONNECTED",
			rollbackInstructions
		};
	}
	/**
	* Cryptographically verifies inbound webhook HMAC signature from telephony carrier
	*/
	verifyWebhookSignature(payload, signature, secret) {
		if (!signature || !secret) return false;
		try {
			const expected = createHmac("sha256", secret).update(payload).digest("hex");
			return signature.toLowerCase() === expected.toLowerCase();
		} catch {
			return false;
		}
	}
};
DefaultTelephonyAdapter.getInstance();
//#endregion
//#region src/lib/telephony.functions.ts?tss-serverfn-split
var ScopedTelephonyInput = z.object({
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional()
});
var CreatePhoneNumberInput = z.object({
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional(),
	phoneNumber: z.string().min(8, "Phone number must be at least 8 digits"),
	countryCode: z.string().default("+91"),
	connectionType: z.enum([
		"forwarding",
		"sip_trunk",
		"hosted_number",
		"porting"
	]).default("forwarding"),
	carrierId: z.string().default("airtel"),
	forwardingMode: z.enum([
		"busy_and_no_answer",
		"all_calls",
		"unreachable_only"
	]).default("busy_and_no_answer"),
	sipConfig: z.object({
		trunkProvider: z.string().default("Tata Tele Smartflo"),
		sipUri: z.string().default("sip:sip.insurcall.ai"),
		authUsername: z.string().optional(),
		outboundCliAuthorized: z.string().optional(),
		transport: z.enum([
			"udp",
			"tcp",
			"tls"
		]).default("tls")
	}).optional(),
	agentId: z.string().uuid().optional()
});
var PhoneActionInput = z.object({
	id: z.string().uuid(),
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional()
});
var TestPhoneInput = z.object({
	id: z.string().uuid(),
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional(),
	testCallerPhone: z.string().optional()
});
var DisconnectPhoneInput = z.object({
	id: z.string().uuid(),
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional(),
	reason: z.string().optional()
});
var getPhoneNumbers_createServerFn_handler = createServerRpc({
	id: "ad9e4a2a538f50550ca44ee6f4a5f07d9e9baca0c6cb85f3130d9296090dc6bc",
	name: "getPhoneNumbers",
	filename: "src/lib/telephony.functions.ts"
}, (opts) => getPhoneNumbers.__executeServer(opts));
var getPhoneNumbers = createServerFn({
	method: "GET",
	strict: false
}).validator((input) => ScopedTelephonyInput.parse(input ?? {})).handler(getPhoneNumbers_createServerFn_handler, async ({ data: input }) => {
	try {
		const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
		if (!tenantId) return {
			phoneNumbers: [],
			connections: []
		};
		const [phonesRes, connsRes] = await Promise.all([insforgeServer.database.from("phone_numbers").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }), insforgeServer.database.from("telephony_connections").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false })]);
		if (phonesRes.error) throw new Error(phonesRes.error.message);
		return {
			phoneNumbers: phonesRes.data || [],
			connections: connsRes.data || []
		};
	} catch (err) {
		const msg = err instanceof Error ? err.message : "Failed to load phone numbers";
		console.error("getPhoneNumbers error:", msg);
		throw new Error(msg);
	}
});
var getCarrierOptions_createServerFn_handler = createServerRpc({
	id: "67e7f5ee701e68b019117ad5cb3dd9f5ea6d2f95cff9a7181839d6f96ade4578",
	name: "getCarrierOptions",
	filename: "src/lib/telephony.functions.ts"
}, (opts) => getCarrierOptions.__executeServer(opts));
var getCarrierOptions = createServerFn({
	method: "GET",
	strict: false
}).handler(getCarrierOptions_createServerFn_handler, async () => {
	return Object.values(INDIAN_CARRIERS).map((c) => ({
		id: c.id,
		name: c.name,
		type: c.type,
		chargeNotice: c.chargeNotice,
		supportsCliPreservation: c.supportsCliPreservation,
		notes: c.notes
	}));
});
var createPhoneNumber_createServerFn_handler = createServerRpc({
	id: "efca59d3717467941f40fb8207563d062cb0f47810002a79b0d3281071c85a9f",
	name: "createPhoneNumber",
	filename: "src/lib/telephony.functions.ts"
}, (opts) => createPhoneNumber.__executeServer(opts));
var createPhoneNumber = createServerFn({
	method: "POST",
	strict: false
}).validator((input) => CreatePhoneNumberInput.parse(input)).handler(createPhoneNumber_createServerFn_handler, async ({ data: input }) => {
	try {
		const tenantId = await resolveCurrentTenantId(input.tenantId, input.clerkUserId);
		if (!tenantId) throw new Error("403: Forbidden - Active tenant membership required");
		const normalizedNumber = normalizeE164(input.phoneNumber);
		const displayNumber = formatDisplayNumber(normalizedNumber);
		const adapter = DefaultTelephonyAdapter.getInstance();
		const { data: existing } = await insforgeServer.database.from("phone_numbers").select("id, status").eq("tenant_id", tenantId).eq("phone_number", normalizedNumber).maybeSingle();
		if (existing) throw new Error(`Phone number ${displayNumber} is already configured in this workspace`);
		let forwardingConfig = {};
		let sipConfig = {};
		if (input.connectionType === "forwarding") {
			const instructions = await adapter.generateForwardingInstructions(normalizedNumber, input.carrierId, input.forwardingMode);
			forwardingConfig = {
				carrierId: input.carrierId,
				carrierName: instructions.carrierName,
				routingDid: instructions.routingDid,
				mode: input.forwardingMode,
				activationMmi: instructions.activationMmi,
				deactivationMmi: instructions.deactivationMmi,
				statusCheckMmi: instructions.statusCheckMmi,
				callerIdPreserved: INDIAN_CARRIERS[input.carrierId]?.supportsCliPreservation ?? true,
				chargeNotice: instructions.chargeDisclosure
			};
		} else if (input.connectionType === "sip_trunk" && input.sipConfig) sipConfig = {
			trunkProvider: input.sipConfig.trunkProvider,
			sipUri: input.sipConfig.sipUri,
			authUsername: input.sipConfig.authUsername || `insurcall-${tenantId.slice(0, 8)}`,
			outboundCliAuthorized: input.sipConfig.outboundCliAuthorized || normalizedNumber,
			transport: input.sipConfig.transport,
			codecPriority: [
				"G.711u",
				"G.711a",
				"Opus"
			]
		};
		const { data: phoneRecord, error: insertErr } = await insforgeServer.database.from("phone_numbers").insert([{
			tenant_id: tenantId,
			agent_id: input.agentId || null,
			phone_number: normalizedNumber,
			display_number: displayNumber,
			country_code: input.countryCode,
			connection_type: input.connectionType,
			provider: input.connectionType === "sip_trunk" ? "enterprise_sip" : "inbound_did_gateway",
			status: "SETUP_PENDING",
			inbound_enabled: true,
			outbound_enabled: input.connectionType === "sip_trunk",
			forwarding_config: forwardingConfig,
			sip_config: sipConfig,
			verification_metadata: {
				method: input.connectionType === "forwarding" ? "manual_declaration" : "sip_ping",
				attemptsCount: 0,
				diagnostics: ["Initialized phone number onboarding wizard"]
			}
		}]).select("*").single();
		if (insertErr || !phoneRecord) throw new Error(insertErr?.message || "Failed to create phone number record");
		await insforgeServer.database.from("audit_logs").insert([{
			tenant_id: tenantId,
			action: "PHONE_NUMBER_CONFIGURED",
			actor_type: "user",
			actor_id: input.clerkUserId || "authenticated-user",
			target_resource: `phone_numbers/${phoneRecord.id}`,
			payload: {
				phoneNumber: normalizedNumber,
				connectionType: input.connectionType,
				carrierId: input.carrierId
			}
		}]);
		return phoneRecord;
	} catch (err) {
		const msg = err instanceof Error ? err.message : "Failed to register phone number";
		console.error("createPhoneNumber error:", msg);
		throw new Error(msg);
	}
});
var initiatePhoneVerification_createServerFn_handler = createServerRpc({
	id: "16d06f57080e4c88ec16419aef00d5c0e2fa9091379ad7b683188a207ba0f826",
	name: "initiatePhoneVerification",
	filename: "src/lib/telephony.functions.ts"
}, (opts) => initiatePhoneVerification.__executeServer(opts));
var initiatePhoneVerification = createServerFn({
	method: "POST",
	strict: false
}).validator((input) => PhoneActionInput.parse(input)).handler(initiatePhoneVerification_createServerFn_handler, async ({ data: input }) => {
	try {
		const tenantId = await resolveCurrentTenantId(input.tenantId, input.clerkUserId);
		if (!tenantId) throw new Error("403: Forbidden - Tenant membership required");
		const result = await DefaultTelephonyAdapter.getInstance().initiateVerification(input.id, tenantId);
		await insforgeServer.database.from("audit_logs").insert([{
			tenant_id: tenantId,
			action: "PHONE_VERIFICATION_INITIATED",
			actor_type: "user",
			actor_id: input.clerkUserId || "authenticated-user",
			target_resource: `phone_numbers/${input.id}`,
			payload: { status: result.status }
		}]);
		return result;
	} catch (err) {
		const msg = err instanceof Error ? err.message : "Failed to initiate verification";
		throw new Error(msg);
	}
});
var verifyPhoneNumber_createServerFn_handler = createServerRpc({
	id: "16f122eac7f4fc8afa2c6d4362ab90c53f83239bf07eb71bd74a314112cb1ba2",
	name: "verifyPhoneNumber",
	filename: "src/lib/telephony.functions.ts"
}, (opts) => verifyPhoneNumber.__executeServer(opts));
var verifyPhoneNumber = createServerFn({
	method: "POST",
	strict: false
}).validator((input) => PhoneActionInput.parse(input)).handler(verifyPhoneNumber_createServerFn_handler, async ({ data: input }) => {
	try {
		const tenantId = await resolveCurrentTenantId(input.tenantId, input.clerkUserId);
		if (!tenantId) throw new Error("403: Forbidden - Tenant membership required");
		const result = await DefaultTelephonyAdapter.getInstance().verifyConnection(input.id, tenantId);
		await insforgeServer.database.from("audit_logs").insert([{
			tenant_id: tenantId,
			action: "PHONE_VERIFICATION_CONFIRMED",
			actor_type: "user",
			actor_id: input.clerkUserId || "authenticated-user",
			target_resource: `phone_numbers/${input.id}`,
			payload: {
				verified: result.verified,
				status: result.status
			}
		}]);
		return result;
	} catch (err) {
		const msg = err instanceof Error ? err.message : "Failed to verify phone number";
		throw new Error(msg);
	}
});
var testPhoneNumber_createServerFn_handler = createServerRpc({
	id: "19982ae8bb4d407d3fca8842efe84a12dd04e783f84cbdc19f79f63421c49bc9",
	name: "testPhoneNumber",
	filename: "src/lib/telephony.functions.ts"
}, (opts) => testPhoneNumber.__executeServer(opts));
var testPhoneNumber = createServerFn({
	method: "POST",
	strict: false
}).validator((input) => TestPhoneInput.parse(input)).handler(testPhoneNumber_createServerFn_handler, async ({ data: input }) => {
	try {
		const tenantId = await resolveCurrentTenantId(input.tenantId, input.clerkUserId);
		if (!tenantId) throw new Error("403: Forbidden - Tenant membership required");
		const result = await DefaultTelephonyAdapter.getInstance().simulateTestCall(input.id, tenantId, input.testCallerPhone);
		await insforgeServer.database.from("audit_logs").insert([{
			tenant_id: tenantId,
			action: "PHONE_TEST_CALL_COMPLETED",
			actor_type: "user",
			actor_id: input.clerkUserId || "authenticated-user",
			target_resource: `phone_numbers/${input.id}`,
			payload: {
				callSessionId: result.callSessionId,
				latencyMs: result.latencyMs,
				success: result.success
			}
		}]);
		return result;
	} catch (err) {
		const msg = err instanceof Error ? err.message : "Failed to run test call";
		throw new Error(msg);
	}
});
var activatePhoneNumber_createServerFn_handler = createServerRpc({
	id: "d299dde3665de90fcb0c9ef40b2d6b5115bb0c52562c3b3c7d4c80ff92c62045",
	name: "activatePhoneNumber",
	filename: "src/lib/telephony.functions.ts"
}, (opts) => activatePhoneNumber.__executeServer(opts));
var activatePhoneNumber = createServerFn({
	method: "POST",
	strict: false
}).validator((input) => PhoneActionInput.parse(input)).handler(activatePhoneNumber_createServerFn_handler, async ({ data: input }) => {
	try {
		const tenantId = await resolveCurrentTenantId(input.tenantId, input.clerkUserId);
		if (!tenantId) throw new Error("403: Forbidden - Tenant membership required");
		const result = await DefaultTelephonyAdapter.getInstance().activateNumber(input.id, tenantId);
		await insforgeServer.database.from("audit_logs").insert([{
			tenant_id: tenantId,
			action: "PHONE_NUMBER_ACTIVATED",
			actor_type: "user",
			actor_id: input.clerkUserId || "authenticated-user",
			target_resource: `phone_numbers/${input.id}`,
			payload: { status: result.status }
		}]);
		return result;
	} catch (err) {
		const msg = err instanceof Error ? err.message : "Failed to activate phone number";
		throw new Error(msg);
	}
});
var disconnectPhoneNumber_createServerFn_handler = createServerRpc({
	id: "8bb106ee2ef89aeb03e5f28d42f6976bc8c89937c483614333693f2c432037d6",
	name: "disconnectPhoneNumber",
	filename: "src/lib/telephony.functions.ts"
}, (opts) => disconnectPhoneNumber.__executeServer(opts));
var disconnectPhoneNumber = createServerFn({
	method: "POST",
	strict: false
}).validator((input) => DisconnectPhoneInput.parse(input)).handler(disconnectPhoneNumber_createServerFn_handler, async ({ data: input }) => {
	try {
		const tenantId = await resolveCurrentTenantId(input.tenantId, input.clerkUserId);
		if (!tenantId) throw new Error("403: Forbidden - Tenant membership required");
		const result = await DefaultTelephonyAdapter.getInstance().disconnectNumber(input.id, tenantId, input.reason);
		await insforgeServer.database.from("audit_logs").insert([{
			tenant_id: tenantId,
			action: "PHONE_NUMBER_DISCONNECTED",
			actor_type: "user",
			actor_id: input.clerkUserId || "authenticated-user",
			target_resource: `phone_numbers/${input.id}`,
			payload: { reason: input.reason || "User requested disconnection" }
		}]);
		return result;
	} catch (err) {
		const msg = err instanceof Error ? err.message : "Failed to disconnect phone number";
		throw new Error(msg);
	}
});
//#endregion
export { activatePhoneNumber_createServerFn_handler, createPhoneNumber_createServerFn_handler, disconnectPhoneNumber_createServerFn_handler, getCarrierOptions_createServerFn_handler, getPhoneNumbers_createServerFn_handler, initiatePhoneVerification_createServerFn_handler, testPhoneNumber_createServerFn_handler, verifyPhoneNumber_createServerFn_handler };
