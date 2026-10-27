import { createClerkClient, verifyToken } from "@clerk/backend";
//#region src/lib/auth/clerk.server.ts
var secretKey = process.env["CLERK_SECRET_KEY"] || "";
var clerkClient = createClerkClient({ secretKey });
/**
* Extracts Clerk credentials from request headers (Authorization Bearer or __session cookie).
*/
async function extractAuthToken(request) {
	let token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
	if (!token) {
		const matchedToken = (request.headers.get("cookie") || "").match(/(?:^|;\s*)__session=([^;]+)/)?.[1];
		if (matchedToken) token = decodeURIComponent(matchedToken);
	}
	return token || null;
}
/**
* Safely extracts authenticated Clerk context from request if valid, or null.
*/
async function extractAuthUserFromRequest(request) {
	try {
		const token = await extractAuthToken(request);
		if (!token) return null;
		const verified = await verifyToken(token, { secretKey });
		return {
			userId: verified.sub,
			sessionId: verified.sid ?? null,
			orgId: verified.org_id ?? null,
			orgRole: verified.org_role ?? null,
			token
		};
	} catch {
		return null;
	}
}
//#endregion
export { clerkClient, extractAuthUserFromRequest };
