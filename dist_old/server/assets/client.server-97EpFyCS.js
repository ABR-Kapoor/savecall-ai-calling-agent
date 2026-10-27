import { createAdminClient, createClient } from "@insforge/sdk";
//#region src/lib/insforge/client.server.ts
var baseUrl = process.env["VITE_INSFORGE_URL"] || "";
var serviceKey = process.env["INSFORGE_SERVICE_KEY"] || "";
/**
* Returns an InsForge client using the official @insforge/sdk.
* If a Clerk JWT token is provided, the client issues requests with that token
* so that InsForge RLS policies evaluate using the authenticated Clerk identity.
*/
function getInsforgeServerClient(clerkToken) {
	if (serviceKey && !clerkToken) return createAdminClient({
		baseUrl,
		apiKey: serviceKey
	});
	const config = {
		baseUrl,
		anonKey: process.env["VITE_INSFORGE_ANON_KEY"] || "anon"
	};
	if (clerkToken) config.accessToken = clerkToken;
	return createClient(config);
}
/** Default server client using configured service/anon credentials */
var insforgeServer = getInsforgeServerClient();
//#endregion
export { insforgeServer as t };
