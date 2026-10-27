import { s as getPolicies } from "./insurance.functions-BLePgOSY.js";
import { n as Button, r as cn } from "./badge-CjGhifle.js";
import { t as AppShell } from "./app-shell-DAPYFpRb.js";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-3hIMutoJ.js";
import { t as Input } from "./input-U8cX-69P.js";
import { a as DialogHeader, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-BKcif44P.js";
import { n as EmptyState, t as ErrorState } from "./error-state-aOFIjvAB.js";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./table-c1eHmahT.js";
import { a as StatusBadge, i as getPolicyStatusPresentation } from "./status-presentation-L6E3KiEp.js";
import { useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import { ArrowRight, Calendar, Car, HeartPulse, Home, Layers, Search, Shield, User } from "lucide-react";
//#region src/components/insurance/policy-type-tile.tsx
var DEFAULT_POLICY_CATEGORIES = [
	{
		id: "all",
		label: "All Policies",
		icon: Layers
	},
	{
		id: "health",
		label: "Health Shield",
		icon: HeartPulse
	},
	{
		id: "auto",
		label: "Motor & Auto",
		icon: Car
	},
	{
		id: "life",
		label: "Term Life",
		icon: Shield
	},
	{
		id: "property",
		label: "Property / Home",
		icon: Home
	}
];
function PolicyTypeTiles({ categories = DEFAULT_POLICY_CATEGORIES, selectedCategory, onSelect, className }) {
	return /* @__PURE__ */ jsx("div", {
		className: cn("grid grid-cols-2 sm:grid-cols-5 gap-2.5", className),
		children: categories.map((cat) => {
			const Icon = cat.icon;
			const isSelected = selectedCategory === cat.id;
			return /* @__PURE__ */ jsxs("button", {
				type: "button",
				onClick: () => onSelect(cat.id),
				className: cn("flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer", isSelected ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs ring-1 ring-primary/30" : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/40"),
				children: [/* @__PURE__ */ jsx("span", {
					className: cn("grid size-8 place-items-center rounded-lg shrink-0", isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"),
					children: /* @__PURE__ */ jsx(Icon, { className: "size-4" })
				}), /* @__PURE__ */ jsxs("div", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ jsx("div", {
						className: "text-xs font-medium truncate",
						children: cat.label
					}), typeof cat.count === "number" && /* @__PURE__ */ jsxs("div", {
						className: "text-[10px] text-muted-foreground font-mono",
						children: [cat.count, " active"]
					})]
				})]
			}, cat.id);
		})
	});
}
//#endregion
//#region src/components/insurance/policy-summary-card.tsx
function PolicySummaryCard({ policy, onView, className }) {
	const statusInfo = getPolicyStatusPresentation(policy.status);
	const typeLower = (policy.policy_type || "").toLowerCase();
	const TypeIcon = typeLower.includes("health") || typeLower.includes("medic") ? HeartPulse : typeLower.includes("auto") || typeLower.includes("motor") ? Car : Shield;
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
							className: "grid size-8 place-items-center rounded-lg bg-primary/10 text-primary shrink-0",
							children: /* @__PURE__ */ jsx(TypeIcon, { className: "size-4" })
						}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
							className: "font-mono text-xs font-bold text-primary tracking-tight",
							children: policy.policy_number
						}), /* @__PURE__ */ jsx("h4", {
							className: "text-xs font-semibold text-foreground leading-tight",
							children: policy.plan_name
						})] })]
					}), /* @__PURE__ */ jsx(StatusBadge, {
						label: statusInfo.label,
						tone: statusInfo.tone
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs space-y-1",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ jsxs("span", {
							className: "text-muted-foreground flex items-center gap-1.5",
							children: [/* @__PURE__ */ jsx(User, { className: "size-3" }), " Policyholder:"]
						}), /* @__PURE__ */ jsx("span", {
							className: "font-medium text-foreground",
							children: policy.customers?.name || "Verified Policyholder"
						})]
					}), policy.nominee_name && /* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between text-[11px]",
						children: [/* @__PURE__ */ jsx("span", {
							className: "text-muted-foreground",
							children: "Nominee:"
						}), /* @__PURE__ */ jsxs("span", {
							className: "text-foreground",
							children: [
								policy.nominee_name,
								" (",
								policy.nominee_relationship || "Designee",
								")"
							]
						})]
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-center justify-between text-xs pt-1 border-t border-border/60",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
						className: "text-[10px] text-muted-foreground uppercase block font-medium",
						children: "Premium"
					}), /* @__PURE__ */ jsxs("span", {
						className: "font-semibold text-foreground font-mono",
						children: [
							"₹",
							Number(policy.premium_amount || 0).toLocaleString(),
							" / yr"
						]
					})] }), /* @__PURE__ */ jsxs("div", {
						className: "text-right",
						children: [/* @__PURE__ */ jsx("span", {
							className: "text-[10px] text-muted-foreground uppercase block font-medium",
							children: "Renewal Date"
						}), /* @__PURE__ */ jsxs("span", {
							className: "font-medium text-foreground text-xs flex items-center gap-1",
							children: [/* @__PURE__ */ jsx(Calendar, { className: "size-3 text-muted-foreground" }), policy.due_date || "Annual"]
						})]
					})]
				}),
				onView && /* @__PURE__ */ jsx("div", {
					className: "pt-2 flex justify-end",
					children: /* @__PURE__ */ jsxs(Button, {
						variant: "ghost",
						size: "sm",
						onClick: () => onView(policy),
						className: "text-xs h-7 text-primary hover:text-primary/90 gap-1 p-0 hover:bg-transparent",
						children: ["View policy details ", /* @__PURE__ */ jsx(ArrowRight, { className: "size-3" })]
					})
				})
			]
		})
	});
}
//#endregion
//#region src/routes/_authenticated/policies.tsx?tsr-split=component
function PoliciesPage() {
	const { user } = useUser();
	const [search, setSearch] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("all");
	const [activePolicyModal, setActivePolicyModal] = useState(null);
	const { data: policies, isLoading, error, refetch } = useQuery({
		queryKey: ["policies-list", user?.id],
		queryFn: () => getPolicies({ data: { clerkUserId: user?.id } })
	});
	const filtered = (policies ?? []).filter((p) => {
		const q = search.toLowerCase();
		const custName = p.customers?.name?.toLowerCase() ?? "";
		const custNum = p.customers?.customer_number?.toLowerCase() ?? "";
		const polNum = p.policy_number?.toLowerCase() ?? "";
		const plan = p.plan_name?.toLowerCase() ?? "";
		const type = (p.policy_type || "").toLowerCase();
		if (!(polNum.includes(q) || plan.includes(q) || custName.includes(q) || custNum.includes(q))) return false;
		if (selectedCategory === "all") return true;
		if (selectedCategory === "health") return type.includes("health") || type.includes("medic");
		if (selectedCategory === "auto") return type.includes("auto") || type.includes("motor");
		if (selectedCategory === "life") return type.includes("life") || type.includes("term");
		if (selectedCategory === "property") return type.includes("prop") || type.includes("home");
		return true;
	});
	return /* @__PURE__ */ jsx(AppShell, {
		title: "Policy Directory",
		subtitle: "Policyholder coverage records protected under InsForge tenant isolation",
		children: /* @__PURE__ */ jsxs("div", {
			className: "space-y-6",
			children: [
				/* @__PURE__ */ jsx(PolicyTypeTiles, {
					selectedCategory,
					onSelect: (cat) => setSelectedCategory(cat)
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "relative w-full max-w-sm",
						children: [/* @__PURE__ */ jsx(Search, { className: "absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ jsx(Input, {
							placeholder: "Search policy #, plan, or customer...",
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
							policies?.length || 0,
							" policies"
						]
					})]
				}),
				error && /* @__PURE__ */ jsx(ErrorState, {
					title: "Failed to load policies",
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
								children: "Active & Scoped Policies"
							}), /* @__PURE__ */ jsx(CardDescription, {
								className: "text-xs text-muted-foreground",
								children: "InsForge Row Level Security ensures queries remain strictly isolated to this carrier workspace"
							})] })
						})
					}), /* @__PURE__ */ jsx(CardContent, {
						className: "p-0",
						children: isLoading ? /* @__PURE__ */ jsxs("div", {
							className: "py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2",
							children: [/* @__PURE__ */ jsx("span", { className: "size-4 rounded-full border-2 border-primary border-t-transparent animate-spin" }), /* @__PURE__ */ jsx("span", { children: "Loading policies from database..." })]
						}) : filtered.length === 0 ? /* @__PURE__ */ jsx("div", {
							className: "p-6",
							children: /* @__PURE__ */ jsx(EmptyState, {
								icon: /* @__PURE__ */ jsx(Shield, { className: "size-8" }),
								title: "No policies found",
								description: search || selectedCategory !== "all" ? "No records matched your search or category filter. Try clearing your filters." : "New policies created in InsForge will automatically appear here.",
								actionLabel: search || selectedCategory !== "all" ? "Reset Filters" : void 0,
								onAction: () => {
									setSearch("");
									setSelectedCategory("all");
								}
							})
						}) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("div", {
							className: "hidden md:block overflow-x-auto",
							children: /* @__PURE__ */ jsxs(Table, { children: [/* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, {
								className: "hover:bg-transparent",
								children: [
									/* @__PURE__ */ jsx(TableHead, {
										className: "text-xs font-semibold",
										children: "Policy Number"
									}),
									/* @__PURE__ */ jsx(TableHead, {
										className: "text-xs font-semibold",
										children: "Policyholder"
									}),
									/* @__PURE__ */ jsx(TableHead, {
										className: "text-xs font-semibold",
										children: "Plan & Category"
									}),
									/* @__PURE__ */ jsx(TableHead, {
										className: "text-xs font-semibold",
										children: "Annual Premium"
									}),
									/* @__PURE__ */ jsx(TableHead, {
										className: "text-xs font-semibold",
										children: "Renewal Date"
									}),
									/* @__PURE__ */ jsx(TableHead, {
										className: "text-xs font-semibold",
										children: "Status"
									}),
									/* @__PURE__ */ jsx(TableHead, {
										className: "text-xs font-semibold",
										children: "Nominee"
									}),
									/* @__PURE__ */ jsx(TableHead, {
										className: "text-xs text-right font-semibold",
										children: "Details"
									})
								]
							}) }), /* @__PURE__ */ jsx(TableBody, { children: filtered.map((policy) => {
								const statusInfo = getPolicyStatusPresentation(policy.status);
								return /* @__PURE__ */ jsxs(TableRow, {
									className: "hover:bg-muted/30 transition-colors",
									children: [
										/* @__PURE__ */ jsx(TableCell, {
											className: "text-xs font-mono font-bold text-primary",
											children: policy.policy_number
										}),
										/* @__PURE__ */ jsxs(TableCell, {
											className: "text-xs",
											children: [/* @__PURE__ */ jsx("div", {
												className: "font-medium text-foreground",
												children: policy.customers?.name || "Unassigned"
											}), /* @__PURE__ */ jsx("div", {
												className: "text-[10px] text-muted-foreground font-mono",
												children: policy.customers?.customer_number || "-"
											})]
										}),
										/* @__PURE__ */ jsxs(TableCell, {
											className: "text-xs",
											children: [/* @__PURE__ */ jsx("div", {
												className: "font-medium text-foreground",
												children: policy.plan_name
											}), /* @__PURE__ */ jsx("div", {
												className: "text-[10px] text-muted-foreground uppercase",
												children: policy.policy_type
											})]
										}),
										/* @__PURE__ */ jsxs(TableCell, {
											className: "text-xs font-semibold font-mono text-foreground",
											children: ["₹", Number(policy.premium_amount || 0).toLocaleString()]
										}),
										/* @__PURE__ */ jsx(TableCell, {
											className: "text-xs text-muted-foreground",
											children: policy.due_date || "-"
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
											children: policy.nominee_name ? `${policy.nominee_name} (${policy.nominee_relationship || "Nominee"})` : "None"
										}),
										/* @__PURE__ */ jsx(TableCell, {
											className: "text-right",
											children: /* @__PURE__ */ jsx(Button, {
												variant: "ghost",
												size: "sm",
												onClick: () => setActivePolicyModal(policy),
												className: "h-7 text-xs text-primary hover:text-primary/90 hover:bg-primary/10",
												children: "View"
											})
										})
									]
								}, policy.id);
							}) })] })
						}), /* @__PURE__ */ jsx("div", {
							className: "md:hidden divide-y divide-border p-3 space-y-3",
							children: filtered.map((policy) => /* @__PURE__ */ jsx(PolicySummaryCard, {
								policy,
								onView: (p) => setActivePolicyModal(p)
							}, policy.id))
						})] })
					})]
				}),
				activePolicyModal && /* @__PURE__ */ jsx(Dialog, {
					open: !!activePolicyModal,
					onOpenChange: () => setActivePolicyModal(null),
					children: /* @__PURE__ */ jsxs(DialogContent, {
						className: "max-w-lg bg-card border-border",
						children: [/* @__PURE__ */ jsxs(DialogHeader, { children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-between pr-6",
								children: [/* @__PURE__ */ jsx("span", {
									className: "font-mono text-xs font-bold text-primary",
									children: activePolicyModal.policy_number
								}), /* @__PURE__ */ jsx(StatusBadge, {
									label: getPolicyStatusPresentation(activePolicyModal.status).label,
									tone: getPolicyStatusPresentation(activePolicyModal.status).tone
								})]
							}),
							/* @__PURE__ */ jsx(DialogTitle, {
								className: "font-display text-lg font-bold text-foreground",
								children: activePolicyModal.plan_name
							}),
							/* @__PURE__ */ jsx(DialogDescription, {
								className: "text-xs text-muted-foreground",
								children: "Policy terms, cashless network provisions, and registered beneficiaries."
							})
						] }), /* @__PURE__ */ jsxs("div", {
							className: "space-y-4 pt-2 text-xs",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "grid grid-cols-2 gap-3 p-3 rounded-xl border border-border bg-muted/20",
									children: [/* @__PURE__ */ jsxs("div", { children: [
										/* @__PURE__ */ jsx("span", {
											className: "text-[10px] text-muted-foreground uppercase font-semibold block",
											children: "Policyholder"
										}),
										/* @__PURE__ */ jsx("span", {
											className: "font-medium text-foreground",
											children: activePolicyModal.customers?.name || "Verified Customer"
										}),
										/* @__PURE__ */ jsx("span", {
											className: "text-[10px] text-muted-foreground block font-mono",
											children: activePolicyModal.customers?.customer_number
										})
									] }), /* @__PURE__ */ jsxs("div", { children: [
										/* @__PURE__ */ jsx("span", {
											className: "text-[10px] text-muted-foreground uppercase font-semibold block",
											children: "Annual Premium"
										}),
										/* @__PURE__ */ jsxs("span", {
											className: "font-bold text-foreground font-mono",
											children: ["₹", Number(activePolicyModal.premium_amount || 0).toLocaleString()]
										}),
										/* @__PURE__ */ jsxs("span", {
											className: "text-[10px] text-muted-foreground block",
											children: ["Due: ", activePolicyModal.due_date || "Annual"]
										})
									] })]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "p-3 rounded-xl border border-border bg-card space-y-2",
									children: [
										/* @__PURE__ */ jsx("span", {
											className: "text-[10px] text-muted-foreground uppercase font-semibold block",
											children: "Registered Nominee"
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "flex items-center justify-between",
											children: [/* @__PURE__ */ jsx("span", {
												className: "font-medium text-foreground",
												children: activePolicyModal.nominee_name || "None designated"
											}), /* @__PURE__ */ jsxs("span", {
												className: "text-[11px] text-muted-foreground",
												children: ["Relationship: ", activePolicyModal.nominee_relationship || "N/A"]
											})]
										}),
										/* @__PURE__ */ jsx("p", {
											className: "text-[11px] text-muted-foreground pt-1",
											children: "To modify nominee or contact info, callers must complete 2FA OTP verification via the voice receptionist or request compliance sign-off."
										})
									]
								}),
								/* @__PURE__ */ jsx("div", {
									className: "flex justify-end pt-2",
									children: /* @__PURE__ */ jsx(Button, {
										size: "sm",
										variant: "outline",
										onClick: () => setActivePolicyModal(null),
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
export { PoliciesPage as component };
