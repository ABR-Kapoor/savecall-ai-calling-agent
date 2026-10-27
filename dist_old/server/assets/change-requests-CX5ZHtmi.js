import { f as updateApprovalStatus, t as getApprovalRequests } from "./insurance.functions-BLePgOSY.js";
import { n as Button, r as cn, t as Badge } from "./badge-CjGhifle.js";
import { t as AppShell } from "./app-shell-DAPYFpRb.js";
import { n as CardContent, t as Card } from "./card-3hIMutoJ.js";
import { t as Input } from "./input-U8cX-69P.js";
import { n as EmptyState, t as ErrorState } from "./error-state-aOFIjvAB.js";
import { a as StatusBadge, t as getApprovalStatusPresentation } from "./status-presentation-L6E3KiEp.js";
import { useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import { toast } from "sonner";
import { CheckCircle2, Search, User, XCircle } from "lucide-react";
//#region src/components/insurance/approval-review-card.tsx
function ApprovalReviewCard({ request, onApprove, onReject, isPendingMutation = false, className }) {
	const [confirmAction, setConfirmAction] = useState(null);
	const statusInfo = getApprovalStatusPresentation(request.status);
	const isPending = request.status === "pending";
	const rawRisk = request.risk_level;
	const risk = (typeof rawRisk === "object" && rawRisk !== null ? String(rawRisk.tier || rawRisk.level || "HIGH") : String(rawRisk || "HIGH")).toUpperCase();
	const payloadObj = typeof request.payload === "string" ? safeJsonParse(request.payload) : request.payload || {};
	return /* @__PURE__ */ jsx(Card, {
		className: cn("border border-border bg-card shadow-xs hover:border-primary/40 transition-all", className),
		children: /* @__PURE__ */ jsxs(CardContent, {
			className: "p-4 space-y-3",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-start justify-between gap-2",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "space-y-0.5",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ jsx("span", {
								className: "font-mono text-xs font-bold text-foreground",
								children: request.request_type
							}), /* @__PURE__ */ jsxs(Badge, {
								variant: "outline",
								className: cn("text-[9px] uppercase font-semibold", risk === "CRITICAL" ? "bg-rose-50 text-rose-800 border-rose-200" : "bg-amber-50 text-amber-800 border-amber-200"),
								children: [risk, " Risk"]
							})]
						}), /* @__PURE__ */ jsxs("div", {
							className: "text-[11px] text-muted-foreground",
							children: ["Submitted: ", request.created_at ? new Date(request.created_at).toLocaleString() : "--"]
						})]
					}), /* @__PURE__ */ jsx(StatusBadge, {
						label: statusInfo.label,
						tone: statusInfo.tone
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs flex items-center justify-between",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-1.5",
						children: [/* @__PURE__ */ jsx(User, { className: "size-3 text-muted-foreground" }), /* @__PURE__ */ jsx("span", {
							className: "font-medium text-foreground",
							children: request.customers?.name || "Policyholder"
						})]
					}), /* @__PURE__ */ jsx("div", {
						className: "font-mono text-[11px] text-muted-foreground",
						children: request.policies?.policy_number || "Active Policy"
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "rounded-xl border border-border/60 bg-muted/30 p-3 text-xs space-y-2",
					children: [/* @__PURE__ */ jsx("span", {
						className: "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block",
						children: "Staged Modification"
					}), payloadObj.existing_nominee || payloadObj.proposed_nominee ? /* @__PURE__ */ jsxs("div", {
						className: "grid grid-cols-2 gap-2 text-xs",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "rounded border border-border/60 bg-card p-2 space-y-0.5",
							children: [/* @__PURE__ */ jsx("span", {
								className: "text-[10px] text-muted-foreground uppercase block",
								children: "Current Value"
							}), /* @__PURE__ */ jsx("span", {
								className: "font-medium text-foreground",
								children: payloadObj.existing_nominee || "Unassigned"
							})]
						}), /* @__PURE__ */ jsxs("div", {
							className: "rounded border border-primary/30 bg-primary/5 p-2 space-y-0.5",
							children: [/* @__PURE__ */ jsx("span", {
								className: "text-[10px] text-primary uppercase block font-semibold",
								children: "Proposed Value"
							}), /* @__PURE__ */ jsx("span", {
								className: "font-bold text-foreground",
								children: payloadObj.proposed_nominee || payloadObj.new_nominee || "New Designee"
							})]
						})]
					}) : /* @__PURE__ */ jsx("div", {
						className: "font-mono text-[11px] text-muted-foreground overflow-x-auto whitespace-pre-wrap max-h-24 leading-relaxed",
						children: JSON.stringify(payloadObj, null, 2)
					})]
				}),
				isPending && /* @__PURE__ */ jsx("div", {
					className: "pt-1 flex items-center justify-end gap-2 border-t border-border/60",
					children: confirmAction === null ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs(Button, {
						size: "sm",
						variant: "outline",
						className: "h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10",
						disabled: isPendingMutation,
						onClick: () => setConfirmAction("reject"),
						children: [/* @__PURE__ */ jsx(XCircle, { className: "size-3.5 mr-1" }), " Reject Request"]
					}), /* @__PURE__ */ jsxs(Button, {
						size: "sm",
						className: "h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-medium",
						disabled: isPendingMutation,
						onClick: () => setConfirmAction("approve"),
						children: [/* @__PURE__ */ jsx(CheckCircle2, { className: "size-3.5 mr-1" }), " Approve Change"]
					})] }) : /* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-2 p-1.5 rounded-lg bg-muted/60 border border-border text-xs",
						children: [
							/* @__PURE__ */ jsxs("span", {
								className: "font-medium text-foreground",
								children: [
									"Confirm ",
									confirmAction === "approve" ? "Approval" : "Rejection",
									"?"
								]
							}),
							/* @__PURE__ */ jsx(Button, {
								size: "sm",
								variant: "ghost",
								className: "h-6 px-2 text-xs",
								onClick: () => setConfirmAction(null),
								children: "Cancel"
							}),
							/* @__PURE__ */ jsx(Button, {
								size: "sm",
								className: cn("h-6 px-2.5 text-xs text-white", confirmAction === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-destructive hover:bg-destructive/90"),
								disabled: isPendingMutation,
								onClick: () => {
									const action = confirmAction;
									setConfirmAction(null);
									if (action === "approve") onApprove(request.id);
									else onReject(request.id);
								},
								children: "Confirm"
							})
						]
					})
				})
			]
		})
	});
}
function safeJsonParse(val) {
	try {
		return JSON.parse(val);
	} catch {
		return val;
	}
}
//#endregion
//#region src/routes/_authenticated/change-requests.tsx?tsr-split=component
function ApprovalsPage() {
	const { user } = useUser();
	const [search, setSearch] = useState("");
	const queryClient = useQueryClient();
	const { data: requests, isLoading, error, refetch } = useQuery({
		queryKey: ["approvals-list", user?.id],
		queryFn: () => getApprovalRequests({ data: { clerkUserId: user?.id } }),
		enabled: !!user?.id
	});
	const mutation = useMutation({
		mutationFn: (vars) => updateApprovalStatus({ data: {
			id: vars.id,
			status: vars.status
		} }),
		onSuccess: (_, vars) => {
			queryClient.invalidateQueries({ queryKey: ["approvals-list"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
			queryClient.invalidateQueries({ queryKey: ["policies-list"] });
			toast.success(vars.status === "approved" ? "Request approved and committed to database." : "Request rejected successfully.");
		},
		onError: (err) => {
			toast.error(err.message || "Failed to update approval status");
		}
	});
	const filtered = (requests ?? []).filter((r) => {
		const q = search.toLowerCase();
		const type = r.request_type?.toLowerCase() ?? "";
		const custName = r.customers?.name?.toLowerCase() ?? "";
		const polNum = r.policies?.policy_number?.toLowerCase() ?? "";
		return type.includes(q) || custName.includes(q) || polNum.includes(q);
	});
	const pendingRequests = filtered.filter((r) => r.status === "pending");
	const pastRequests = filtered.filter((r) => r.status !== "pending");
	return /* @__PURE__ */ jsx(AppShell, {
		title: "High-Risk Approval Queue",
		subtitle: "Human-in-the-loop review for policy cancellations, nominee changes, and high-impact updates staged by AI",
		children: /* @__PURE__ */ jsxs("div", {
			className: "space-y-6",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "relative w-full max-w-sm",
						children: [/* @__PURE__ */ jsx(Search, { className: "absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ jsx(Input, {
							placeholder: "Search by request type, policy, or customer...",
							className: "pl-8 text-xs bg-background",
							value: search,
							onChange: (e) => setSearch(e.target.value)
						})]
					}), /* @__PURE__ */ jsxs("div", {
						className: "text-xs text-muted-foreground self-center sm:self-auto font-mono",
						children: [
							pendingRequests.length,
							" pending review • ",
							pastRequests.length,
							" completed"
						]
					})]
				}),
				error && /* @__PURE__ */ jsx(ErrorState, {
					title: "Failed to load approvals",
					message: error?.message || "PostgreSQL query failed",
					onRetry: () => refetch()
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "space-y-3",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ jsxs("h3", {
							className: "font-display text-sm font-semibold text-foreground",
							children: [
								"Awaiting Compliance Decision (",
								pendingRequests.length,
								")"
							]
						}), /* @__PURE__ */ jsx("span", {
							className: "text-xs text-muted-foreground",
							children: "Requires dual-authorization before committing to carrier policy records"
						})]
					}), isLoading ? /* @__PURE__ */ jsxs("div", {
						className: "py-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2 border border-border rounded-xl bg-card",
						children: [/* @__PURE__ */ jsx("span", { className: "size-4 rounded-full border-2 border-primary border-t-transparent animate-spin" }), /* @__PURE__ */ jsx("span", { children: "Loading approvals from database..." })]
					}) : pendingRequests.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
						icon: /* @__PURE__ */ jsx(CheckCircle2, { className: "size-8 text-emerald-600" }),
						title: "All caught up! Zero pending approvals",
						description: "High-risk modifications initiated by policyholders via the voice receptionist will appear here for staff sign-off."
					}) : /* @__PURE__ */ jsx("div", {
						className: "grid grid-cols-1 md:grid-cols-2 gap-4",
						children: pendingRequests.map((req) => /* @__PURE__ */ jsx(ApprovalReviewCard, {
							request: req,
							isPendingMutation: mutation.isPending,
							onApprove: (id) => mutation.mutate({
								id,
								status: "approved"
							}),
							onReject: (id) => mutation.mutate({
								id,
								status: "rejected"
							})
						}, req.id))
					})]
				}),
				pastRequests.length > 0 && /* @__PURE__ */ jsxs("div", {
					className: "space-y-3 pt-4 border-t border-border",
					children: [/* @__PURE__ */ jsxs("h3", {
						className: "font-display text-sm font-semibold text-foreground",
						children: [
							"Past Decisions & Audit History (",
							pastRequests.length,
							")"
						]
					}), /* @__PURE__ */ jsx("div", {
						className: "grid grid-cols-1 md:grid-cols-2 gap-4",
						children: pastRequests.map((req) => /* @__PURE__ */ jsx(ApprovalReviewCard, {
							request: req,
							isPendingMutation: false,
							onApprove: () => {},
							onReject: () => {}
						}, req.id))
					})]
				})
			]
		})
	});
}
//#endregion
export { ApprovalsPage as component };
