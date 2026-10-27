import { createClient, createAdminClient, type InsForgeClient, type InsForgeConfig } from "@insforge/sdk";

const baseUrl =
  process.env["VITE_INSFORGE_URL"] ||
  process.env["INSFORGE_URL"] ||
  "https://ufmgh6q8.ap-southeast.insforge.app";

const serviceKey =
  process.env["INSFORGE_SERVICE_KEY"] ||
  process.env["INSFORGE_API_KEY"] ||
  process.env["SUPABASE_SERVICE_ROLE_KEY"] ||
  process.env["SUPABASE_PUBLISHABLE_KEY"] ||
  "ik_a401a725ebf5f66294d0042f7e2af2d0";

/**
 * Returns an InsForge client using the official @insforge/sdk.
 * If a Clerk JWT token is provided, the client issues requests with that token
 * so that InsForge RLS policies evaluate using the authenticated Clerk identity.
 */
export function getInsforgeServerClient(clerkToken?: string | null): InsForgeClient {
  if (serviceKey && !clerkToken) {
    return createAdminClient({
      baseUrl,
      apiKey: serviceKey,
    });
  }

  const config: InsForgeConfig = {
    baseUrl,
    anonKey: process.env["VITE_INSFORGE_ANON_KEY"] || "anon",
  };

  if (clerkToken) {
    config.accessToken = clerkToken;
  }

  return createClient(config);
}

/** Default server client using configured service/anon credentials */
export const insforgeServer: InsForgeClient = getInsforgeServerClient();
