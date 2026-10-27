import { r as cn, t as Badge } from "./badge-CjGhifle.js";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/ui/status-badge.tsx
var TONE_CLASSES = {
	neutral: "bg-muted text-muted-foreground border-border",
	info: "bg-blue-50 text-blue-800 border-blue-200",
	success: "bg-emerald-50 text-emerald-800 border-emerald-200",
	warning: "bg-amber-50 text-amber-800 border-amber-200",
	danger: "bg-rose-50 text-rose-800 border-rose-200"
};
function StatusBadge({ label, tone = "neutral", icon, className, size = "sm" }) {
	return /* @__PURE__ */ jsxs(Badge, {
		variant: "outline",
		className: cn("font-medium border items-center gap-1 inline-flex shrink-0 transition-colors", size === "sm" ? "text-[10px] py-0.5 px-2" : "text-xs py-1 px-2.5", TONE_CLASSES[tone] || TONE_CLASSES.neutral, className),
		children: [icon && /* @__PURE__ */ jsx("span", {
			className: "shrink-0",
			children: icon
		}), /* @__PURE__ */ jsx("span", { children: label })]
	});
}
//#endregion
//#region src/lib/insurance/status-presentation.ts
function getPolicyStatusPresentation(status) {
	switch ((status || "").toLowerCase().trim()) {
		case "active": return {
			label: "Active",
			tone: "success",
			badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200"
		};
		case "expiring_soon":
		case "renewal_due": return {
			label: "Renewal Due",
			tone: "warning",
			badgeClass: "bg-amber-50 text-amber-800 border-amber-200"
		};
		case "expired": return {
			label: "Expired",
			tone: "neutral",
			badgeClass: "bg-muted text-muted-foreground border-border"
		};
		case "cancelled":
		case "surrendered": return {
			label: "Cancelled",
			tone: "danger",
			badgeClass: "bg-rose-50 text-rose-800 border-rose-200"
		};
		case "grace_period": return {
			label: "Grace Period",
			tone: "warning",
			badgeClass: "bg-amber-50 text-amber-800 border-amber-200"
		};
		default: return {
			label: status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown",
			tone: "neutral",
			badgeClass: "bg-muted text-muted-foreground border-border"
		};
	}
}
function getClaimStatusPresentation(status) {
	const norm = (status || "").toLowerCase().trim();
	switch (norm) {
		case "approved":
		case "settled":
		case "paid": return {
			label: norm === "paid" ? "Paid" : norm === "settled" ? "Settled" : "Approved",
			tone: "success",
			badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200"
		};
		case "submitted":
		case "received": return {
			label: "Received",
			tone: "info",
			badgeClass: "bg-blue-50 text-blue-800 border-blue-200"
		};
		case "in_review":
		case "under_review":
		case "processing": return {
			label: "Under Review",
			tone: "warning",
			badgeClass: "bg-amber-50 text-amber-800 border-amber-200"
		};
		case "needs_documents":
		case "pending_documents": return {
			label: "Needs Documents",
			tone: "warning",
			badgeClass: "bg-amber-50 text-amber-800 border-amber-200"
		};
		case "rejected":
		case "denied": return {
			label: "Rejected",
			tone: "danger",
			badgeClass: "bg-rose-50 text-rose-800 border-rose-200"
		};
		default: return {
			label: status ? status.charAt(0).toUpperCase() + status.slice(1) : "Pending",
			tone: "neutral",
			badgeClass: "bg-muted text-muted-foreground border-border"
		};
	}
}
function getApprovalStatusPresentation(status) {
	switch ((status || "").toLowerCase().trim()) {
		case "approved": return {
			label: "Approved",
			tone: "success",
			badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200"
		};
		case "rejected": return {
			label: "Rejected",
			tone: "danger",
			badgeClass: "bg-rose-50 text-rose-800 border-rose-200"
		};
		default: return {
			label: "Pending Review",
			tone: "warning",
			badgeClass: "bg-amber-50 text-amber-800 border-amber-200"
		};
	}
}
function getCallStatusPresentation(status) {
	switch ((status || "").toLowerCase().trim()) {
		case "completed": return {
			label: "Completed",
			tone: "success",
			badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200"
		};
		case "active":
		case "in-progress": return {
			label: "Active Call",
			tone: "info",
			badgeClass: "bg-primary/10 text-primary border-primary/20"
		};
		case "failed":
		case "error": return {
			label: "Failed",
			tone: "danger",
			badgeClass: "bg-rose-50 text-rose-800 border-rose-200"
		};
		default: return {
			label: status ? status.charAt(0).toUpperCase() + status.slice(1) : "Ended",
			tone: "neutral",
			badgeClass: "bg-muted text-muted-foreground border-border"
		};
	}
}
//#endregion
export { StatusBadge as a, getPolicyStatusPresentation as i, getCallStatusPresentation as n, getClaimStatusPresentation as r, getApprovalStatusPresentation as t };
