import { t as getServerFnById } from "./__23tanstack-start-server-fn-resolver-DQIam-KP.js";
import { d as TSS_SERVER_FUNCTION, t as createServerFn } from "./createServerFn-CIHAFgYl.js";
import { t as insforgeServer } from "./client.server-97EpFyCS.js";
import { z } from "zod";
//#region node_modules/@tanstack/start-server-core/dist/esm/createSsrRpc.js
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
//#endregion
//#region src/lib/insurance.functions.ts
/**
* Resolves current tenant UUID safely to maintain strict tenant isolation.
* Automatically provisions a fresh onboarding tenant for new users.
*/
/**
* Helper to ensure a genuine Clerk user has a corresponding customer & baseline policy record in the database.
*/
/**
* Ensures user is also present in InsForge's global `users` table
* for platform analytics and dashboard visibility.
*/
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
var getDashboardMetrics = createServerFn({
	method: "GET",
	strict: false
}).validator((input) => DashboardMetricsInput.parse(input ?? {})).handler(createSsrRpc("f668a74c40985a92c5cd84769a8feb52dd4fdabd77b68691d63848df1027ae36"));
var ScopedTenantInput = z.object({
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional()
});
var getPolicies = createServerFn({
	method: "GET",
	strict: false
}).validator((input) => ScopedTenantInput.parse(input ?? {})).handler(createSsrRpc("783ad7e5698af7439233d958056689ce14a269104918467a750751dff4af90cf"));
var getClaims = createServerFn({
	method: "GET",
	strict: false
}).validator((input) => ScopedTenantInput.parse(input ?? {})).handler(createSsrRpc("828d03fa063c0cdf6553829c10f67a4397f92464f381bd306d0df84d8db420b6"));
var getApprovalRequests = createServerFn({
	method: "GET",
	strict: false
}).validator((input) => ScopedTenantInput.parse(input ?? {})).handler(createSsrRpc("3c20f6d6ebeb357499ec35f740cfede8e05511269f9e5a8e69b1826841abac38"));
var UpdateApprovalInput = z.object({
	id: z.string().uuid(),
	status: z.enum(["approved", "rejected"]),
	staffNotes: z.string().optional()
});
var updateApprovalStatus = createServerFn({ method: "POST" }).validator((input) => UpdateApprovalInput.parse(input)).handler(createSsrRpc("11baa04d6287e6fbd2ff9340cc0f4a0e2e7bead0942a1d47159f01f917e9feca"));
var getCallSessions = createServerFn({
	method: "GET",
	strict: false
}).validator((input) => ScopedTenantInput.parse(input ?? {})).handler(createSsrRpc("0269a2c44d55789f56dfd3daf39cc96b7f4006ed50d3798b665883c4da87a20c"));
var getAuditLogs = createServerFn({
	method: "GET",
	strict: false
}).validator((input) => ScopedTenantInput.parse(input ?? {})).handler(createSsrRpc("5330477c559084ef504f7f2e35b1faca06af21538338e7a1537b4954ef509bcd"));
var GetTenantInput = z.object({
	clerkUserId: z.string().optional(),
	userEmail: z.string().optional(),
	userName: z.string().optional(),
	tenantId: z.string().uuid().optional()
});
var getTenantSettings = createServerFn({
	method: "GET",
	strict: false
}).validator((input) => GetTenantInput.parse(input ?? {})).handler(createSsrRpc("f87222bd71c9978e3dcbd22fe0a49cfca584a7762af75713484a365823a46dad"));
var UpdateTenantInput = z.object({
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional(),
	name: z.string().min(1),
	slug: z.string().optional(),
	branding_config: z.record(z.unknown()).default({})
});
var updateTenantSettings = createServerFn({ method: "POST" }).validator((input) => UpdateTenantInput.parse(input)).handler(createSsrRpc("e874ee427f20b249e16fe761ca530cd61b803de338042b09e8f26d47ead8895c"));
var UpdatePlanInput = z.object({ plan: z.enum([
	"starter",
	"growth",
	"business",
	"enterprise"
]) });
var updateSubscriptionPlan = createServerFn({ method: "POST" }).validator((input) => UpdatePlanInput.parse(input)).handler(createSsrRpc("47c46c463505222869944512ca0ee53891552810a0ef094d04f58c032f592d2e"));
var SyncClerkInput = z.object({
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional()
});
var syncClerkUser = createServerFn({ method: "POST" }).validator((input) => SyncClerkInput.parse(input ?? {})).handler(createSsrRpc("5dbec3693d43314518ee8f254bea00cdff97a6f9a95659ba01055d878ef458bf"));
var RegisterClerkUserInput = z.object({
	clerkUserId: z.string(),
	email: z.string().optional(),
	name: z.string().optional(),
	phone: z.string().optional()
});
var registerClerkUser = createServerFn({ method: "POST" }).validator((input) => RegisterClerkUserInput.parse(input)).handler(createSsrRpc("9138a7c8fa8c95210b737dc20758f904624635e7ebac6c955ffbd478fc511fc4"));
var CallerProfileInput = z.object({
	clerkUserId: z.string().optional(),
	email: z.string().optional(),
	tenantId: z.string().uuid().optional()
});
var getCallerProfile = createServerFn({ method: "POST" }).validator((input) => CallerProfileInput.parse(input)).handler(createSsrRpc("84a6cbcb795af5100df4d09b9cb122381eb82306ae6d6b03e1804bc04b10f61c"));
//#endregion
export { getClaims as a, getTenantSettings as c, syncClerkUser as d, updateApprovalStatus as f, createSsrRpc as h, getCallerProfile as i, registerClerkUser as l, updateTenantSettings as m, getAuditLogs as n, getDashboardMetrics as o, updateSubscriptionPlan as p, getCallSessions as r, getPolicies as s, getApprovalRequests as t, resolveCurrentTenantId as u };
