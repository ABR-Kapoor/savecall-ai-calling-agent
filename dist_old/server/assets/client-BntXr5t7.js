import { c as getTenantSettings } from "./insurance.functions-BLePgOSY.js";
import { createClient } from "@insforge/sdk";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
//#region src/hooks/use-business.ts
function useBusiness() {
	const { user } = useUser();
	return useQuery({
		queryKey: ["my-tenant", user?.id],
		queryFn: async () => {
			return await getTenantSettings({ data: {
				clerkUserId: user?.id,
				userEmail: user?.primaryEmailAddress?.emailAddress,
				userName: user?.fullName || void 0
			} }) ?? null;
		}
	});
}
//#endregion
//#region src/integrations/insforge/client.ts
var baseUrl = typeof import.meta !== "undefined" && {
	"BASE_URL": "/",
	"DEV": false,
	"MODE": "production",
	"PROD": true,
	"SSR": true,
	"TSS_DEV_SERVER": "false",
	"TSS_DEV_SSR_STYLES_BASEPATH": "/",
	"TSS_DEV_SSR_STYLES_ENABLED": "true",
	"TSS_DISABLE_CSRF_MIDDLEWARE_WARNING": "false",
	"TSS_INLINE_CSS_ENABLED": "false",
	"TSS_ROUTER_BASEPATH": "",
	"TSS_SERVER_FN_BASE": "/_serverFn/",
	"VITE_CLERK_PUBLISHABLE_KEY": "pk_test_ZGVjaWRpbmctc2hyZXctMzYuY2xlcmsuYWNjb3VudHMuZGV2JA",
	"VITE_LIVEKIT_URL": "ws://127.0.0.1:7880",
	"VITE_SUPABASE_PUBLISHABLE_KEY": "ik_a401a725ebf5f66294d0042f7e2af2d0",
	"VITE_SUPABASE_URL": "http://172.30.160.10:8000"
}["VITE_INSFORGE_URL"] || process.env["VITE_INSFORGE_URL"] || "";
var anonKey = typeof import.meta !== "undefined" && {
	"BASE_URL": "/",
	"DEV": false,
	"MODE": "production",
	"PROD": true,
	"SSR": true,
	"TSS_DEV_SERVER": "false",
	"TSS_DEV_SSR_STYLES_BASEPATH": "/",
	"TSS_DEV_SSR_STYLES_ENABLED": "true",
	"TSS_DISABLE_CSRF_MIDDLEWARE_WARNING": "false",
	"TSS_INLINE_CSS_ENABLED": "false",
	"TSS_ROUTER_BASEPATH": "",
	"TSS_SERVER_FN_BASE": "/_serverFn/",
	"VITE_CLERK_PUBLISHABLE_KEY": "pk_test_ZGVjaWRpbmctc2hyZXctMzYuY2xlcmsuYWNjb3VudHMuZGV2JA",
	"VITE_LIVEKIT_URL": "ws://127.0.0.1:7880",
	"VITE_SUPABASE_PUBLISHABLE_KEY": "ik_a401a725ebf5f66294d0042f7e2af2d0",
	"VITE_SUPABASE_URL": "http://172.30.160.10:8000"
}["VITE_INSFORGE_ANON_KEY"] || process.env["VITE_INSFORGE_ANON_KEY"] || "";
var insforge = createClient({
	baseUrl,
	anonKey
});
//#endregion
export { useBusiness as n, insforge as t };
