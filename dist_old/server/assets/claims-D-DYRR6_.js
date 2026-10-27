import { a as getClaims } from "./insurance.functions-BLePgOSY.js";
import { n as Button, r as cn } from "./badge-CjGhifle.js";
import { t as AppShell } from "./app-shell-DAPYFpRb.js";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-3hIMutoJ.js";
import { t as Input } from "./input-U8cX-69P.js";
import { a as DialogHeader, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-BKcif44P.js";
import { n as EmptyState, t as ErrorState } from "./error-state-aOFIjvAB.js";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./table-c1eHmahT.js";
import { a as StatusBadge, r as getClaimStatusPresentation } from "./status-presentation-L6E3KiEp.js";
import { useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import { AlertTriangle, ArrowRight, Calendar, CheckCircle2, Clock, FileText, Search, ShieldAlert, User } from "lucide-react";
//#region src/components/insurance/claim-summary-card.tsx
function ClaimSummaryCard({ claim, onInspect, className }) {
	const statusInfo = getClaimStatusPresentation(claim.status);
	const claimAmount = claim.estimated_amount ?? claim.amount;
	return /* @__PURE__ */ jsx(Card, {
		className: cn("border border-border bg-card shadow-xs hover:border-primary/40 transition-all", className),
		children: /* @__PURE__ */ jsxs(CardContent, {
			className: "p-4 space-y-3",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-start justify-between gap-2",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-2.5",
						children: [/* @__PURE__ */ jsx("span", {
							className: "grid size-8 place-items-center rounded-lg bg-amber-50 text-amber-700 shrink-0",
							children: /* @__PURE__ */ jsx(ShieldAlert, { className: "size-4" })
						}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
							className: "font-mono text-xs font-bold text-foreground",
							children: claim.claim_number
						}), /* @__PURE__ */ jsxs("div", {
							className: "text-[11px] text-muted-foreground flex items-center gap-1",
							children: [
								/* @__PURE__ */ jsx(FileText, { className: "size-3" }),
								" Policy: ",
								claim.policies?.policy_number || "Linked Policy"
							]
						})] })]
					}), /* @__PURE__ */ jsx(StatusBadge, {
						label: statusInfo.label,
						tone: statusInfo.tone
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs space-y-1.5",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ jsxs("span", {
							className: "text-muted-foreground flex items-center gap-1.5",
							children: [/* @__PURE__ */ jsx(User, { className: "size-3" }), " Claimant:"]
						}), /* @__PURE__ */ jsx("span", {
							className: "font-medium text-foreground",
							children: claim.customers?.name || "Verified Policyholder"
						})]
					}), claim.description && /* @__PURE__ */ jsx("p", {
						className: "text-[11px] text-muted-foreground line-clamp-2 leading-relaxed",
						children: claim.description
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-center justify-between text-xs pt-1 border-t border-border/60",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
						className: "text-[10px] text-muted-foreground uppercase block font-medium",
						children: "Estimated Amount"
					}), /* @__PURE__ */ jsx("span", {
						className: "font-semibold text-foreground font-mono",
						children: claimAmount !== void 0 && claimAmount !== null ? `₹${Number(claimAmount).toLocaleString()}` : "Not Provided"
					})] }), /* @__PURE__ */ jsxs("div", {
						className: "text-right",
						children: [/* @__PURE__ */ jsx("span", {
							className: "text-[10px] text-muted-foreground uppercase block font-medium",
							children: "Filed Date"
						}), /* @__PURE__ */ jsxs("span", {
							className: "font-medium text-foreground text-xs flex items-center gap-1",
							children: [/* @__PURE__ */ jsx(Calendar, { className: "size-3 text-muted-foreground" }), claim.created_at ? new Date(claim.created_at).toLocaleDateString() : "--"]
						})]
					})]
				}),
				onInspect && /* @__PURE__ */ jsx("div", {
					className: "pt-2 flex justify-end",
					children: /* @__PURE__ */ jsxs(Button, {
						variant: "ghost",
						size: "sm",
						onClick: () => onInspect(claim),
						className: "text-xs h-7 text-primary hover:text-primary/90 gap-1 p-0 hover:bg-transparent",
						children: ["Review claim timeline ", /* @__PURE__ */ jsx(ArrowRight, { className: "size-3" })]
					})
				})
			]
		})
	});
}
//#endregion
//#region src/components/insurance/claim-progress-timeline.tsx
function ClaimProgressTimeline({ currentStatus, submittedAt, className }) {
	const norm = (currentStatus || "").toLowerCase();
	const isApproved = norm === "approved" || norm === "settled" || norm === "paid";
	const isRejected = norm === "rejected" || norm === "denied";
	const isUnderReview = norm === "in_review" || norm === "under_review" || norm === "processing";
	const stages = [
		{
			id: "intake",
			label: "First Notice of Loss (FNOL)",
			description: "Claim submitted and registered in carrier database",
			timestamp: submittedAt ? new Date(submittedAt).toLocaleString() : void 0,
			status: "completed",
			note: "Registered via InsurCall Voice Assistant"
		},
		{
			id: "review",
			label: "Documentation & Policy Check",
			description: "Coverage verification against active policy terms and exclusions",
			status: isApproved || isRejected ? "completed" : isUnderReview ? "current" : "upcoming",
			note: isUnderReview ? "Under evaluation by claims specialist" : void 0
		},
		{
			id: "decision",
			label: isRejected ? "Claim Denied" : "Assessment & Decision",
			description: isRejected ? "Claim rejected based on policy coverage exclusions" : "Evaluation of approved cashless or reimbursement limits",
			status: isRejected ? "failed" : isApproved ? "completed" : isUnderReview ? "upcoming" : "upcoming"
		},
		{
			id: "settlement",
			label: norm === "paid" ? "Settlement Disbursed" : "Final Settlement",
			description: "Disbursement to hospital TPA or direct policyholder account",
			status: norm === "paid" ? "completed" : isApproved ? "current" : "upcoming",
			note: isApproved ? "Awaiting banking transfer authorization" : void 0
		}
	];
	return /* @__PURE__ */ jsx("div", {
		className: cn("space-y-4", className),
		children: /* @__PURE__ */ jsx("div", {
			className: "relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border",
			children: stages.map((stage) => {
				const isDone = stage.status === "completed";
				const isCurr = stage.status === "current";
				const isFail = stage.status === "failed";
				return /* @__PURE__ */ jsxs("div", {
					className: "relative",
					children: [/* @__PURE__ */ jsxs("div", {
						className: cn("absolute -left-6 top-0.5 grid size-5 place-items-center rounded-full text-white ring-4 ring-background", isDone && "bg-emerald-600", isCurr && "bg-primary animate-pulse", isFail && "bg-rose-600", stage.status === "upcoming" && "bg-muted text-muted-foreground ring-border"),
						children: [
							isDone && /* @__PURE__ */ jsx(CheckCircle2, { className: "size-3" }),
							isCurr && /* @__PURE__ */ jsx(Clock, { className: "size-3" }),
							isFail && /* @__PURE__ */ jsx(AlertTriangle, { className: "size-3" }),
							stage.status === "upcoming" && /* @__PURE__ */ jsx("span", { className: "size-1.5 rounded-full bg-muted-foreground/60" })
						]
					}), /* @__PURE__ */ jsxs("div", {
						className: "space-y-1",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ jsx("h5", {
									className: cn("text-xs font-semibold leading-tight", isDone && "text-foreground", isCurr && "text-primary font-bold", isFail && "text-rose-700", stage.status === "upcoming" && "text-muted-foreground font-normal"),
									children: stage.label
								}), isCurr && /* @__PURE__ */ jsx("span", {
									className: "rounded bg-primary/10 px-1.5 py-0.2 text-[9px] font-semibold text-primary",
									children: "Current Stage"
								})]
							}),
							/* @__PURE__ */ jsx("p", {
								className: "text-[11px] text-muted-foreground leading-relaxed",
								children: stage.description
							}),
							stage.timestamp && /* @__PURE__ */ jsx("div", {
								className: "text-[10px] text-muted-foreground font-mono",
								children: stage.timestamp
							}),
							stage.note && /* @__PURE__ */ jsx("div", {
								className: "mt-1 text-[11px] text-muted-foreground bg-muted/40 px-2 py-1 rounded border border-border/60",
								children: stage.note
							})
						]
					})]
				}, stage.id);
			})
		})
	});
}
//#endregion
//#region src/routes/_authenticated/claims.tsx?tsr-split=component
function ClaimsPage() {
	const { user } = useUser();
	const [search, setSearch] = useState("");
	const [activeClaimModal, setActiveClaimModal] = useState(null);
	const { data: claims, isLoading, error, refetch } = useQuery({
		queryKey: ["claims-list", user?.id],
		queryFn: () => getClaims({ data: { clerkUserId: user?.id } })
	});
	const filtered = (claims ?? []).filter((c) => {
		const q = search.toLowerCase();
		const custName = c.customers?.name?.toLowerCase() ?? "";
		const polNum = c.policies?.policy_number?.toLowerCase() ?? "";
		return (c.claim_number?.toLowerCase() ?? "").includes(q) || polNum.includes(q) || custName.includes(q);
	});
	return /* @__PURE__ */ jsx(AppShell, {
		title: "Claims Processing",
		subtitle: "First Notice of Loss (FNOL) filings and status evaluations registered via voice receptionist",
		children: /* @__PURE__ */ jsxs("div", {
			className: "space-y-6",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "relative w-full max-w-sm",
						children: [/* @__PURE__ */ jsx(Search, { className: "absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ jsx(Input, {
							placeholder: "Search claim #, policy #, or claimant...",
							className: "pl-8 text-xs bg-background",
							value: search,
							onChange: (e) => setSearch(e.target.value)
						})]
					}), /* @__PURE__ */ jsxs("div", {
						className: "text-xs text-muted-foreground self-center sm:self-auto font-mono",
						children: [
							"Showing ",
							filtered.length,
							" of ",
							claims?.length || 0,
							" claims"
						]
					})]
				}),
				error && /* @__PURE__ */ jsx(ErrorState, {
					title: "Failed to load claims",
					message: error?.message || "PostgreSQL query failed",
					onRetry: () => refetch()
				}),
				/* @__PURE__ */ jsxs(Card, {
					className: "border border-border bg-card shadow-xs",
					children: [/* @__PURE__ */ jsx(CardHeader, {
						className: "pb-3 border-b border-border/60",
						children: /* @__PURE__ */ jsx("div", {
							className: "flex items-center justify-between",
							children: /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(CardTitle, {
								className: "text-base font-semibold text-foreground",
								children: "Registered Claims Registry"
							}), /* @__PURE__ */ jsx(CardDescription, {
								className: "text-xs text-muted-foreground",
								children: "Synchronized with InsForge PostgreSQL records and verified against active policy limits"
							})] })
						})
					}), /* @__PURE__ */ jsx(CardContent, {
						className: "p-0",
						children: isLoading ? /* @__PURE__ */ jsxs("div", {
							className: "py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2",
							children: [/* @__PURE__ */ jsx("span", { className: "size-4 rounded-full border-2 border-primary border-t-transparent animate-spin" }), /* @__PURE__ */ jsx("span", { children: "Loading claims from database..." })]
						}) : filtered.length === 0 ? /* @__PURE__ */ jsx("div", {
							className: "p-6",
							children: /* @__PURE__ */ jsx(EmptyState, {
								icon: /* @__PURE__ */ jsx(ShieldAlert, { className: "size-8" }),
								title: "No claims found",
								description: search ? "No claims match your search query." : "New claim inquiries or incident filings will automatically appear here.",
								actionLabel: search ? "Clear Search" : void 0,
								onAction: () => setSearch("")
							})
						}) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("div", {
							className: "hidden md:block overflow-x-auto",
							children: /* @__PURE__ */ jsxs(Table, { children: [/* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, {
								className: "hover:bg-transparent",
								children: [
									/* @__PURE__ */ jsx(TableHead, {
										className: "text-xs font-semibold",
										children: "Claim Number"
									}),
									/* @__PURE__ */ jsx(TableHead, {
										className: "text-xs font-semibold",
										children: "Policy Number"
									}),
									/* @__PURE__ */ jsx(TableHead, {
										className: "text-xs font-semibold",
										children: "Claimant"
									}),
									/* @__PURE__ */ jsx(TableHead, {
										className: "text-xs font-semibold",
										children: "Estimated Amount"
									}),
									/* @__PURE__ */ jsx(TableHead, {
										className: "text-xs font-semibold",
										children: "Status"
									}),
									/* @__PURE__ */ jsx(TableHead, {
										className: "text-xs font-semibold",
										children: "Submitted Date"
									}),
									/* @__PURE__ */ jsx(TableHead, {
										className: "text-xs font-semibold",
										children: "Description"
									}),
									/* @__PURE__ */ jsx(TableHead, {
										className: "text-xs text-right font-semibold",
										children: "Timeline"
									})
								]
							}) }), /* @__PURE__ */ jsx(TableBody, { children: filtered.map((claim) => {
								const statusInfo = getClaimStatusPresentation(claim.status);
								const claimAmount = claim.estimated_amount ?? claim.amount;
								return /* @__PURE__ */ jsxs(TableRow, {
									className: "hover:bg-muted/30 transition-colors",
									children: [
										/* @__PURE__ */ jsx(TableCell, {
											className: "text-xs font-mono font-bold text-foreground",
											children: claim.claim_number
										}),
										/* @__PURE__ */ jsx(TableCell, {
											className: "text-xs font-mono text-primary font-medium",
											children: claim.policies?.policy_number || "-"
										}),
										/* @__PURE__ */ jsx(TableCell, {
											className: "text-xs font-medium text-foreground",
											children: claim.customers?.name || "Unassigned"
										}),
										/* @__PURE__ */ jsx(TableCell, {
											className: "text-xs font-semibold font-mono text-foreground",
											children: claimAmount !== void 0 && claimAmount !== null ? `₹${Number(claimAmount).toLocaleString()}` : ": "
										}),
										/* @__PURE__ */ jsx(TableCell, {
											className: "text-xs",
											children: /* @__PURE__ */ jsx(StatusBadge, {
												label: statusInfo.label,
												tone: statusInfo.tone
											})
										}),
										/* @__PURE__ */ jsx(TableCell, {
											className: "text-xs text-muted-foreground",
											children: claim.created_at ? new Date(claim.created_at).toLocaleDateString() : "--"
										}),
										/* @__PURE__ */ jsx(TableCell, {
											className: "text-xs text-muted-foreground max-w-xs truncate",
											children: claim.description || "First Notice of Loss filing"
										}),
										/* @__PURE__ */ jsx(TableCell, {
											className: "text-right",
											children: /* @__PURE__ */ jsx(Button, {
												variant: "ghost",
												size: "sm",
												onClick: () => setActiveClaimModal(claim),
												className: "h-7 text-xs text-primary hover:text-primary/90 hover:bg-primary/10",
												children: "Review"
											})
										})
									]
								}, claim.id);
							}) })] })
						}), /* @__PURE__ */ jsx("div", {
							className: "md:hidden divide-y divide-border p-3 space-y-3",
							children: filtered.map((claim) => /* @__PURE__ */ jsx(ClaimSummaryCard, {
								claim,
								onInspect: (c) => setActiveClaimModal(c)
							}, claim.id))
						})] })
					})]
				}),
				activeClaimModal && /* @__PURE__ */ jsx(Dialog, {
					open: !!activeClaimModal,
					onOpenChange: () => setActiveClaimModal(null),
					children: /* @__PURE__ */ jsxs(DialogContent, {
						className: "max-w-lg bg-card border-border",
						children: [/* @__PURE__ */ jsxs(DialogHeader, { children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-between pr-6",
								children: [/* @__PURE__ */ jsx("span", {
									className: "font-mono text-xs font-bold text-foreground",
									children: activeClaimModal.claim_number
								}), /* @__PURE__ */ jsx(StatusBadge, {
									label: getClaimStatusPresentation(activeClaimModal.status).label,
									tone: getClaimStatusPresentation(activeClaimModal.status).tone
								})]
							}),
							/* @__PURE__ */ jsx(DialogTitle, {
								className: "font-display text-lg font-bold text-foreground",
								children: "Claim Lifecycle & Timeline"
							}),
							/* @__PURE__ */ jsxs(DialogDescription, {
								className: "text-xs text-muted-foreground",
								children: [
									"Incident details and evaluation steps logged for policy ",
									activeClaimModal.policies?.policy_number,
									"."
								]
							})
						] }), /* @__PURE__ */ jsxs("div", {
							className: "space-y-4 pt-2 text-xs",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "grid grid-cols-2 gap-3 p-3 rounded-xl border border-border bg-muted/20",
									children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
										className: "text-[10px] text-muted-foreground uppercase font-semibold block",
										children: "Claimant"
									}), /* @__PURE__ */ jsx("span", {
										className: "font-medium text-foreground",
										children: activeClaimModal.customers?.name || "Policyholder"
									})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
										className: "text-[10px] text-muted-foreground uppercase font-semibold block",
										children: "Estimated Amount"
									}), /* @__PURE__ */ jsx("span", {
										className: "font-bold text-foreground font-mono",
										children: activeClaimModal.estimated_amount !== void 0 ? `₹${Number(activeClaimModal.estimated_amount).toLocaleString()}` : "Not specified"
									})] })]
								}),
								activeClaimModal.description && /* @__PURE__ */ jsxs("div", {
									className: "p-3 rounded-xl border border-border bg-card",
									children: [/* @__PURE__ */ jsx("span", {
										className: "text-[10px] text-muted-foreground uppercase font-semibold block mb-1",
										children: "Reported Incident Notes"
									}), /* @__PURE__ */ jsx("p", {
										className: "text-xs text-muted-foreground leading-relaxed",
										children: activeClaimModal.description
									})]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "p-4 rounded-xl border border-border bg-card",
									children: [/* @__PURE__ */ jsx("span", {
										className: "text-[10px] text-muted-foreground uppercase font-semibold block mb-3",
										children: "Claim Progress"
									}), /* @__PURE__ */ jsx(ClaimProgressTimeline, {
										currentStatus: activeClaimModal.status,
										submittedAt: activeClaimModal.created_at
									})]
								}),
								/* @__PURE__ */ jsx("div", {
									className: "flex justify-end pt-2",
									children: /* @__PURE__ */ jsx(Button, {
										size: "sm",
										variant: "outline",
										onClick: () => setActiveClaimModal(null),
										className: "text-xs",
										children: "Close"
									})
								})
							]
						})]
					})
				})
			]
		})
	});
}
//#endregion
export { ClaimsPage as component };
