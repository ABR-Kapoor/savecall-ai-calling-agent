import { createClerkClient, verifyToken } from "@clerk/backend";
import { insforgeServer } from "@/lib/insforge/client.server";

const secretKey = process.env["CLERK_SECRET_KEY"] || "";
export const clerkClient = createClerkClient({ secretKey });

export type AuthContext = {
  userId: string;
  sessionId?: string | null;
  orgId?: string | null;
  orgRole?: string | null;
  token?: string | null;
};

/**
 * Extracts and verifies Clerk credentials from request headers.
 */
export async function requireAuthenticatedUser(request: Request): Promise<AuthContext> {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    throw new Error("401: Unauthorized - No authentication token provided");
  }

  try {
    const verified = await verifyToken(token, { secretKey });
    return {
      userId: verified.sub,
      sessionId: (verified as any).sid ?? null,
      orgId: (verified as any).org_id ?? null,
      orgRole: (verified as any).org_role ?? null,
      token,
    };
  } catch (err: any) {
    // Fallback for development if token verification is mocked or token format differs
    console.warn("Clerk token verification warning:", err?.message);
    throw new Error("401: Invalid or expired Clerk session");
  }
}

/**
 * Ensures the authenticated user is an authorized staff member of the tenant.
 */
export async function requireTenantMember(request: Request, tenantId: string) {
  const auth = await requireAuthenticatedUser(request);

  const { data: member, error } = await insforgeServer.database
    .from("tenant_members")
    .select("id, role, status")
    .eq("tenant_id", tenantId)
    .eq("clerk_user_id", auth.userId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !member) {
    throw new Error("403: Forbidden - You are not an active member of this insurance tenant");
  }

  return { ...auth, memberRole: member.role };
}

/**
 * Ensures the caller is authorized to access a given customer's record.
 */
export async function requireCustomerAccess(request: Request, customerId: string) {
  const auth = await requireAuthenticatedUser(request);

  // Check if user is the customer directly
  const { data: customer } = await insforgeServer.database
    .from("customers")
    .select("id, tenant_id")
    .eq("id", customerId)
    .eq("clerk_user_id", auth.userId)
    .maybeSingle();

  if (customer) {
    return { ...auth, isCustomer: true, tenantId: customer.tenant_id, customerId };
  }

  // Otherwise check if user is a tenant staff member
  const { data: targetCust } = await insforgeServer.database
    .from("customers")
    .select("tenant_id")
    .eq("id", customerId)
    .maybeSingle();

  if (targetCust) {
    const { data: staffMember } = await insforgeServer.database
      .from("tenant_members")
      .select("role")
      .eq("tenant_id", targetCust.tenant_id)
      .eq("clerk_user_id", auth.userId)
      .eq("status", "active")
      .maybeSingle();

    if (staffMember) {
      return { ...auth, isCustomer: false, tenantId: targetCust.tenant_id, customerId, staffRole: staffMember.role };
    }
  }

  throw new Error("403: Forbidden - You do not have permission to access this customer record");
}
