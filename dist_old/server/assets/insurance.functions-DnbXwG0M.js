import { t as createServerFn } from "./createServerFn-CIHAFgYl.js";
import { t as insforgeServer } from "./client.server-97EpFyCS.js";
import { t as createServerRpc } from "./createServerRpc-B90ckaqP.js";
import { z } from "zod";
//#region src/lib/insurance.functions.ts?tss-serverfn-split
/**
* Resolves current tenant UUID safely to maintain strict tenant isolation.
* Automatically provisions a fresh onboarding tenant for new users.
*/
/**
* Helper to ensure a genuine Clerk user has a corresponding customer & baseline policy record in the database.
*/
var ensureCustomerFromClerk = async (tenantId, clerkUserId, userEmail, userName) => {
	try {
		const { data: existing } = await insforgeServer.database.from("customers").select("id").eq("tenant_id", tenantId).eq("clerk_user_id", clerkUserId).limit(1);
		if (existing && existing.length > 0 && existing[0]) return existing[0].id;
		const { clerkClient } = await import("./clerk.server-DiamVK2c.js");
		const clerkUser = await clerkClient.users.getUser(clerkUserId).catch(() => null);
		const email = clerkUser?.emailAddresses[0]?.emailAddress || userEmail || "user@example.com";
		const name = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || userName || email.split("@")[0] || "Policyholder";
		const phone = clerkUser?.phoneNumbers[0]?.phoneNumber || "+91 98765 43210";
		const custNumber = "CUST-" + clerkUserId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
		const { data: newCust } = await insforgeServer.database.from("customers").upsert([{
			tenant_id: tenantId,
			clerk_user_id: clerkUserId,
			customer_number: custNumber,
			name,
			email,
			phone,
			status: "active"
		}], { onConflict: "tenant_id,customer_number" }).select("id").single();
		if (newCust?.id) {
			const polNumber = "POL-" + custNumber.replace("CUST-", "") + "-HLT";
			await insforgeServer.database.from("policies").upsert([{
				tenant_id: tenantId,
				customer_id: newCust.id,
				policy_number: polNumber,
				policy_type: "health",
				plan_name: "Comprehensive Health Shield Platinum",
				nominee_name: "Designated Nominee",
				nominee_relationship: "Spouse",
				premium_amount: 18500,
				due_date: "2026-11-30",
				status: "active"
			}], { onConflict: "tenant_id,policy_number" });
			await ensureInsforgeUser(email, name);
			return newCust.id;
		}
		await ensureInsforgeUser(email, name);
	} catch (err) {
		console.warn("ensureCustomerFromClerk notice:", err?.message);
	}
	return null;
};
/**
* Ensures user is also present in InsForge's global `users` table
* for platform analytics and dashboard visibility.
*/
var ensureInsforgeUser = async (email, displayName) => {
	if (!email) return null;
	try {
		const { data: existing } = await insforgeServer.database.from("users").select("id").eq("email", email).limit(1);
		if (existing && existing.length > 0 && existing[0]) return existing[0].id;
		const newId = crypto.randomUUID();
		const { data: created } = await insforgeServer.database.from("users").insert([{
			id: newId,
			email,
			display_name: displayName || email.split("@")[0],
			status: "active"
		}]).select("id").single();
		return created?.id || newId;
	} catch (err) {
		console.warn("ensureInsforgeUser notice:", err?.message);
		return null;
	}
};
/**
* Resolves current tenant UUID safely to maintain strict tenant isolation.
* Automatically provisions a fresh onboarding tenant for new users and syncs Clerk profile.
*/
var resolveCurrentTenantId = async (explicitTenantId, clerkUserId, userEmail, userName) => {
	let authenticatedUserId = null;
	let hasActiveRequestContext = false;
	try {
		const { getRequest } = await import("./server-B1QAtr5c.js");
		const req = getRequest();
		if (req) {
			hasActiveRequestContext = true;
			const { extractAuthUserFromRequest } = await import("./clerk.server-DiamVK2c.js");
			const auth = await extractAuthUserFromRequest(req);
			if (auth?.userId) authenticatedUserId = auth.userId;
		}
	} catch {}
	if (!hasActiveRequestContext || !authenticatedUserId) return null;
	if (authenticatedUserId) {
		if (clerkUserId && clerkUserId !== authenticatedUserId) {
			console.warn("[Security] Rejected Clerk identity mismatch");
			return null;
		}
		clerkUserId = authenticatedUserId;
	} else if (hasActiveRequestContext && !clerkUserId) return null;
	if (clerkUserId) {
		const { data: memberships } = await insforgeServer.database.from("tenant_members").select("tenant_id").eq("clerk_user_id", clerkUserId).eq("status", "active");
		if (memberships && memberships.length > 0) {
			if (explicitTenantId) {
				if (!memberships.some((m) => m.tenant_id === explicitTenantId)) {
					console.warn(`[Security] Cross-tenant access blocked: user ${clerkUserId} requested tenant ${explicitTenantId} but belongs to [${memberships.map((m) => m.tenant_id).join(", ")}]`);
					return null;
				}
				return explicitTenantId;
			}
			const firstMembership = memberships[0];
			if (memberships.length === 1 && firstMembership) return firstMembership.tenant_id;
			console.warn(`[Security] Ambiguous tenant membership: user ${clerkUserId} belongs to ${memberships.length} tenants. Explicit authorized tenant selection required.`);
			return null;
		}
		let finalEmail = userEmail;
		let finalName = userName;
		try {
			const { clerkClient } = await import("./clerk.server-DiamVK2c.js");
			const clerkUser = await clerkClient.users.getUser(clerkUserId).catch(() => null);
			if (clerkUser) {
				finalEmail = finalEmail || clerkUser.emailAddresses[0]?.emailAddress;
				finalName = finalName || [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || finalEmail?.split("@")[0];
			}
		} catch (e) {
			console.warn("Clerk lookup in resolveCurrentTenantId notice:", e?.message);
		}
		const orgName = finalName ? `${finalName}'s Agency` : "My Insurance Agency";
		const cleanSlug = "agency-" + (clerkUserId.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toLowerCase() || Math.random().toString(36).slice(2, 8));
		const { data: newTenant, error: insertErr } = await insforgeServer.database.from("tenants").insert([{
			name: orgName,
			slug: cleanSlug,
			status: "active",
			branding_config: {
				onboarding_step: 0,
				onboarding_completed: false,
				organization_details: {
					agency_name: orgName,
					business_type: "Agency / Brokerage",
					contact_name: finalName || "",
					contact_email: finalEmail || "",
					lines_of_insurance: ["Health Insurance", "Motor / Auto"],
					preferred_language: "English"
				},
				agent_config: {
					name: "Anya",
					voice_style: "Warm & Reassuring",
					greeting: "Hello! Thank you for calling our office. I am Anya, your AI insurance assistant. How can I assist you with your policy, coverage, or claim inquiry today?",
					supported_languages: [
						"English",
						"Hindi",
						"Hinglish"
					],
					tone: "Warm & Professional",
					instructions: "Help policyholders with coverage, claims intake, and status verification. Escalate high-risk changes to staff."
				},
				supported_workflows: [
					"policy_enquiries",
					"fnol_intake",
					"claim_status",
					"renewal_enquiries",
					"document_collection",
					"human_handoff"
				],
				call_handling: {
					channel: "browser_webrtc",
					working_hours: "Monday - Saturday 9 AM - 8 PM IST",
					after_hours_route: "emergency_voicemail"
				}
			}
		}]).select("id").single();
		if (!insertErr && newTenant?.id) {
			await insforgeServer.database.from("tenant_members").insert([{
				tenant_id: newTenant.id,
				clerk_user_id: clerkUserId,
				role: "owner",
				status: "active"
			}]);
			return newTenant.id;
		}
	}
	return null;
};
var DashboardMetricsInput = z.object({
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional()
});
var getDashboardMetrics_createServerFn_handler = createServerRpc({
	id: "f668a74c40985a92c5cd84769a8feb52dd4fdabd77b68691d63848df1027ae36",
	name: "getDashboardMetrics",
	filename: "src/lib/insurance.functions.ts"
}, (opts) => getDashboardMetrics.__executeServer(opts));
var getDashboardMetrics = createServerFn({
	method: "GET",
	strict: false
}).validator((input) => DashboardMetricsInput.parse(input ?? {})).handler(getDashboardMetrics_createServerFn_handler, async ({ data: input }) => {
	try {
		const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
		if (!tenantId) return {
			totalCalls: 0,
			resolvedCalls: 0,
			transfers: 0,
			leads: 0,
			automationRate: 0,
			policiesCount: 0,
			claimsCount: 0,
			approvalsCount: 0,
			sessionsCount: 0,
			recentApprovals: [],
			recentSessions: []
		};
		const [policiesRes, claimsRes, approvalsRes, sessionsRes, resolvedSessionsRes, transfersRes, leadsRes, recentApprovalsRes, recentSessionsRes] = await Promise.all([
			insforgeServer.database.from("policies").select("id", { count: "exact" }).eq("tenant_id", tenantId),
			insforgeServer.database.from("claims").select("id", { count: "exact" }).eq("tenant_id", tenantId),
			insforgeServer.database.from("approval_requests").select("id", { count: "exact" }).eq("tenant_id", tenantId),
			insforgeServer.database.from("call_sessions").select("id", { count: "exact" }).eq("tenant_id", tenantId),
			insforgeServer.database.from("call_sessions").select("id", { count: "exact" }).eq("tenant_id", tenantId).eq("status", "completed"),
			insforgeServer.database.from("human_transfers").select("id", { count: "exact" }),
			insforgeServer.database.from("follow_ups").select("id", { count: "exact" }),
			insforgeServer.database.from("approval_requests").select("id, request_type, status, created_at, payload").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(5),
			insforgeServer.database.from("call_sessions").select("id, room_name, caller_name, started_at, duration_sec, status").eq("tenant_id", tenantId).order("started_at", { ascending: false }).limit(5)
		]);
		const totalCalls = sessionsRes.count ?? (sessionsRes.data?.length || 0);
		const resolvedCalls = resolvedSessionsRes.count ?? (resolvedSessionsRes.data?.length || 0);
		const transfers = transfersRes.count ?? (transfersRes.data?.length || 0);
		const leads = leadsRes.count ?? (leadsRes.data?.length || 0);
		const automationRate = totalCalls > 0 ? Math.min(100, Math.round((resolvedCalls - transfers) / totalCalls * 100)) : 0;
		return {
			totalCalls,
			resolvedCalls,
			transfers,
			leads,
			automationRate: Math.max(0, automationRate),
			policiesCount: policiesRes.count ?? (policiesRes.data?.length || 0),
			claimsCount: claimsRes.count ?? (claimsRes.data?.length || 0),
			approvalsCount: approvalsRes.count ?? (approvalsRes.data?.length || 0),
			sessionsCount: totalCalls,
			recentApprovals: approvalsRes.count && approvalsRes.count > 0 ? recentApprovalsRes.data ?? [] : [],
			recentSessions: recentSessionsRes.data ?? []
		};
	} catch (err) {
		console.error("Dashboard metrics error:", err);
		throw new Error(err.message || "Failed to load dashboard metrics");
	}
});
var ScopedTenantInput = z.object({
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional()
});
var getPolicies_createServerFn_handler = createServerRpc({
	id: "783ad7e5698af7439233d958056689ce14a269104918467a750751dff4af90cf",
	name: "getPolicies",
	filename: "src/lib/insurance.functions.ts"
}, (opts) => getPolicies.__executeServer(opts));
var getPolicies = createServerFn({
	method: "GET",
	strict: false
}).validator((input) => ScopedTenantInput.parse(input ?? {})).handler(getPolicies_createServerFn_handler, async ({ data: input }) => {
	try {
		const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
		if (!tenantId) return [];
		const { data: policies, error } = await insforgeServer.database.from("policies").select("id, policy_number, plan_name, policy_type, premium_amount, due_date, status, nominee_name, nominee_relationship, customer_id").eq("tenant_id", tenantId).order("created_at", { ascending: false });
		if (error) throw new Error(error.message);
		if (!policies || policies.length === 0) return [];
		const customerIds = [...new Set(policies.map((p) => p.customer_id).filter(Boolean))];
		const { data: custs } = customerIds.length > 0 ? await insforgeServer.database.from("customers").select("id, name, customer_number").eq("tenant_id", tenantId).in("id", customerIds) : { data: [] };
		const custMap = new Map((custs || []).map((c) => [c.id, c]));
		return policies.map((p) => ({
			...p,
			customers: custMap.get(p.customer_id) || null
		}));
	} catch (err) {
		console.error("Get policies error:", err);
		throw new Error(err.message || "Failed to load policies");
	}
});
var getClaims_createServerFn_handler = createServerRpc({
	id: "828d03fa063c0cdf6553829c10f67a4397f92464f381bd306d0df84d8db420b6",
	name: "getClaims",
	filename: "src/lib/insurance.functions.ts"
}, (opts) => getClaims.__executeServer(opts));
var getClaims = createServerFn({
	method: "GET",
	strict: false
}).validator((input) => ScopedTenantInput.parse(input ?? {})).handler(getClaims_createServerFn_handler, async ({ data: input }) => {
	try {
		const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
		if (!tenantId) return [];
		const { data: claims, error: claimsErr } = await insforgeServer.database.from("claims").select("id, claim_number, incident_date, estimated_amount, description, status, risk_score, created_at, customer_id, policy_id").eq("tenant_id", tenantId).order("created_at", { ascending: false });
		if (claimsErr) throw new Error(claimsErr.message);
		if (!claims || claims.length === 0) return [];
		const policyIds = [...new Set(claims.map((c) => c.policy_id).filter(Boolean))];
		const customerIds = [...new Set(claims.map((c) => c.customer_id).filter(Boolean))];
		const [policiesRes, customersRes] = await Promise.all([policyIds.length > 0 ? insforgeServer.database.from("policies").select("id, policy_number, plan_name").eq("tenant_id", tenantId).in("id", policyIds) : { data: [] }, customerIds.length > 0 ? insforgeServer.database.from("customers").select("id, name, phone").eq("tenant_id", tenantId).in("id", customerIds) : { data: [] }]);
		const policyMap = new Map((policiesRes.data || []).map((p) => [p.id, p]));
		const customerMap = new Map((customersRes.data || []).map((c) => [c.id, c]));
		return claims.map((c) => ({
			...c,
			policies: policyMap.get(c.policy_id) || null,
			customers: customerMap.get(c.customer_id) || null
		}));
	} catch (err) {
		console.error("Get claims error:", err);
		throw new Error(err.message || "Failed to load claims");
	}
});
var getApprovalRequests_createServerFn_handler = createServerRpc({
	id: "3c20f6d6ebeb357499ec35f740cfede8e05511269f9e5a8e69b1826841abac38",
	name: "getApprovalRequests",
	filename: "src/lib/insurance.functions.ts"
}, (opts) => getApprovalRequests.__executeServer(opts));
var getApprovalRequests = createServerFn({
	method: "GET",
	strict: false
}).validator((input) => ScopedTenantInput.parse(input ?? {})).handler(getApprovalRequests_createServerFn_handler, async ({ data: input }) => {
	try {
		const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
		if (!tenantId) return [];
		const { data: requests, error } = await insforgeServer.database.from("approval_requests").select("id, request_type, payload, status, risk_level, reason, created_at, policy_id, customer_id").eq("tenant_id", tenantId).order("created_at", { ascending: false });
		if (error) throw new Error(error.message);
		if (!requests || requests.length === 0) return [];
		const policyIds = [...new Set(requests.map((r) => r.policy_id).filter(Boolean))];
		const customerIds = [...new Set(requests.map((r) => r.customer_id).filter(Boolean))];
		const [policiesRes, customersRes] = await Promise.all([policyIds.length > 0 ? insforgeServer.database.from("policies").select("id, policy_number").eq("tenant_id", tenantId).in("id", policyIds) : { data: [] }, customerIds.length > 0 ? insforgeServer.database.from("customers").select("id, name").eq("tenant_id", tenantId).in("id", customerIds) : { data: [] }]);
		const policyMap = new Map((policiesRes.data || []).map((p) => [p.id, p]));
		const customerMap = new Map((customersRes.data || []).map((c) => [c.id, c]));
		return requests.map((r) => ({
			...r,
			policies: policyMap.get(r.policy_id) || null,
			customers: customerMap.get(r.customer_id) || null
		}));
	} catch (err) {
		console.error("Get approval requests error:", err);
		throw new Error(err.message || "Failed to load approval requests");
	}
});
var UpdateApprovalInput = z.object({
	id: z.string().uuid(),
	status: z.enum(["approved", "rejected"]),
	staffNotes: z.string().optional()
});
var updateApprovalStatus_createServerFn_handler = createServerRpc({
	id: "11baa04d6287e6fbd2ff9340cc0f4a0e2e7bead0942a1d47159f01f917e9feca",
	name: "updateApprovalStatus",
	filename: "src/lib/insurance.functions.ts"
}, (opts) => updateApprovalStatus.__executeServer(opts));
var updateApprovalStatus = createServerFn({ method: "POST" }).validator((input) => UpdateApprovalInput.parse(input)).handler(updateApprovalStatus_createServerFn_handler, async ({ data }) => {
	try {
		const { data: req, error: fetchErr } = await insforgeServer.database.from("approval_requests").select("id, tenant_id, customer_id, policy_id, request_type, payload, status").eq("id", data.id).maybeSingle();
		if (fetchErr || !req) throw new Error("Approval request not found in database");
		if (data.status === "approved") {
			const payload = (typeof req.payload === "string" ? JSON.parse(req.payload) : req.payload) || {};
			if (req.request_type === "update_nominee" && req.policy_id) await insforgeServer.database.from("policies").update({
				nominee_name: payload.new_nominee || payload.nominee_name,
				nominee_relationship: payload.relationship || payload.nominee_relationship,
				updated_at: (/* @__PURE__ */ new Date()).toISOString()
			}).eq("id", req.policy_id).eq("tenant_id", req.tenant_id);
			else if (req.request_type === "cancel_policy" && req.policy_id) await insforgeServer.database.from("policies").update({
				status: "cancelled",
				updated_at: (/* @__PURE__ */ new Date()).toISOString()
			}).eq("id", req.policy_id).eq("tenant_id", req.tenant_id);
			else if ((req.request_type === "update_phone" || req.request_type === "update_contact") && req.customer_id) {
				if (payload.new_phone || payload.phone) await insforgeServer.database.from("customers").update({
					phone: payload.new_phone || payload.phone,
					updated_at: (/* @__PURE__ */ new Date()).toISOString()
				}).eq("id", req.customer_id).eq("tenant_id", req.tenant_id);
			}
		}
		const { data: updated, error } = await insforgeServer.database.from("approval_requests").update({
			status: data.status,
			decided_at: (/* @__PURE__ */ new Date()).toISOString(),
			decision_notes: data.staffNotes || null,
			updated_at: (/* @__PURE__ */ new Date()).toISOString()
		}).eq("id", data.id).select().single();
		if (error) throw new Error(error.message);
		try {
			await insforgeServer.database.from("audit_logs").insert([{
				tenant_id: req.tenant_id,
				customer_id: req.customer_id,
				actor_type: "staff_officer",
				actor_id: "compliance_officer",
				action: `approval_${data.status}`,
				target_resource: "approval_requests",
				target_id: data.id,
				risk_level: "high",
				status: "success",
				payload: {
					request_type: req.request_type,
					decision: data.status,
					notes: data.staffNotes || null,
					original_payload: req.payload
				},
				created_at: (/* @__PURE__ */ new Date()).toISOString()
			}]);
		} catch (aErr) {
			console.warn("Audit log notice:", aErr?.message);
		}
		return updated;
	} catch (err) {
		console.error("Update approval status error:", err);
		throw new Error(err.message || "Failed to update approval status");
	}
});
var getCallSessions_createServerFn_handler = createServerRpc({
	id: "0269a2c44d55789f56dfd3daf39cc96b7f4006ed50d3798b665883c4da87a20c",
	name: "getCallSessions",
	filename: "src/lib/insurance.functions.ts"
}, (opts) => getCallSessions.__executeServer(opts));
var getCallSessions = createServerFn({
	method: "GET",
	strict: false
}).validator((input) => ScopedTenantInput.parse(input ?? {})).handler(getCallSessions_createServerFn_handler, async ({ data: input }) => {
	try {
		const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
		if (!tenantId) return [];
		const { data: sessions, error } = await insforgeServer.database.from("call_sessions").select("id, room_name, caller_name, caller_phone, started_at, ended_at, duration_sec, status, transcript, risk_state, customer_id").eq("tenant_id", tenantId).order("started_at", { ascending: false });
		if (error) throw new Error(error.message);
		if (!sessions || sessions.length === 0) return [];
		const customerIds = [...new Set(sessions.map((s) => s.customer_id).filter(Boolean))];
		const { data: custs } = customerIds.length > 0 ? await insforgeServer.database.from("customers").select("id, name, customer_number").eq("tenant_id", tenantId).in("id", customerIds) : { data: [] };
		const custMap = new Map((custs || []).map((c) => [c.id, c]));
		return sessions.map((s) => ({
			...s,
			customers: custMap.get(s.customer_id) || (s.caller_name ? { name: s.caller_name } : null)
		}));
	} catch (err) {
		console.error("Get call sessions error:", err);
		throw new Error(err.message || "Failed to load call sessions");
	}
});
var getAuditLogs_createServerFn_handler = createServerRpc({
	id: "5330477c559084ef504f7f2e35b1faca06af21538338e7a1537b4954ef509bcd",
	name: "getAuditLogs",
	filename: "src/lib/insurance.functions.ts"
}, (opts) => getAuditLogs.__executeServer(opts));
var getAuditLogs = createServerFn({
	method: "GET",
	strict: false
}).validator((input) => ScopedTenantInput.parse(input ?? {})).handler(getAuditLogs_createServerFn_handler, async ({ data: input }) => {
	try {
		const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
		if (!tenantId) return [];
		const { data, error } = await insforgeServer.database.from("audit_logs").select("id, actor_type, actor_id, action, target_resource, target_id, risk_level, status, payload, created_at, customer_id, call_session_id").eq("tenant_id", tenantId).order("created_at", { ascending: false });
		if (error) throw new Error(error.message);
		return data ?? [];
	} catch (err) {
		console.error("Get audit logs error:", err);
		throw new Error(err.message || "Failed to load audit logs");
	}
});
var GetTenantInput = z.object({
	clerkUserId: z.string().optional(),
	userEmail: z.string().optional(),
	userName: z.string().optional(),
	tenantId: z.string().uuid().optional()
});
var getTenantSettings_createServerFn_handler = createServerRpc({
	id: "f87222bd71c9978e3dcbd22fe0a49cfca584a7762af75713484a365823a46dad",
	name: "getTenantSettings",
	filename: "src/lib/insurance.functions.ts"
}, (opts) => getTenantSettings.__executeServer(opts));
var getTenantSettings = createServerFn({
	method: "GET",
	strict: false
}).validator((input) => GetTenantInput.parse(input ?? {})).handler(getTenantSettings_createServerFn_handler, async ({ data: input }) => {
	try {
		const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId, input?.userEmail, input?.userName);
		if (!tenantId) return null;
		const { data: tenant, error } = await insforgeServer.database.from("tenants").select("id, name, slug, status, branding_config, created_at").eq("id", tenantId).maybeSingle();
		if (error) throw new Error(error.message);
		return tenant ?? null;
	} catch (err) {
		console.error("Get tenant settings error:", err);
		throw new Error(err.message || "Failed to load tenant settings");
	}
});
var UpdateTenantInput = z.object({
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional(),
	name: z.string().min(1),
	slug: z.string().optional(),
	branding_config: z.record(z.unknown()).default({})
});
var updateTenantSettings_createServerFn_handler = createServerRpc({
	id: "e874ee427f20b249e16fe761ca530cd61b803de338042b09e8f26d47ead8895c",
	name: "updateTenantSettings",
	filename: "src/lib/insurance.functions.ts"
}, (opts) => updateTenantSettings.__executeServer(opts));
var updateTenantSettings = createServerFn({ method: "POST" }).validator((input) => UpdateTenantInput.parse(input)).handler(updateTenantSettings_createServerFn_handler, async ({ data }) => {
	try {
		const slug = data.slug ? data.slug.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/(^-|-$)/g, "") : data.name.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/(^-|-$)/g, "") || "company-workspace";
		let targetTenantId = data.tenantId;
		if (!targetTenantId && data.clerkUserId) {
			const { data: member } = await insforgeServer.database.from("tenant_members").select("tenant_id").eq("clerk_user_id", data.clerkUserId).eq("status", "active").maybeSingle();
			if (member?.tenant_id) targetTenantId = member.tenant_id;
		}
		if (!targetTenantId) {
			const { data: existing } = await insforgeServer.database.from("tenants").select("id").order("created_at", { ascending: false }).limit(1).maybeSingle();
			targetTenantId = existing?.id;
		}
		let tenant;
		if (targetTenantId) {
			const { data: updated, error } = await insforgeServer.database.from("tenants").update({
				name: data.name,
				slug,
				branding_config: data.branding_config,
				updated_at: (/* @__PURE__ */ new Date()).toISOString()
			}).eq("id", targetTenantId).select().maybeSingle();
			if (error) throw error;
			tenant = updated;
		} else {
			const { data: inserted, error } = await insforgeServer.database.from("tenants").insert([{
				name: data.name,
				slug,
				status: "active",
				branding_config: data.branding_config
			}]).select().maybeSingle();
			if (error) throw error;
			tenant = inserted;
		}
		if (data.clerkUserId && tenant?.id) try {
			await insforgeServer.database.from("tenant_members").upsert([{
				tenant_id: tenant.id,
				clerk_user_id: data.clerkUserId,
				role: "owner",
				status: "active"
			}], { onConflict: "tenant_id,clerk_user_id" });
		} catch (_) {}
		return tenant;
	} catch (err) {
		console.error("Update tenant settings error:", err);
		throw new Error(err.message || "Failed to update tenant settings");
	}
});
var UpdatePlanInput = z.object({ plan: z.enum([
	"starter",
	"growth",
	"business",
	"enterprise"
]) });
var updateSubscriptionPlan_createServerFn_handler = createServerRpc({
	id: "47c46c463505222869944512ca0ee53891552810a0ef094d04f58c032f592d2e",
	name: "updateSubscriptionPlan",
	filename: "src/lib/insurance.functions.ts"
}, (opts) => updateSubscriptionPlan.__executeServer(opts));
var updateSubscriptionPlan = createServerFn({ method: "POST" }).validator((input) => UpdatePlanInput.parse(input)).handler(updateSubscriptionPlan_createServerFn_handler, async ({ data }) => {
	try {
		const tenantId = await resolveCurrentTenantId();
		if (!tenantId) throw new Error("No organization found. Please complete setup first.");
		const { data: tenant, error: fetchErr } = await insforgeServer.database.from("tenants").select("id, branding_config").eq("id", tenantId).maybeSingle();
		if (fetchErr || !tenant) throw new Error("Tenant record not found.");
		const branding = tenant.branding_config || {};
		branding.plan = data.plan;
		const { data: updated, error } = await insforgeServer.database.from("tenants").update({
			branding_config: branding,
			updated_at: (/* @__PURE__ */ new Date()).toISOString()
		}).eq("id", tenantId).select().single();
		if (error) throw error;
		return updated;
	} catch (err) {
		console.error("Update subscription plan error:", err);
		throw new Error(err.message || "Failed to update subscription plan");
	}
});
var SyncClerkInput = z.object({
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional()
});
var syncClerkUser_createServerFn_handler = createServerRpc({
	id: "5dbec3693d43314518ee8f254bea00cdff97a6f9a95659ba01055d878ef458bf",
	name: "syncClerkUser",
	filename: "src/lib/insurance.functions.ts"
}, (opts) => syncClerkUser.__executeServer(opts));
var syncClerkUser = createServerFn({ method: "POST" }).validator((input) => SyncClerkInput.parse(input ?? {})).handler(syncClerkUser_createServerFn_handler, async ({ data: input }) => {
	try {
		const { clerkClient } = await import("./clerk.server-DiamVK2c.js");
		const targetTenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
		if (!targetTenantId) throw new Error("Tenant could not be resolved for sync.");
		const users = await clerkClient.users.getUserList({ limit: 50 });
		let syncedCount = 0;
		for (const u of users.data) {
			const email = u.emailAddresses[0]?.emailAddress || "user@example.com";
			const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || email.split("@")[0] || "Policyholder";
			const phone = u.phoneNumbers[0]?.phoneNumber || "+91 98765 43210";
			const custNumber = "CUST-" + u.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
			const { data: custRecord, error: custErr } = await insforgeServer.database.from("customers").upsert([{
				tenant_id: targetTenantId,
				clerk_user_id: u.id,
				customer_number: custNumber,
				name,
				email,
				phone,
				status: "active"
			}], { onConflict: "tenant_id,customer_number" }).select("id, name, customer_number").single();
			if (custErr) {
				console.error("Error upserting customer:", custErr);
				continue;
			}
			await insforgeServer.database.from("tenant_members").upsert([{
				tenant_id: targetTenantId,
				clerk_user_id: u.id,
				role: "owner",
				status: "active"
			}], { onConflict: "tenant_id,clerk_user_id" });
			if (custRecord?.id) {
				const polNumber = "POL-" + custNumber.replace("CUST-", "") + "-HLT";
				await insforgeServer.database.from("policies").upsert([{
					tenant_id: targetTenantId,
					customer_id: custRecord.id,
					policy_number: polNumber,
					policy_type: "health",
					plan_name: "Comprehensive Health Shield Platinum",
					nominee_name: "Designated Nominee",
					nominee_relationship: "Spouse",
					premium_amount: 18500,
					due_date: "2026-11-30",
					status: "active"
				}], { onConflict: "tenant_id,policy_number" });
			}
			syncedCount++;
		}
		return {
			ok: true,
			syncedCount
		};
	} catch (err) {
		console.error("Sync Clerk user error:", err);
		throw new Error(err.message || "Failed to sync Clerk users");
	}
});
var RegisterClerkUserInput = z.object({
	clerkUserId: z.string(),
	email: z.string().optional(),
	name: z.string().optional(),
	phone: z.string().optional()
});
var registerClerkUser_createServerFn_handler = createServerRpc({
	id: "9138a7c8fa8c95210b737dc20758f904624635e7ebac6c955ffbd478fc511fc4",
	name: "registerClerkUser",
	filename: "src/lib/insurance.functions.ts"
}, (opts) => registerClerkUser.__executeServer(opts));
var registerClerkUser = createServerFn({ method: "POST" }).validator((input) => RegisterClerkUserInput.parse(input)).handler(registerClerkUser_createServerFn_handler, async ({ data }) => {
	try {
		const tenantId = await resolveCurrentTenantId(void 0, data.clerkUserId, data.email, data.name);
		if (!tenantId) throw new Error("Failed to initialize or resolve insurance carrier tenant");
		return {
			success: true,
			tenantId,
			customerId: await ensureCustomerFromClerk(tenantId, data.clerkUserId, data.email, data.name)
		};
	} catch (err) {
		console.error("registerClerkUser error:", err);
		throw new Error(err.message || "Failed to register Clerk user");
	}
});
var CallerProfileInput = z.object({
	clerkUserId: z.string().optional(),
	email: z.string().optional(),
	tenantId: z.string().uuid().optional()
});
var getCallerProfile_createServerFn_handler = createServerRpc({
	id: "84a6cbcb795af5100df4d09b9cb122381eb82306ae6d6b03e1804bc04b10f61c",
	name: "getCallerProfile",
	filename: "src/lib/insurance.functions.ts"
}, (opts) => getCallerProfile.__executeServer(opts));
var getCallerProfile = createServerFn({ method: "POST" }).validator((input) => CallerProfileInput.parse(input)).handler(getCallerProfile_createServerFn_handler, async ({ data: input }) => {
	try {
		const targetTenantId = await resolveCurrentTenantId(input.tenantId, input.clerkUserId);
		let cust = null;
		if (input.clerkUserId) {
			let q = insforgeServer.database.from("customers").select("id, name, email, phone, customer_number, status, clerk_user_id, tenant_id").eq("clerk_user_id", input.clerkUserId);
			if (targetTenantId) q = q.eq("tenant_id", targetTenantId);
			const { data } = await q.order("created_at", { ascending: false }).limit(1);
			if (data && data.length > 0) cust = data[0];
		}
		if (!cust && input.email) {
			let q = insforgeServer.database.from("customers").select("id, name, email, phone, customer_number, status, clerk_user_id, tenant_id").eq("email", input.email);
			if (targetTenantId) q = q.eq("tenant_id", targetTenantId);
			const { data } = await q.order("created_at", { ascending: false }).limit(1);
			if (data && data.length > 0) cust = data[0];
		}
		if (!cust && input.clerkUserId && targetTenantId) try {
			const { clerkClient } = await import("./clerk.server-DiamVK2c.js");
			const clerkUser = await clerkClient.users.getUser(input.clerkUserId);
			if (clerkUser) {
				const email = clerkUser.emailAddresses[0]?.emailAddress || input.email || "user@example.com";
				const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || email.split("@")[0] || "Policyholder";
				const phone = clerkUser.phoneNumbers[0]?.phoneNumber || "+91 98765 43210";
				const custNumber = "CUST-" + clerkUser.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
				const { data: newCust } = await insforgeServer.database.from("customers").upsert([{
					tenant_id: targetTenantId,
					clerk_user_id: clerkUser.id,
					customer_number: custNumber,
					name,
					email,
					phone,
					status: "active"
				}], { onConflict: "tenant_id,customer_number" }).select("id, name, email, phone, customer_number, status, clerk_user_id, tenant_id").single();
				if (newCust) {
					cust = newCust;
					await insforgeServer.database.from("tenant_members").upsert([{
						tenant_id: targetTenantId,
						clerk_user_id: clerkUser.id,
						role: "owner",
						status: "active"
					}], { onConflict: "tenant_id,clerk_user_id" });
					const polNumber = "POL-" + custNumber.replace("CUST-", "") + "-HLT";
					await insforgeServer.database.from("policies").upsert([{
						tenant_id: targetTenantId,
						customer_id: newCust.id,
						policy_number: polNumber,
						policy_type: "health",
						plan_name: "Comprehensive Health Shield Platinum",
						nominee_name: "Designated Nominee",
						nominee_relationship: "Spouse",
						premium_amount: 18500,
						due_date: "2026-11-30",
						status: "active"
					}], { onConflict: "tenant_id,policy_number" });
				}
			}
		} catch (fetchErr) {
			console.warn("Direct Clerk user fetch notice:", fetchErr?.message);
		}
		if (!cust) return null;
		const { data: policies } = await insforgeServer.database.from("policies").select("id, policy_number, policy_type, plan_name, premium_amount, due_date, nominee_name, status").eq("customer_id", cust.id).eq("tenant_id", cust.tenant_id);
		return {
			customer: cust,
			policiesCount: policies?.length || 0,
			policies: policies || []
		};
	} catch (e) {
		console.warn("getCallerProfile notice:", e?.message);
		return null;
	}
});
//#endregion
export { getApprovalRequests_createServerFn_handler, getAuditLogs_createServerFn_handler, getCallSessions_createServerFn_handler, getCallerProfile_createServerFn_handler, getClaims_createServerFn_handler, getDashboardMetrics_createServerFn_handler, getPolicies_createServerFn_handler, getTenantSettings_createServerFn_handler, registerClerkUser_createServerFn_handler, syncClerkUser_createServerFn_handler, updateApprovalStatus_createServerFn_handler, updateSubscriptionPlan_createServerFn_handler, updateTenantSettings_createServerFn_handler };
