import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { insforgeServer } from "@/lib/insforge/client.server";

export const getDashboardMetrics = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const [policiesRes, claimsRes, approvalsRes, sessionsRes, recentApprovalsRes, recentSessionsRes] =
      await Promise.all([
        insforgeServer.database.from("policies").select("id", { count: "exact" }),
        insforgeServer.database.from("claims").select("id", { count: "exact" }),
        insforgeServer.database.from("approval_requests").select("id", { count: "exact" }),
        insforgeServer.database.from("call_sessions").select("id", { count: "exact" }),
        insforgeServer.database
          .from("approval_requests")
          .select("id, request_type, status, created_at, payload")
          .order("created_at", { ascending: false })
          .limit(5),
        insforgeServer.database
          .from("call_sessions")
          .select("id, room_name, caller_name, started_at, duration_sec, status")
          .order("started_at", { ascending: false })
          .limit(5),
      ]);

    return {
      policiesCount: policiesRes.count ?? (policiesRes.data?.length || 0),
      claimsCount: claimsRes.count ?? (claimsRes.data?.length || 0),
      approvalsCount: approvalsRes.count ?? (approvalsRes.data?.length || 0),
      sessionsCount: sessionsRes.count ?? (sessionsRes.data?.length || 0),
      recentApprovals: recentApprovalsRes.data ?? [],
      recentSessions: recentSessionsRes.data ?? [],
    };
  } catch (err: any) {
    console.error("Dashboard metrics error:", err);
    throw new Error(err.message || "Failed to load dashboard metrics");
  }
});

export const getPolicies = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { data: policies, error } = await insforgeServer.database
      .from("policies")
      .select("id, policy_number, plan_name, policy_type, premium_amount, due_date, status, nominee_name, nominee_relationship, customer_id")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    if (!policies || policies.length === 0) return [];

    const customerIds = [...new Set(policies.map((p: any) => p.customer_id).filter(Boolean))];
    const { data: custs } = customerIds.length > 0
      ? await insforgeServer.database.from("customers").select("id, name, customer_number").in("id", customerIds)
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

export const getClaims = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { data: claims, error: claimsErr } = await insforgeServer.database
      .from("claims")
      .select("id, claim_number, incident_date, estimated_amount, description, status, risk_score, created_at, customer_id, policy_id")
      .order("created_at", { ascending: false });

    if (claimsErr) throw new Error(claimsErr.message);
    if (!claims || claims.length === 0) return [];

    const policyIds = [...new Set(claims.map((c: any) => c.policy_id).filter(Boolean))];
    const customerIds = [...new Set(claims.map((c: any) => c.customer_id).filter(Boolean))];

    const [policiesRes, customersRes] = await Promise.all([
      policyIds.length > 0
        ? insforgeServer.database.from("policies").select("id, policy_number, plan_name").in("id", policyIds)
        : { data: [] },
      customerIds.length > 0
        ? insforgeServer.database.from("customers").select("id, name, phone").in("id", customerIds)
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

export const getApprovalRequests = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { data: requests, error } = await insforgeServer.database
      .from("approval_requests")
      .select("id, request_type, payload, status, risk_level, reason, created_at, policy_id, customer_id")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    if (!requests || requests.length === 0) return [];

    const policyIds = [...new Set(requests.map((r: any) => r.policy_id).filter(Boolean))];
    const customerIds = [...new Set(requests.map((r: any) => r.customer_id).filter(Boolean))];

    const [policiesRes, customersRes] = await Promise.all([
      policyIds.length > 0
        ? insforgeServer.database.from("policies").select("id, policy_number").in("id", policyIds)
        : { data: [] },
      customerIds.length > 0
        ? insforgeServer.database.from("customers").select("id, name").in("id", customerIds)
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

export const updateApprovalStatus = createServerFn({ method: "POST" })
  .validator((input: unknown) => UpdateApprovalInput.parse(input))
  .handler(async ({ data }) => {
    try {
      const { data: updated, error } = await insforgeServer.database
        .from("approval_requests")
        .update({
          status: data.status,
          decided_at: new Date().toISOString(),
          decision_notes: data.staffNotes || null,
        })
        .eq("id", data.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return updated;
    } catch (err: any) {
      console.error("Update approval status error:", err);
      throw new Error(err.message || "Failed to update approval status");
    }
  });

export const getCallSessions = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { data: sessions, error } = await insforgeServer.database
      .from("call_sessions")
      .select("id, room_name, caller_name, caller_phone, started_at, ended_at, duration_sec, status, transcript, risk_state, customer_id")
      .order("started_at", { ascending: false });

    if (error) throw new Error(error.message);
    if (!sessions || sessions.length === 0) return [];

    const customerIds = [...new Set(sessions.map((s: any) => s.customer_id).filter(Boolean))];
    const { data: custs } = customerIds.length > 0
      ? await insforgeServer.database.from("customers").select("id, name, customer_number").in("id", customerIds)
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

export const getAuditLogs = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { data, error } = await insforgeServer.database
      .from("audit_logs")
      .select("id, actor_type, actor_id, action, target_resource, target_id, risk_level, status, payload, created_at, customer_id, call_session_id")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  } catch (err: any) {
    console.error("Get audit logs error:", err);
    throw new Error(err.message || "Failed to load audit logs");
  }
});

export const getTenantSettings = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { data: tenant, error } = await insforgeServer.database
      .from("tenants")
      .select("id, name, slug, status, branding_config, created_at")
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return tenant ?? {
      id: "a0000000-0000-0000-0000-000000000001",
      name: "SafeLife Insurance Co.",
      slug: "safelife",
      status: "active",
      branding_config: { primary_color: "#0891b2", support_phone: "+91 800 555 0199", support_email: "claims@safelife.com" },
    };
  } catch (err: any) {
    console.error("Get tenant settings error:", err);
    throw new Error(err.message || "Failed to load tenant settings");
  }
});

const UpdateTenantInput = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  branding_config: z.record(z.unknown()).default({}),
});

export const updateTenantSettings = createServerFn({ method: "POST" })
  .validator((input: unknown) => UpdateTenantInput.parse(input))
  .handler(async ({ data }) => {
    try {
      const { data: tenant, error } = await insforgeServer.database
        .from("tenants")
        .update({
          name: data.name,
          slug: data.slug,
          branding_config: data.branding_config,
          updated_at: new Date().toISOString(),
        })
        .eq("slug", data.slug)
        .select()
        .maybeSingle();

      if (!error && tenant) return tenant;

      // @ts-expect-error pg types are optional at runtime
      const { Pool } = await import("pg");
      const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
      const res = await pool.query(
        `UPDATE tenants SET name = $1, branding_config = $2, updated_at = NOW() WHERE slug = $3 RETURNING *`,
        [data.name, JSON.stringify(data.branding_config), data.slug]
      );
      await pool.end();
      return res.rows[0];
    } catch (err: any) {
      console.error("Update tenant settings error:", err);
      throw new Error(err.message || "Failed to update tenant settings");
    }
  });

export const syncClerkUser = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const { clerkClient } = await import("@/lib/auth/clerk.server");
    const users = await clerkClient.users.getUserList({ limit: 5 });

    let syncedCount = 0;
    for (const u of users.data) {
      const email = u.emailAddresses[0]?.emailAddress || "user@example.com";
      const name = `${u.firstName || ""} ${u.lastName || ""}`.trim() || email.split("@")[0];
      const phone = u.phoneNumbers[0]?.phoneNumber || "+91 98765 43210";
      const custNumber = "CUST-" + u.id.slice(-6).toUpperCase();

      await insforgeServer.database
        .from("customers")
        .upsert(
          [
            {
              tenant_id: "a0000000-0000-0000-0000-000000000001",
              clerk_user_id: u.id,
              customer_number: custNumber,
              name,
              email,
              phone,
              status: "active",
            },
          ],
          { onConflict: "tenant_id,customer_number" }
        );

      await insforgeServer.database
        .from("tenant_members")
        .upsert(
          [
            {
              tenant_id: "a0000000-0000-0000-0000-000000000001",
              clerk_user_id: u.id,
              role: "owner",
              status: "active",
            },
          ],
          { onConflict: "tenant_id,clerk_user_id" }
        );

      // Ensure customer has active policies
      const { data: existingCust } = await insforgeServer.database
        .from("customers")
        .select("id")
        .eq("clerk_user_id", u.id)
        .maybeSingle();

      if (existingCust?.id) {
        const { count } = await insforgeServer.database
          .from("policies")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", existingCust.id);

        if (!count || count === 0) {
          await insforgeServer.database.from("policies").insert([
            {
              tenant_id: "a0000000-0000-0000-0000-000000000001",
              customer_id: existingCust.id,
              policy_number: `POL-HLTH-${custNumber.replace("CUST-", "")}`,
              policy_type: "health",
              sum_insured: 1500000,
              premium_amount: 18500,
              start_date: new Date().toISOString().split("T")[0],
              end_date: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
              status: "active",
              nominee_name: "Family Nominee",
              nominee_relationship: "Spouse",
            },
            {
              tenant_id: "a0000000-0000-0000-0000-000000000001",
              customer_id: existingCust.id,
              policy_number: `POL-AUTO-${custNumber.replace("CUST-", "")}`,
              policy_type: "motor",
              sum_insured: 950000,
              premium_amount: 12400,
              start_date: new Date().toISOString().split("T")[0],
              end_date: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
              status: "active",
              nominee_name: "Family Nominee",
              nominee_relationship: "Spouse",
            },
            {
              tenant_id: "a0000000-0000-0000-0000-000000000001",
              customer_id: existingCust.id,
              policy_number: `POL-LIFE-${custNumber.replace("CUST-", "")}`,
              policy_type: "life",
              sum_insured: 5000000,
              premium_amount: 32000,
              start_date: new Date().toISOString().split("T")[0],
              end_date: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
              status: "active",
              nominee_name: "Family Nominee",
              nominee_relationship: "Spouse",
            },
          ]);
        }
      }

      syncedCount++;
    }

    return { ok: true, syncedCount };
  } catch (err: any) {
    console.error("Sync Clerk user error:", err);
    throw new Error(err.message || "Failed to sync Clerk users");
  }
});

const CallerProfileInput = z.object({
  clerkUserId: z.string().optional(),
  email: z.string().optional(),
});

export const getCallerProfile = createServerFn({ method: "POST" })
  .validator((input: unknown) => CallerProfileInput.parse(input))
  .handler(async ({ data: input }) => {
    try {
      let cust: any = null;
      if (input.clerkUserId) {
        const { data } = await insforgeServer.database
          .from("customers")
          .select("id, name, email, phone, customer_number, status, clerk_user_id")
          .eq("clerk_user_id", input.clerkUserId)
          .maybeSingle();
        cust = data;
      }
      if (!cust && input.email) {
        const { data } = await insforgeServer.database
          .from("customers")
          .select("id, name, email, phone, customer_number, status, clerk_user_id")
          .eq("email", input.email)
          .maybeSingle();
        cust = data;
      }
      if (!cust) return null;

      const { data: policies } = await insforgeServer.database
        .from("policies")
        .select("id, policy_number, policy_type, status")
        .eq("customer_id", cust.id);

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

