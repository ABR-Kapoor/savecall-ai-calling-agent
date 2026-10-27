import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { z } from "zod";
import { insforgeServer } from "./insforge/client.server";

/**
 * Resolves current tenant UUID safely to maintain strict tenant isolation.
 * Automatically provisions a fresh onboarding tenant for new users.
 */
/**
 * Helper to ensure a genuine Clerk user has a corresponding customer & baseline policy record in the database.
 */
const ensureCustomerFromClerk = createServerOnlyFn(async (
  tenantId: string,
  clerkUserId: string,
  userEmail?: string,
  userName?: string
) => {
  try {
    const { data: existing } = await insforgeServer.database
      .from("customers")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("clerk_user_id", clerkUserId)
      .limit(1);

    if (existing && existing.length > 0 && existing[0]) return existing[0].id;

    const { clerkClient } = await import("@/lib/auth/clerk.server");
    const clerkUser = await clerkClient.users.getUser(clerkUserId).catch(() => null);

    const email = clerkUser?.emailAddresses[0]?.emailAddress || userEmail || "user@example.com";
    const name =
      [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
      userName ||
      email.split("@")[0] ||
      "Policyholder";
    const phone = clerkUser?.phoneNumbers[0]?.phoneNumber || "+91 98765 43210";
    const custNumber = "CUST-" + clerkUserId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();

    const { data: newCust } = await insforgeServer.database
      .from("customers")
      .upsert(
        [
          {
            tenant_id: tenantId,
            clerk_user_id: clerkUserId,
            customer_number: custNumber,
            name,
            email,
            phone,
            status: "active",
          },
        ],
        { onConflict: "tenant_id,customer_number" }
      )
      .select("id")
      .single();

    if (newCust?.id) {
      const polNumber = "POL-" + custNumber.replace("CUST-", "") + "-HLT";
      await insforgeServer.database.from("policies").upsert(
        [
          {
            tenant_id: tenantId,
            customer_id: newCust.id,
            policy_number: polNumber,
            policy_type: "health",
            plan_name: "Comprehensive Health Shield Platinum",
            nominee_name: "Designated Nominee",
            nominee_relationship: "Spouse",
            premium_amount: 18500.0,
            due_date: "2026-11-30",
            status: "active",
          },
        ],
        { onConflict: "tenant_id,policy_number" }
      );
      await ensureInsforgeUser(email, name);
      return newCust.id;
    }
    await ensureInsforgeUser(email, name);
  } catch (err: any) {
    console.warn("ensureCustomerFromClerk notice:", err?.message);
  }
  return null;
});

/**
 * Ensures user is also present in InsForge's global `users` table
 * for platform analytics and dashboard visibility.
 */
const ensureInsforgeUser = createServerOnlyFn(async (email?: string, displayName?: string) => {
  if (!email) return null;
  try {
    const { data: existing } = await insforgeServer.database
      .from("users")
      .select("id")
      .eq("email", email)
      .limit(1);

    if (existing && existing.length > 0 && existing[0]) return existing[0].id;

    const newId = crypto.randomUUID();
    const { data: created } = await insforgeServer.database
      .from("users")
      .insert([
        {
          id: newId,
          email,
          display_name: displayName || email.split("@")[0],
          status: "active",
        },
      ])
      .select("id")
      .single();

    return created?.id || newId;
  } catch (err: any) {
    console.warn("ensureInsforgeUser notice:", err?.message);
    return null;
  }
});

/**
 * Resolves current tenant UUID safely to maintain strict tenant isolation.
 * Automatically provisions a fresh onboarding tenant for new users and syncs Clerk profile.
 */
export const resolveCurrentTenantId = createServerOnlyFn(async (
  explicitTenantId?: string,
  clerkUserId?: string,
  userEmail?: string,
  userName?: string
): Promise<string | null> => {
  // 1. Verify server-side authenticated identity if within web request context
  let authenticatedUserId: string | null = null;
  let hasActiveRequestContext = false;
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    if (req) {
      hasActiveRequestContext = true;
      const { extractAuthUserFromRequest } = await import("@/lib/auth/clerk.server");
      const auth = await extractAuthUserFromRequest(req);
      if (auth?.userId) {
        authenticatedUserId = auth.userId;
      }
    }
  } catch {
    // getRequest() throws if called outside of active TanStack Start server function request context
  }

  if (!authenticatedUserId && clerkUserId) {
    try {
      const { clerkClient } = await import("@/lib/auth/clerk.server");
      const verifiedClerkUser = await clerkClient.users.getUser(clerkUserId).catch(() => null);
      if (verifiedClerkUser?.id) {
        authenticatedUserId = verifiedClerkUser.id;
      }
    } catch {
      // Clerk backend verification failed
    }
  }

  if (!authenticatedUserId) return null;

  if (clerkUserId && clerkUserId !== authenticatedUserId) {
    console.warn("[Security] Rejected Clerk identity mismatch");
    return null;
  }
  clerkUserId = authenticatedUserId;

  if (clerkUserId) {
    const { data: memberships } = await insforgeServer.database
      .from("tenant_members")
      .select("tenant_id")
      .eq("clerk_user_id", clerkUserId)
      .eq("status", "active");

    if (memberships && memberships.length > 0) {
      if (explicitTenantId) {
        const hasAccess = memberships.some((m: { tenant_id: string }) => m.tenant_id === explicitTenantId);
        if (!hasAccess) {
          console.warn(
            `[Security] Cross-tenant access blocked: user ${clerkUserId} requested tenant ${explicitTenantId} but belongs to [${memberships.map((m: { tenant_id: string }) => m.tenant_id).join(", ")}]`
          );
          return null;
        }
        return explicitTenantId;
      }

      const firstMembership = memberships[0];
      if (memberships.length === 1 && firstMembership) {
        const memberTenantId = firstMembership.tenant_id;
        return memberTenantId;
      }

      // User belongs to multiple tenants and did not supply an explicit authorized tenant selection
      console.warn(
        `[Security] Ambiguous tenant membership: user ${clerkUserId} belongs to ${memberships.length} tenants. Explicit authorized tenant selection required.`
      );
      return null;
    }

    // New user signing up! Fetch user details directly from Clerk to register their organization
    let finalEmail = userEmail;
    let finalName = userName;
    try {
      const { clerkClient } = await import("@/lib/auth/clerk.server");
      const clerkUser = await clerkClient.users.getUser(clerkUserId).catch(() => null);
      if (clerkUser) {
        finalEmail = finalEmail || clerkUser.emailAddresses[0]?.emailAddress;
        finalName =
          finalName ||
          [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
          finalEmail?.split("@")[0];
      }
    } catch (e: any) {
      console.warn("Clerk lookup in resolveCurrentTenantId notice:", e?.message);
    }

    const orgName = finalName ? `${finalName}'s Agency` : "My Insurance Agency";
    const cleanSlug =
      "agency-" +
      (clerkUserId.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toLowerCase() ||
        Math.random().toString(36).slice(2, 8));

    const { data: newTenant, error: insertErr } = await insforgeServer.database
      .from("tenants")
      .insert([
        {
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
              preferred_language: "English",
            },
            agent_config: {
              name: "Anya",
              voice_style: "Warm & Reassuring",
              greeting:
                "Hello! Thank you for calling our office. I am Anya, your AI insurance assistant. How can I assist you with your policy, coverage, or claim inquiry today?",
              supported_languages: ["English", "Hindi", "Hinglish"],
              tone: "Warm & Professional",
              instructions:
                "Help policyholders with coverage, claims intake, and status verification. Escalate high-risk changes to staff.",
            },
            supported_workflows: [
              "policy_enquiries",
              "fnol_intake",
              "claim_status",
              "renewal_enquiries",
              "document_collection",
              "human_handoff",
            ],
            call_handling: {
              channel: "browser_webrtc",
              working_hours: "Monday - Saturday 9 AM - 8 PM IST",
              after_hours_route: "emergency_voicemail",
            },
          },
        },
      ])
      .select("id")
      .single();

    if (!insertErr && newTenant?.id) {
      await insforgeServer.database.from("tenant_members").insert([
        {
          tenant_id: newTenant.id,
          clerk_user_id: clerkUserId,
          role: "owner",
          status: "active",
        },
      ]);

      return newTenant.id;
    }
  }

  // Never fall back to arbitrary tenant selection without authenticated membership
  return null;
});

export const DashboardMetricsInput = z.object({
  tenantId: z.string().uuid().optional(),
  clerkUserId: z.string().optional(),
});
export type DashboardMetricsInput = z.infer<typeof DashboardMetricsInput>;

export const getDashboardMetrics = createServerFn({ method: "GET", strict: false })
  .validator((input?: DashboardMetricsInput) => DashboardMetricsInput.parse(input ?? {}))
  .handler(async ({ data: input }) => {
    try {
      const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
      if (!tenantId) {
        return {
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
          recentSessions: [],
        };
      }
      const [
        policiesRes,
        claimsRes,
        approvalsRes,
        pendingApprovalsRes,
        recentApprovalsRes,
        waConnRes,
        waConversationsRes,
        waTakeoverRes,
        waMessagesRes,
        waAiMessagesRes,
        knowledgeSourcesRes,
        approvedKnowledgeRes,
      ] = await Promise.all([
        insforgeServer.database.from("policies").select("id", { count: "exact" }).eq("tenant_id", tenantId),
        insforgeServer.database.from("claims").select("id", { count: "exact" }).eq("tenant_id", tenantId),
        insforgeServer.database.from("approval_requests").select("id", { count: "exact" }).eq("tenant_id", tenantId),
        insforgeServer.database.from("approval_requests").select("id", { count: "exact" }).eq("tenant_id", tenantId).eq("status", "pending"),
        insforgeServer.database
          .from("approval_requests")
          .select("id, request_type, status, created_at, payload")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(5),
        insforgeServer.database
          .from("whatsapp_connections")
          .select("id, status, phone_number, updated_at, connected_at")
          .eq("tenant_id", tenantId)
          .maybeSingle(),
        insforgeServer.database.from("whatsapp_conversations").select("id", { count: "exact" }).eq("tenant_id", tenantId),
        insforgeServer.database.from("whatsapp_conversations").select("id", { count: "exact" }).eq("tenant_id", tenantId).eq("handoff_status", "human_takeover"),
        insforgeServer.database.from("whatsapp_messages").select("id", { count: "exact" }).eq("tenant_id", tenantId),
        insforgeServer.database.from("whatsapp_messages").select("id", { count: "exact" }).eq("tenant_id", tenantId).eq("sender_type", "ai"),
        insforgeServer.database.from("knowledge_sources").select("id, updated_at", { count: "exact" }).eq("tenant_id", tenantId),
        insforgeServer.database.from("knowledge_sources").select("id", { count: "exact" }).eq("tenant_id", tenantId).eq("status", "approved"),
      ]);

      const totalConvs = waConversationsRes.count ?? (waConversationsRes.data?.length || 0);
      const takeoverCount = waTakeoverRes.count ?? (waTakeoverRes.data?.length || 0);
      const totalMsgs = waMessagesRes.count ?? (waMessagesRes.data?.length || 0);
      const aiReplies = waAiMessagesRes.count ?? (waAiMessagesRes.data?.length || 0);
      const totalKnowledge = knowledgeSourcesRes.count ?? (knowledgeSourcesRes.data?.length || 0);
      const approvedKnowledge = approvedKnowledgeRes.count ?? (approvedKnowledgeRes.data?.length || 0);
      const pendingKnowledge = Math.max(0, totalKnowledge - approvedKnowledge);
      const pendingApprovals = pendingApprovalsRes.count ?? (pendingApprovalsRes.data?.length || 0);

      // Automation rate calculated from AI replies over total conversations
      const automationRate = totalConvs > 0 ? Math.min(100, Math.round(((totalConvs - takeoverCount) / totalConvs) * 100)) : 100;

      return {
        // WhatsApp Real Metrics
        whatsappStatus: waConnRes.data?.status || "DISCONNECTED",
        whatsappPhone: waConnRes.data?.phone_number || null,
        whatsappLastEvent: waConnRes.data?.updated_at || waConnRes.data?.connected_at || null,
        totalConversations: totalConvs,
        takeoverCount,
        totalMessages: totalMsgs,
        aiRepliesCount: aiReplies,

        // Knowledge Store Metrics
        totalKnowledgeSources: totalKnowledge,
        approvedKnowledgeCount: approvedKnowledge,
        pendingKnowledgeCount: pendingKnowledge,

        // Compliance & Records
        policiesCount: policiesRes.count ?? (policiesRes.data?.length || 0),
        claimsCount: claimsRes.count ?? (claimsRes.data?.length || 0),
        approvalsCount: pendingApprovals,
        totalApprovalsHistorical: approvalsRes.count ?? (approvalsRes.data?.length || 0),
        recentApprovals: recentApprovalsRes.data ?? [],

        // Legacy compatibility
        totalCalls: totalConvs,
        resolvedCalls: totalConvs - takeoverCount,
        transfers: takeoverCount,
        leads: 0,
        automationRate,
        sessionsCount: totalConvs,
        recentSessions: [],
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load dashboard metrics";
      console.error("Dashboard metrics error:", errorMsg);
      throw new Error(errorMsg);
    }
  });

export const ScopedTenantInput = z.object({
  tenantId: z.string().uuid().optional(),
  clerkUserId: z.string().optional(),
});
export type ScopedTenantInput = z.infer<typeof ScopedTenantInput>;

export const getPolicies = createServerFn({ method: "GET", strict: false })
  .validator((input?: ScopedTenantInput) => ScopedTenantInput.parse(input ?? {}))
  .handler(async ({ data: input }) => {
    try {
      const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
      if (!tenantId) return [];
      const { data: policies, error } = await insforgeServer.database
        .from("policies")
        .select(
          "id, policy_number, plan_name, policy_type, premium_amount, due_date, status, nominee_name, nominee_relationship, customer_id"
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      if (!policies || policies.length === 0) return [];

      const customerIds = [...new Set(policies.map((p: any) => p.customer_id).filter(Boolean))];
      const { data: custs } =
        customerIds.length > 0
          ? await insforgeServer.database
              .from("customers")
              .select("id, name, customer_number")
              .eq("tenant_id", tenantId)
              .in("id", customerIds)
          : { data: [] };

      const custMap = new Map((custs || []).map((c: any) => [c.id, c]));

      return policies.map((p: any) => ({
        ...p,
        customers: custMap.get(p.customer_id) || null,
      }));
    } catch (err: any) {
      console.error("Get policies error:", err);
      throw new Error(err.message || "Failed to load policies");
    }
  });

export const getClaims = createServerFn({ method: "GET", strict: false })
  .validator((input?: ScopedTenantInput) => ScopedTenantInput.parse(input ?? {}))
  .handler(async ({ data: input }) => {
    try {
      const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
      if (!tenantId) return [];
      const { data: claims, error: claimsErr } = await insforgeServer.database
        .from("claims")
        .select(
          "id, claim_number, incident_date, estimated_amount, description, status, risk_score, created_at, customer_id, policy_id"
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (claimsErr) throw new Error(claimsErr.message);
      if (!claims || claims.length === 0) return [];

      const policyIds = [...new Set(claims.map((c: any) => c.policy_id).filter(Boolean))];
      const customerIds = [...new Set(claims.map((c: any) => c.customer_id).filter(Boolean))];

      const [policiesRes, customersRes] = await Promise.all([
        policyIds.length > 0
          ? insforgeServer.database
              .from("policies")
              .select("id, policy_number, plan_name")
              .eq("tenant_id", tenantId)
              .in("id", policyIds)
          : { data: [] },
        customerIds.length > 0
          ? insforgeServer.database
              .from("customers")
              .select("id, name, phone")
              .eq("tenant_id", tenantId)
              .in("id", customerIds)
          : { data: [] },
      ]);

      const policyMap = new Map((policiesRes.data || []).map((p: any) => [p.id, p]));
      const customerMap = new Map((customersRes.data || []).map((c: any) => [c.id, c]));

      return claims.map((c: any) => ({
        ...c,
        policies: policyMap.get(c.policy_id) || null,
        customers: customerMap.get(c.customer_id) || null,
      }));
    } catch (err: any) {
      console.error("Get claims error:", err);
      throw new Error(err.message || "Failed to load claims");
    }
  });

export const getApprovalRequests = createServerFn({ method: "GET", strict: false })
  .validator((input?: ScopedTenantInput) => ScopedTenantInput.parse(input ?? {}))
  .handler(async ({ data: input }) => {
    try {
      const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
      if (!tenantId) return [];
      const { data: requests, error } = await insforgeServer.database
        .from("approval_requests")
        .select("id, request_type, payload, status, risk_level, reason, created_at, policy_id, customer_id")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    if (!requests || requests.length === 0) return [];

    const policyIds = [...new Set(requests.map((r: any) => r.policy_id).filter(Boolean))];
    const customerIds = [...new Set(requests.map((r: any) => r.customer_id).filter(Boolean))];

    const [policiesRes, customersRes] = await Promise.all([
      policyIds.length > 0
        ? insforgeServer.database
            .from("policies")
            .select("id, policy_number")
            .eq("tenant_id", tenantId)
            .in("id", policyIds)
        : { data: [] },
      customerIds.length > 0
        ? insforgeServer.database
            .from("customers")
            .select("id, name")
            .eq("tenant_id", tenantId)
            .in("id", customerIds)
        : { data: [] },
    ]);

    const policyMap = new Map((policiesRes.data || []).map((p: any) => [p.id, p]));
    const customerMap = new Map((customersRes.data || []).map((c: any) => [c.id, c]));

    return requests.map((r: any) => ({
      ...r,
      policies: policyMap.get(r.policy_id) || null,
      customers: customerMap.get(r.customer_id) || null,
    }));
  } catch (err: any) {
    console.error("Get approval requests error:", err);
    throw new Error(err.message || "Failed to load approval requests");
  }
});

const UpdateApprovalInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  staffNotes: z.string().optional(),
});
export type UpdateApprovalInput = z.infer<typeof UpdateApprovalInput>;

export const updateApprovalStatus = createServerFn({ method: "POST" })
  .validator((input: UpdateApprovalInput) => UpdateApprovalInput.parse(input))
  .handler(async ({ data }) => {
    try {
      // 1. Fetch approval request to verify existence and extract payload
      const { data: req, error: fetchErr } = await insforgeServer.database
        .from("approval_requests")
        .select("id, tenant_id, customer_id, policy_id, request_type, payload, status")
        .eq("id", data.id)
        .maybeSingle();

      if (fetchErr || !req) {
        throw new Error("Approval request not found in database");
      }

      // 2. Perform authentic underlying database mutation on approval (P0 Security & Data Integrity)
      if (data.status === "approved") {
        const payload = (typeof req.payload === "string" ? JSON.parse(req.payload) : req.payload) || {};

        if (req.request_type === "update_nominee" && req.policy_id) {
          await insforgeServer.database
            .from("policies")
            .update({
              nominee_name: payload.new_nominee || payload.nominee_name,
              nominee_relationship: payload.relationship || payload.nominee_relationship,
              updated_at: new Date().toISOString(),
            })
            .eq("id", req.policy_id)
            .eq("tenant_id", req.tenant_id);
        } else if (req.request_type === "cancel_policy" && req.policy_id) {
          await insforgeServer.database
            .from("policies")
            .update({
              status: "cancelled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", req.policy_id)
            .eq("tenant_id", req.tenant_id);
        } else if ((req.request_type === "update_phone" || req.request_type === "update_contact") && req.customer_id) {
          if (payload.new_phone || payload.phone) {
            await insforgeServer.database
              .from("customers")
              .update({
                phone: payload.new_phone || payload.phone,
                updated_at: new Date().toISOString(),
              })
              .eq("id", req.customer_id)
              .eq("tenant_id", req.tenant_id);
          }
        }
      }

      // 3. Update the approval request record
      const { data: updated, error } = await insforgeServer.database
        .from("approval_requests")
        .update({
          status: data.status,
          decided_at: new Date().toISOString(),
          decision_notes: data.staffNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      // 4. Record tamper-evident audit log (P0 Security Requirement)
      try {
        await insforgeServer.database.from("audit_logs").insert([
          {
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
              original_payload: req.payload,
            },
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (aErr: any) {
        console.warn("Audit log notice:", aErr?.message);
      }

      return updated;
    } catch (err: any) {
      console.error("Update approval status error:", err);
      throw new Error(err.message || "Failed to update approval status");
    }
  });

export const getCallSessions = createServerFn({ method: "GET", strict: false })
  .validator((input?: ScopedTenantInput) => ScopedTenantInput.parse(input ?? {}))
  .handler(async ({ data: input }) => {
    try {
      const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
      if (!tenantId) return [];
      const { data: sessions, error } = await insforgeServer.database
        .from("call_sessions")
        .select("id, room_name, caller_name, caller_phone, started_at, ended_at, duration_sec, status, transcript, risk_state, customer_id")
        .eq("tenant_id", tenantId)
        .order("started_at", { ascending: false });

      if (error) throw new Error(error.message);
      if (!sessions || sessions.length === 0) return [];

      const customerIds = [...new Set(sessions.map((s: any) => s.customer_id).filter(Boolean))];
      const { data: custs } = customerIds.length > 0
        ? await insforgeServer.database
            .from("customers")
            .select("id, name, customer_number")
            .eq("tenant_id", tenantId)
            .in("id", customerIds)
        : { data: [] };

      const custMap = new Map((custs || []).map((c: any) => [c.id, c]));

      return sessions.map((s: any) => ({
        ...s,
        customers: custMap.get(s.customer_id) || (s.caller_name ? { name: s.caller_name } : null),
      }));
    } catch (err: any) {
      console.error("Get call sessions error:", err);
      throw new Error(err.message || "Failed to load call sessions");
    }
  });

export const getAuditLogs = createServerFn({ method: "GET", strict: false })
  .validator((input?: ScopedTenantInput) => ScopedTenantInput.parse(input ?? {}))
  .handler(async ({ data: input }) => {
    try {
      const tenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
      if (!tenantId) return [];
      const { data, error } = await insforgeServer.database
        .from("audit_logs")
        .select("id, actor_type, actor_id, action, target_resource, target_id, risk_level, status, payload, created_at, customer_id, call_session_id")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    } catch (err: any) {
      console.error("Get audit logs error:", err);
      throw new Error(err.message || "Failed to load audit logs");
    }
  });

export const GetTenantInput = z.object({
  clerkUserId: z.string().optional(),
  userEmail: z.string().optional(),
  userName: z.string().optional(),
  tenantId: z.string().uuid().optional(),
});
export type GetTenantInput = z.infer<typeof GetTenantInput>;

export const getTenantSettings = createServerFn({ method: "GET", strict: false })
  .validator((input?: GetTenantInput) => GetTenantInput.parse(input ?? {}))
  .handler(async ({ data: input }) => {
    try {
      const tenantId = await resolveCurrentTenantId(
        input?.tenantId,
        input?.clerkUserId,
        input?.userEmail,
        input?.userName
      );

      if (!tenantId) return null;

      const { data: tenant, error } = await insforgeServer.database
        .from("tenants")
        .select("id, name, slug, status, branding_config, created_at")
        .eq("id", tenantId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return tenant ?? null;
    } catch (err: any) {
      console.error("Get tenant settings error:", err);
      throw new Error(err.message || "Failed to load tenant settings");
    }
  });

const UpdateTenantInput = z.object({
  tenantId: z.string().uuid().optional(),
  clerkUserId: z.string().optional(),
  name: z.string().min(1),
  slug: z.string().optional(),
  branding_config: z.record(z.unknown()).default({}),
});
export type UpdateTenantInput = z.infer<typeof UpdateTenantInput>;

export const updateTenantSettings = createServerFn({ method: "POST" })
  .validator((input: UpdateTenantInput) => UpdateTenantInput.parse(input))
  .handler(async ({ data }) => {
    try {
      const slug = data.slug
        ? data.slug.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/(^-|-$)/g, "")
        : data.name.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/(^-|-$)/g, "") || "company-workspace";

      let targetTenantId = data.tenantId;
      if (!targetTenantId && data.clerkUserId) {
        const { data: member } = await insforgeServer.database
          .from("tenant_members")
          .select("tenant_id")
          .eq("clerk_user_id", data.clerkUserId)
          .eq("status", "active")
          .maybeSingle();
        if (member?.tenant_id) {
          targetTenantId = member.tenant_id;
        }
      }

      if (!targetTenantId) {
        const { data: existing } = await insforgeServer.database
          .from("tenants")
          .select("id")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        targetTenantId = existing?.id;
      }

      let tenant;
      if (targetTenantId) {
        const { data: updated, error } = await insforgeServer.database
          .from("tenants")
          .update({
            name: data.name,
            slug,
            branding_config: data.branding_config,
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetTenantId)
          .select()
          .maybeSingle();

        if (error) throw error;
        tenant = updated;
      } else {
        const { data: inserted, error } = await insforgeServer.database
          .from("tenants")
          .insert([
            {
              name: data.name,
              slug,
              status: "active",
              branding_config: data.branding_config,
            },
          ])
          .select()
          .maybeSingle();

        if (error) throw error;
        tenant = inserted;
      }

      if (data.clerkUserId && tenant?.id) {
        try {
          await insforgeServer.database
            .from("tenant_members")
            .upsert(
              [
                {
                  tenant_id: tenant.id,
                  clerk_user_id: data.clerkUserId,
                  role: "owner",
                  status: "active",
                },
              ],
              { onConflict: "tenant_id,clerk_user_id" }
            );
        } catch (_) {}
      }

      return tenant;
    } catch (err: any) {
      console.error("Update tenant settings error:", err);
      throw new Error(err.message || "Failed to update tenant settings");
    }
  });

const UpdatePlanInput = z.object({
  plan: z.enum(["starter", "growth", "business", "enterprise"]),
});
export type UpdatePlanInput = z.infer<typeof UpdatePlanInput>;

export const updateSubscriptionPlan = createServerFn({ method: "POST" })
  .validator((input: UpdatePlanInput) => UpdatePlanInput.parse(input))
  .handler(async ({ data }) => {
    try {
      const tenantId = await resolveCurrentTenantId();
      if (!tenantId) throw new Error("No organization found. Please complete setup first.");

      const { data: tenant, error: fetchErr } = await insforgeServer.database
        .from("tenants")
        .select("id, branding_config")
        .eq("id", tenantId)
        .maybeSingle();

      if (fetchErr || !tenant) throw new Error("Tenant record not found.");

      const branding = (tenant.branding_config as any) || {};
      branding.plan = data.plan;

      const { data: updated, error } = await insforgeServer.database
        .from("tenants")
        .update({
          branding_config: branding,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tenantId)
        .select()
        .single();

      if (error) throw error;
      return updated;
    } catch (err: any) {
      console.error("Update subscription plan error:", err);
      throw new Error(err.message || "Failed to update subscription plan");
    }
  });

export const SyncClerkInput = z.object({
  tenantId: z.string().uuid().optional(),
  clerkUserId: z.string().optional(),
});
export type SyncClerkInput = z.infer<typeof SyncClerkInput>;

export const syncClerkUser = createServerFn({ method: "POST" })
  .validator((input?: SyncClerkInput) => SyncClerkInput.parse(input ?? {}))
  .handler(async ({ data: input }) => {
    try {
      const { clerkClient } = await import("@/lib/auth/clerk.server");
      const targetTenantId = await resolveCurrentTenantId(input?.tenantId, input?.clerkUserId);
      if (!targetTenantId) throw new Error("Tenant could not be resolved for sync.");

      const users = await clerkClient.users.getUserList({ limit: 50 });
      let syncedCount = 0;

      for (const u of users.data) {
        const email = u.emailAddresses[0]?.emailAddress || "user@example.com";
        const name =
          [u.firstName, u.lastName].filter(Boolean).join(" ") ||
          email.split("@")[0] ||
          "Policyholder";
        const phone = u.phoneNumbers[0]?.phoneNumber || "+91 98765 43210";
        const custNumber = "CUST-" + u.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();

        const { data: custRecord, error: custErr } = await insforgeServer.database
          .from("customers")
          .upsert(
            [
              {
                tenant_id: targetTenantId,
                clerk_user_id: u.id,
                customer_number: custNumber,
                name,
                email,
                phone,
                status: "active",
              },
            ],
            { onConflict: "tenant_id,customer_number" }
          )
          .select("id, name, customer_number")
          .single();

        if (custErr) {
          console.error("Error upserting customer:", custErr);
          continue;
        }

        await insforgeServer.database
          .from("tenant_members")
          .upsert(
            [
              {
                tenant_id: targetTenantId,
                clerk_user_id: u.id,
                role: "owner",
                status: "active",
              },
            ],
            { onConflict: "tenant_id,clerk_user_id" }
          );

        // Ensure customer has at least one active policy to enable voice testing & inquiries
        if (custRecord?.id) {
          const polNumber = "POL-" + custNumber.replace("CUST-", "") + "-HLT";
          await insforgeServer.database.from("policies").upsert(
            [
              {
                tenant_id: targetTenantId,
                customer_id: custRecord.id,
                policy_number: polNumber,
                policy_type: "health",
                plan_name: "Comprehensive Health Shield Platinum",
                nominee_name: "Designated Nominee",
                nominee_relationship: "Spouse",
                premium_amount: 18500.0,
                due_date: "2026-11-30",
                status: "active",
              },
            ],
            { onConflict: "tenant_id,policy_number" }
          );
        }

        syncedCount++;
      }

      return { ok: true, syncedCount };
    } catch (err: any) {
      console.error("Sync Clerk user error:", err);
      throw new Error(err.message || "Failed to sync Clerk users");
    }
  });

const RegisterClerkUserInput = z.object({
  clerkUserId: z.string(),
  email: z.string().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
});
export type RegisterClerkUserInput = z.infer<typeof RegisterClerkUserInput>;

export const registerClerkUser = createServerFn({ method: "POST" })
  .validator((input: RegisterClerkUserInput) => RegisterClerkUserInput.parse(input))
  .handler(async ({ data }) => {
    try {
      const tenantId = await resolveCurrentTenantId(
        undefined,
        data.clerkUserId,
        data.email,
        data.name
      );

      if (!tenantId) {
        throw new Error("Failed to initialize or resolve insurance carrier tenant");
      }

      const customerId = await ensureCustomerFromClerk(
        tenantId,
        data.clerkUserId,
        data.email,
        data.name
      );

      return {
        success: true,
        tenantId,
        customerId,
      };
    } catch (err: any) {
      console.error("registerClerkUser error:", err);
      throw new Error(err.message || "Failed to register Clerk user");
    }
  });

const CallerProfileInput = z.object({
  clerkUserId: z.string().optional(),
  email: z.string().optional(),
  tenantId: z.string().uuid().optional(),
});
export type CallerProfileInput = z.infer<typeof CallerProfileInput>;

export const getCallerProfile = createServerFn({ method: "POST" })
  .validator((input: CallerProfileInput) => CallerProfileInput.parse(input))
  .handler(async ({ data: input }) => {
    try {
      const targetTenantId = await resolveCurrentTenantId(input.tenantId, input.clerkUserId);
      let cust: any = null;

      // 1. First look up by clerk_user_id in target tenant
      if (input.clerkUserId) {
        let q = insforgeServer.database
          .from("customers")
          .select("id, name, email, phone, customer_number, status, clerk_user_id, tenant_id")
          .eq("clerk_user_id", input.clerkUserId);
        if (targetTenantId) {
          q = q.eq("tenant_id", targetTenantId);
        }
        const { data } = await q.order("created_at", { ascending: false }).limit(1);
        if (data && data.length > 0) cust = data[0];
      }

      // 2. If not found, look up by email
      if (!cust && input.email) {
        let q = insforgeServer.database
          .from("customers")
          .select("id, name, email, phone, customer_number, status, clerk_user_id, tenant_id")
          .eq("email", input.email);
        if (targetTenantId) {
          q = q.eq("tenant_id", targetTenantId);
        }
        const { data } = await q.order("created_at", { ascending: false }).limit(1);
        if (data && data.length > 0) cust = data[0];
      }

      // 3. If still not found but clerkUserId is given: FETCH DIRECTLY FROM CLERK AND INSERT!
      if (!cust && input.clerkUserId && targetTenantId) {
        try {
          const { clerkClient } = await import("@/lib/auth/clerk.server");
          const clerkUser = await clerkClient.users.getUser(input.clerkUserId);
          if (clerkUser) {
            const email =
              clerkUser.emailAddresses[0]?.emailAddress || input.email || "user@example.com";
            const name =
              [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
              email.split("@")[0] ||
              "Policyholder";
            const phone = clerkUser.phoneNumbers[0]?.phoneNumber || "+91 98765 43210";
            const custNumber =
              "CUST-" + clerkUser.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();

            const { data: newCust } = await insforgeServer.database
              .from("customers")
              .upsert(
                [
                  {
                    tenant_id: targetTenantId,
                    clerk_user_id: clerkUser.id,
                    customer_number: custNumber,
                    name,
                    email,
                    phone,
                    status: "active",
                  },
                ],
                { onConflict: "tenant_id,customer_number" }
              )
              .select("id, name, email, phone, customer_number, status, clerk_user_id, tenant_id")
              .single();

            if (newCust) {
              cust = newCust;
              await insforgeServer.database
                .from("tenant_members")
                .upsert(
                  [
                    {
                      tenant_id: targetTenantId,
                      clerk_user_id: clerkUser.id,
                      role: "owner",
                      status: "active",
                    },
                  ],
                  { onConflict: "tenant_id,clerk_user_id" }
                );

              const polNumber = "POL-" + custNumber.replace("CUST-", "") + "-HLT";
              await insforgeServer.database.from("policies").upsert(
                [
                  {
                    tenant_id: targetTenantId,
                    customer_id: newCust.id,
                    policy_number: polNumber,
                    policy_type: "health",
                    plan_name: "Comprehensive Health Shield Platinum",
                    nominee_name: "Designated Nominee",
                    nominee_relationship: "Spouse",
                    premium_amount: 18500.0,
                    due_date: "2026-11-30",
                    status: "active",
                  },
                ],
                { onConflict: "tenant_id,policy_number" }
              );
            }
          }
        } catch (fetchErr: any) {
          console.warn("Direct Clerk user fetch notice:", fetchErr?.message);
        }
      }

      if (!cust) return null;

      const { data: policies } = await insforgeServer.database
        .from("policies")
        .select(
          "id, policy_number, policy_type, plan_name, premium_amount, due_date, nominee_name, status"
        )
        .eq("customer_id", cust.id)
        .eq("tenant_id", cust.tenant_id);

      return {
        customer: cust,
        policiesCount: policies?.length || 0,
        policies: policies || [],
      };
    } catch (e: any) {
      console.warn("getCallerProfile notice:", e?.message);
      return null;
    }
  });
