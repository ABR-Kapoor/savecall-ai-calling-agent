import { n as Button, r as cn } from "./badge-CjGhifle.js";
import { jsx, jsxs } from "react/jsx-runtime";
import { AlertCircle } from "lucide-react";
//#region src/components/ui/empty-state.tsx
function EmptyState({ icon, title, description, actionLabel, onAction, className }) {
	return /* @__PURE__ */ jsxs("div", {
		className: cn("flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-border rounded-xl bg-card/50", className),
		children: [
			icon && /* @__PURE__ */ jsx("div", {
				className: "text-muted-foreground/60 mb-3",
				children: icon
			}),
			/* @__PURE__ */ jsx("h3", {
				className: "font-display text-sm font-semibold text-foreground",
				children: title
			}),
			description && /* @__PURE__ */ jsx("p", {
				className: "mt-1 text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed",
				children: description
			}),
			actionLabel && onAction && /* @__PURE__ */ jsx(Button, {
				size: "sm",
				onClick: onAction,
				className: "mt-4 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-medium",
				children: actionLabel
			})
		]
	});
}
//#endregion
//#region src/components/ui/error-state.tsx
function ErrorState({ title = "Failed to load records", message, onRetry, className }) {
	return /* @__PURE__ */ jsxs("div", {
		className: cn("rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3", className),
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex items-center gap-2.5",
			children: [/* @__PURE__ */ jsx(AlertCircle, { className: "size-4 shrink-0" }), /* @__PURE__ */ jsxs("div", { children: [
				/* @__PURE__ */ jsxs("span", {
					className: "font-semibold text-destructive",
					children: [title, ":"]
				}),
				" ",
				/* @__PURE__ */ jsx("span", {
					className: "text-destructive/90",
					children: message
				})
			] })]
		}), onRetry && /* @__PURE__ */ jsx(Button, {
			variant: "outline",
			size: "sm",
			onClick: onRetry,
			className: "text-xs h-7 text-destructive border-destructive/30 hover:bg-destructive/15 shrink-0",
			children: "Try Again"
		})]
	});
}
//#endregion
export { EmptyState as n, ErrorState as t };
