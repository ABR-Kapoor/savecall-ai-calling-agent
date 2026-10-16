import { createClient, type InsForgeClient } from "@insforge/sdk";

const baseUrl =
  (typeof import.meta !== "undefined" && import.meta.env?.["VITE_INSFORGE_URL"]) ||
  process.env["VITE_INSFORGE_URL"] ||
  "https://ufmgh6q8.ap-southeast.insforge.app";

const anonKey =
  (typeof import.meta !== "undefined" && import.meta.env?.["VITE_INSFORGE_ANON_KEY"]) ||
  process.env["VITE_INSFORGE_ANON_KEY"] ||
  "ik_a401a725ebf5f66294d0042f7e2af2d0";

export const insforge: InsForgeClient = createClient({
  baseUrl,
  anonKey,
});
