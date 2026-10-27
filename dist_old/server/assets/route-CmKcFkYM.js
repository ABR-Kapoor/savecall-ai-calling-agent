import { l as registerClerkUser } from "./insurance.functions-BLePgOSY.js";
import { useEffect, useState } from "react";
import { Outlet } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { RedirectToSignIn, SignedIn, SignedOut, useUser } from "@clerk/clerk-react";
//#region src/routes/_authenticated/route.tsx?tsr-split=component
function UserRegistrationSync({ children }) {
	const { user, isLoaded } = useUser();
	const [isRegistered, setIsRegistered] = useState(false);
	useEffect(() => {
		if (!isLoaded || !user?.id) return;
		let isCancelled = false;
		registerClerkUser({ data: {
			clerkUserId: user.id,
			email: user.primaryEmailAddress?.emailAddress,
			name: user.fullName || void 0,
			phone: user.primaryPhoneNumber?.phoneNumber || void 0
		} }).then(() => {
			if (!isCancelled) setIsRegistered(true);
		}).catch((err) => {
			console.warn("User registration sync notice:", err);
			if (!isCancelled) setIsRegistered(true);
		});
		return () => {
			isCancelled = true;
		};
	}, [
		isLoaded,
		user?.id,
		user?.fullName,
		user?.primaryEmailAddress?.emailAddress
	]);
	return /* @__PURE__ */ jsx(Fragment, { children });
}
function AuthenticatedLayout() {
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(SignedIn, { children: /* @__PURE__ */ jsx(UserRegistrationSync, { children: /* @__PURE__ */ jsx(Outlet, {}) }) }), /* @__PURE__ */ jsx(SignedOut, { children: /* @__PURE__ */ jsx(RedirectToSignIn, { signInFallbackRedirectUrl: "/dashboard" }) })] });
}
//#endregion
export { AuthenticatedLayout as component };
