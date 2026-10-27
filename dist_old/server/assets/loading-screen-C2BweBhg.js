import { n as Button } from "./badge-CjGhifle.js";
import { useEffect, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { RefreshCw } from "lucide-react";
//#region src/components/loading-screen.tsx
function InsurCallLoadingScreen({ message = "Preparing your insurance workspace...", submessage = "Loading carrier settings, policy models, and verified company knowledge.", timeoutSeconds = 12, onRetry, fullscreen = true }) {
	const [timedOut, setTimedOut] = useState(false);
	useEffect(() => {
		if (!timeoutSeconds) return;
		const timer = setTimeout(() => {
			setTimedOut(true);
		}, timeoutSeconds * 1e3);
		return () => clearTimeout(timer);
	}, [timeoutSeconds]);
	const content = /* @__PURE__ */ jsxs("div", {
		role: "status",
		"aria-live": "polite",
		className: "flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto",
		children: [
			/* @__PURE__ */ jsx("div", {
				className: "mb-6 flex items-center justify-center",
				children: /* @__PURE__ */ jsxs("div", {
					className: "relative size-16 rounded-2xl bg-white border border-slate-200/80 p-3 shadow-sm flex items-center justify-center",
					children: [/* @__PURE__ */ jsx("img", {
						src: "/01_logo_only_transparent.png",
						alt: "InsurCall Emblem",
						className: "size-full object-contain"
					}), /* @__PURE__ */ jsx("span", { className: "absolute -bottom-1 -right-1 size-3.5 rounded-full bg-[#087F8C] ring-2 ring-white" })]
				})
			}),
			/* @__PURE__ */ jsx("div", {
				className: "relative w-48 h-36 flex items-center justify-center overflow-hidden mb-4",
				children: /* @__PURE__ */ jsx("img", {
					src: "/loading-agent.svg",
					alt: "InsurCall Assistant Loading Animation",
					className: "w-full h-full object-contain filter drop-shadow-xs"
				})
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "space-y-2 mb-6",
				children: [/* @__PURE__ */ jsx("h3", {
					className: "font-display text-lg font-bold text-[#172033] tracking-tight",
					children: message
				}), /* @__PURE__ */ jsx("p", {
					className: "text-xs text-slate-500 max-w-sm leading-relaxed",
					children: submessage
				})]
			}),
			timedOut && /* @__PURE__ */ jsxs("div", {
				className: "rounded-xl border border-amber-200 bg-amber-50/80 p-4 w-full text-left space-y-3 animate-in fade-in slide-in-from-bottom-2",
				children: [/* @__PURE__ */ jsx("div", {
					className: "text-xs text-amber-900 font-medium",
					children: "This operation is taking longer than expected."
				}), /* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-2",
					children: [onRetry && /* @__PURE__ */ jsxs(Button, {
						variant: "outline",
						size: "sm",
						onClick: () => {
							setTimedOut(false);
							onRetry();
						},
						className: "text-xs gap-1.5 bg-white border-amber-300 text-amber-900 hover:bg-amber-100",
						children: [/* @__PURE__ */ jsx(RefreshCw, { className: "size-3.5" }), "Retry Request"]
					}), /* @__PURE__ */ jsx(Button, {
						variant: "ghost",
						size: "sm",
						onClick: () => window.location.reload(),
						className: "text-xs text-slate-600 hover:text-slate-900",
						children: "Refresh Page"
					})]
				})]
			})
		]
	});
	if (!fullscreen) return content;
	return /* @__PURE__ */ jsx("div", {
		className: "fixed inset-0 z-50 flex items-center justify-center bg-[#FAF9F6]/95 backdrop-blur-xs select-none",
		children: content
	});
}
//#endregion
export { InsurCallLoadingScreen as t };
