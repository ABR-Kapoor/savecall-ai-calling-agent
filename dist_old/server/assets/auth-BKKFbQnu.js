import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { SignIn, SignUp } from "@clerk/clerk-react";
import { ArrowLeft, Lock, LogIn, UserPlus } from "lucide-react";
//#region src/routes/auth.tsx?tsr-split=component
function AuthPage() {
	const [authMode, setAuthMode] = useState("signin");
	return /* @__PURE__ */ jsxs("div", {
		className: "relative min-h-screen flex items-center justify-center bg-background px-4 py-12",
		children: [/* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-radial from-primary/5 via-background to-background pointer-events-none" }), /* @__PURE__ */ jsxs("div", {
			className: "relative z-10 w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "mb-6 flex flex-col items-center text-center",
				children: [
					/* @__PURE__ */ jsxs(Link, {
						to: "/",
						className: "inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors",
						children: [/* @__PURE__ */ jsx(ArrowLeft, { className: "size-3.5" }), " Back to Home"]
					}),
					/* @__PURE__ */ jsx("img", {
						src: "/02_logo_with_InsurCall_light_transparent.png",
						alt: "InsurCall",
						className: "h-9 w-auto object-contain mb-2"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary mb-3",
						children: [/* @__PURE__ */ jsx(Lock, { className: "size-3" }), " Secure Enterprise Portal"]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1 text-xs font-medium w-full max-w-xs mb-2",
						children: [/* @__PURE__ */ jsxs("button", {
							onClick: () => setAuthMode("signin"),
							className: `flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${authMode === "signin" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"}`,
							children: [/* @__PURE__ */ jsx(LogIn, { className: "size-3.5" }), " Sign In"]
						}), /* @__PURE__ */ jsxs("button", {
							onClick: () => setAuthMode("signup"),
							className: `flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${authMode === "signup" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"}`,
							children: [/* @__PURE__ */ jsx(UserPlus, { className: "size-3.5" }), " Register Carrier"]
						})]
					})
				]
			}), /* @__PURE__ */ jsx("div", {
				className: "flex justify-center",
				children: authMode === "signin" ? /* @__PURE__ */ jsx(SignIn, {
					routing: "hash",
					fallbackRedirectUrl: "/dashboard"
				}) : /* @__PURE__ */ jsx(SignUp, {
					routing: "hash",
					fallbackRedirectUrl: "/onboarding"
				})
			})]
		})]
	});
}
//#endregion
export { AuthPage as component };
