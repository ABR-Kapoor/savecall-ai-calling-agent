import { c as getTenantSettings, o as getDashboardMetrics } from "./insurance.functions-BLePgOSY.js";
import { n as Button, t as Badge } from "./badge-CjGhifle.js";
import { t as AppShell } from "./app-shell-DAPYFpRb.js";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-3hIMutoJ.js";
import { t as InsurCallLoadingScreen } from "./loading-screen-C2BweBhg.js";
import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import { AlertCircle, BookOpen, Bot, CheckSquare, ChevronRight, Database, Mic, PhoneCall, Radio, ShieldAlert, ShieldCheck, Zap } from "lucide-react";
//#region src/routes/_authenticated/dashboard.tsx?tsr-split=component
function DashboardPage() {
	const navigate = useNavigate();
	const { user } = useUser();
	const { data: tenant, isLoading: isTenantLoading } = useQuery({
		queryKey: ["tenant-settings", user?.id],
		queryFn: () => getTenantSettings({ data: {
			clerkUserId: user?.id,
			userEmail: user?.primaryEmailAddress?.emailAddress,
			userName: user?.fullName || void 0
		} }),
		enabled: !!user?.id
	});
	const { data: metrics, isLoading: isMetricsLoading, error } = useQuery({
		queryKey: [
			"dashboard-metrics",
			tenant?.id,
			user?.id
		],
		queryFn: () => getDashboardMetrics({ data: {
			tenantId: tenant?.id,
			clerkUserId: user?.id
		} }),
		enabled: !!tenant?.id
	});
	useEffect(() => {
		if (!isTenantLoading) {
			const isCompleted = Boolean((tenant?.branding_config)?.onboarding_completed);
			if (!tenant || !isCompleted) navigate({ to: "/onboarding" });
		}
	}, [
		tenant,
		isTenantLoading,
		navigate
	]);
	if (isTenantLoading) return /* @__PURE__ */ jsx(InsurCallLoadingScreen, {
		message: "Loading insurance command center...",
		submessage: "Connecting to your carrier workspace and verifying onboarding state."
	});
	const branding = tenant?.branding_config || {};
	const companyName = tenant?.name || "Carrier Operations";
	const agentName = branding.agent_config?.name || "Anya";
	const totalCalls = metrics?.totalCalls ?? 0;
	const approvalsCount = metrics?.approvalsCount ?? 0;
	const recentApprovals = metrics?.recentApprovals ?? [];
	return /* @__PURE__ */ jsx(AppShell, {
		title: "Insurance Operations Command Center",
		subtitle: `AI Voice Employee & Compliance Console : ${companyName}`,
		children: /* @__PURE__ */ jsxs("div", {
			className: "space-y-6",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-start gap-4",
						children: [/* @__PURE__ */ jsx("div", {
							className: "hidden sm:grid size-12 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-[#FAF9F6] p-2 shadow-2xs",
							children: /* @__PURE__ */ jsx("img", {
								src: "/01_logo_only_transparent.png",
								alt: "InsurCall Emblem",
								className: "size-full object-contain"
							})
						}), /* @__PURE__ */ jsxs("div", {
							className: "space-y-1",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ jsxs("span", {
										className: "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200",
										children: [/* @__PURE__ */ jsx("span", { className: "size-2 rounded-full bg-emerald-500 animate-pulse" }), "Voice Agent Ready"]
									}), /* @__PURE__ */ jsx("span", {
										className: "text-xs font-mono text-slate-500",
										children: companyName
									})]
								}),
								/* @__PURE__ */ jsxs("h2", {
									className: "font-display text-xl font-bold tracking-tight text-slate-900",
									children: [agentName, " is ready to answer policyholder calls"]
								}),
								/* @__PURE__ */ jsx("p", {
									className: "text-xs text-slate-500 max-w-xl leading-relaxed",
									children: "Autonomous intake for claims, coverage verifications, and cashless inquiries. High-risk nominee changes and payouts are queued for staff adjuster review."
								})
							]
						})]
					}), /* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-2.5 shrink-0",
						children: [/* @__PURE__ */ jsx(Link, {
							to: "/claims",
							children: /* @__PURE__ */ jsxs(Button, {
								variant: "outline",
								size: "sm",
								className: "text-xs gap-1.5 border-slate-200 font-mono",
								children: [/* @__PURE__ */ jsx(ShieldCheck, { className: "size-3.5 text-[#087F8C]" }), " Claims Intake"]
							})
						}), /* @__PURE__ */ jsx(Link, {
							to: "/voice",
							children: /* @__PURE__ */ jsxs(Button, {
								size: "sm",
								className: "bg-[#087F8C] text-white hover:bg-[#076C77] text-xs font-mono gap-1.5 shadow-xs",
								children: [/* @__PURE__ */ jsx(Mic, { className: "size-3.5 text-[#10A6AE]" }), " Test Voice Call"]
							})
						})]
					})]
				}),
				error && /* @__PURE__ */ jsxs("div", {
					className: "rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2",
					children: [/* @__PURE__ */ jsx(AlertCircle, { className: "size-4 shrink-0" }), /* @__PURE__ */ jsxs("span", { children: [
						"Database connection notice:",
						" ",
						error?.message?.includes("<html") || error?.message?.includes("<!doctype") ? "Connecting to database..." : error?.message || "Failed to query tenant metrics"
					] })]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
					children: [
						/* @__PURE__ */ jsxs(Card, {
							className: "border border-slate-200 bg-white shadow-xs rounded-2xl",
							children: [/* @__PURE__ */ jsxs(CardHeader, {
								className: "flex flex-row items-center justify-between pb-2",
								children: [/* @__PURE__ */ jsx("span", {
									className: "text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider",
									children: "Policy Calls"
								}), /* @__PURE__ */ jsx("span", {
									className: "grid size-7 place-items-center rounded-lg bg-[#E6F6F7] text-[#087F8C]",
									children: /* @__PURE__ */ jsx(PhoneCall, { className: "size-3.5" })
								})]
							}), /* @__PURE__ */ jsxs(CardContent, { children: [/* @__PURE__ */ jsx("div", {
								className: "text-2xl font-bold font-display tracking-tight text-slate-900",
								children: isMetricsLoading ? "..." : totalCalls
							}), /* @__PURE__ */ jsx("p", {
								className: "text-[11px] font-mono text-slate-500 mt-1",
								children: "Recorded WebRTC & SIP calls"
							})] })]
						}),
						/* @__PURE__ */ jsxs(Card, {
							className: "border border-slate-200 bg-white shadow-xs rounded-2xl",
							children: [/* @__PURE__ */ jsxs(CardHeader, {
								className: "flex flex-row items-center justify-between pb-2",
								children: [/* @__PURE__ */ jsx("span", {
									className: "text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider",
									children: "First-Call Resolution"
								}), /* @__PURE__ */ jsx("span", {
									className: "grid size-7 place-items-center rounded-lg bg-emerald-50 text-emerald-700",
									children: /* @__PURE__ */ jsx(Zap, { className: "size-3.5" })
								})]
							}), /* @__PURE__ */ jsxs(CardContent, { children: [/* @__PURE__ */ jsx("div", {
								className: "text-2xl font-bold font-display tracking-tight text-emerald-700",
								children: isMetricsLoading ? "..." : totalCalls > 0 ? `${metrics?.automationRate ?? 0}%` : "N/A"
							}), /* @__PURE__ */ jsx("p", {
								className: "text-[11px] font-mono text-slate-500 mt-1",
								children: totalCalls > 0 ? "Resolved without caller wait" : "No calls recorded yet"
							})] })]
						}),
						/* @__PURE__ */ jsxs(Card, {
							className: "border border-slate-200 bg-white shadow-xs rounded-2xl",
							children: [/* @__PURE__ */ jsxs(CardHeader, {
								className: "flex flex-row items-center justify-between pb-2",
								children: [/* @__PURE__ */ jsx("span", {
									className: "text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider",
									children: "Active Claims"
								}), /* @__PURE__ */ jsx("span", {
									className: "grid size-7 place-items-center rounded-lg bg-amber-50 text-amber-700",
									children: /* @__PURE__ */ jsx(ShieldAlert, { className: "size-3.5" })
								})]
							}), /* @__PURE__ */ jsxs(CardContent, { children: [/* @__PURE__ */ jsx("div", {
								className: "text-2xl font-bold font-display tracking-tight text-slate-900",
								children: isMetricsLoading ? "..." : metrics?.claimsCount ?? 0
							}), /* @__PURE__ */ jsx("p", {
								className: "text-[11px] font-mono text-slate-500 mt-1",
								children: "FNOL dockets in progress"
							})] })]
						}),
						/* @__PURE__ */ jsxs(Card, {
							className: "border border-slate-200 bg-white shadow-xs rounded-2xl",
							children: [/* @__PURE__ */ jsxs(CardHeader, {
								className: "flex flex-row items-center justify-between pb-2",
								children: [/* @__PURE__ */ jsx("span", {
									className: "text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider",
									children: "Staff Review Queue"
								}), /* @__PURE__ */ jsx("span", {
									className: "grid size-7 place-items-center rounded-lg bg-blue-50 text-blue-700",
									children: /* @__PURE__ */ jsx(CheckSquare, { className: "size-3.5" })
								})]
							}), /* @__PURE__ */ jsxs(CardContent, { children: [/* @__PURE__ */ jsx("div", {
								className: "text-2xl font-bold font-display tracking-tight text-blue-700",
								children: isMetricsLoading ? "..." : approvalsCount
							}), /* @__PURE__ */ jsx("p", {
								className: "text-[11px] font-mono text-slate-500 mt-1",
								children: "Requires adjuster sign-off"
							})] })]
						})
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "grid grid-cols-1 lg:grid-cols-12 gap-6",
					children: [/* @__PURE__ */ jsx("div", {
						className: "lg:col-span-7",
						children: /* @__PURE__ */ jsxs(Card, {
							className: "border border-slate-200 bg-white shadow-xs rounded-3xl h-full flex flex-col",
							children: [/* @__PURE__ */ jsxs(CardHeader, {
								className: "flex flex-row items-center justify-between pb-3 border-b border-slate-100",
								children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(CardTitle, {
									className: "text-base font-bold text-slate-900",
									children: "High-Risk Approvals Queue"
								}), /* @__PURE__ */ jsx(CardDescription, {
									className: "text-xs text-slate-500 mt-0.5",
									children: "Operations that require dual-control verification before updating carrier records."
								})] }), /* @__PURE__ */ jsx(Link, {
									to: "/change-requests",
									children: /* @__PURE__ */ jsxs(Button, {
										variant: "ghost",
										size: "sm",
										className: "text-xs text-[#087F8C] hover:text-[#076C77] gap-1 font-mono",
										children: ["View All ", /* @__PURE__ */ jsx(ChevronRight, { className: "size-3.5" })]
									})
								})]
							}), /* @__PURE__ */ jsx(CardContent, {
								className: "pt-4 flex-1",
								children: recentApprovals.length > 0 ? /* @__PURE__ */ jsx("div", {
									className: "space-y-3",
									children: recentApprovals.map((req) => /* @__PURE__ */ jsxs("div", {
										className: "rounded-2xl border border-slate-100 bg-[#FAF9F6] p-4 text-xs space-y-2",
										children: [
											/* @__PURE__ */ jsxs("div", {
												className: "flex items-center justify-between",
												children: [/* @__PURE__ */ jsx("span", {
													className: "font-mono text-xs font-bold text-slate-900",
													children: req.request_type?.replace(/_/g, " ").toUpperCase() || "Change Request"
												}), /* @__PURE__ */ jsx(Badge, {
													variant: "outline",
													className: "text-[10px] font-mono text-amber-800 bg-amber-50 border-amber-200 font-semibold",
													children: req.status?.toUpperCase() || "PENDING"
												})]
											}),
											/* @__PURE__ */ jsx("p", {
												className: "text-slate-600 text-[11.5px] leading-relaxed",
												children: req.payload?.description || req.payload?.reason || "Pending staff adjuster authorization."
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "flex items-center justify-between pt-1 text-[11px] text-slate-400 font-mono",
												children: [/* @__PURE__ */ jsxs("span", { children: ["Status: ", req.status] }), /* @__PURE__ */ jsx(Link, {
													to: "/change-requests",
													className: "text-[#087F8C] font-semibold hover:underline",
													children: "Review & Authorize"
												})]
											})
										]
									}, req.id))
								}) : /* @__PURE__ */ jsxs("div", {
									className: "rounded-2xl border border-dashed border-slate-200 bg-[#FAF9F6] p-8 text-center space-y-3 my-auto",
									children: [
										/* @__PURE__ */ jsx("div", {
											className: "grid size-10 place-items-center rounded-xl bg-white border border-slate-200 text-slate-500 mx-auto shadow-2xs",
											children: /* @__PURE__ */ jsx(CheckSquare, { className: "size-5 text-[#087F8C]" })
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "space-y-1",
											children: [/* @__PURE__ */ jsx("h4", {
												className: "text-sm font-semibold text-slate-900",
												children: "No Pending Approvals"
											}), /* @__PURE__ */ jsx("p", {
												className: "text-xs text-slate-500 max-w-sm mx-auto leading-relaxed",
												children: "High-risk operations like nominee benefit changes or cashless pre-authorizations requiring dual-control verification will appear here automatically."
											})]
										}),
										/* @__PURE__ */ jsx("div", {
											className: "pt-2",
											children: /* @__PURE__ */ jsx(Link, {
												to: "/train",
												children: /* @__PURE__ */ jsxs(Button, {
													variant: "outline",
													size: "sm",
													className: "text-xs gap-1.5 border-slate-200 font-mono",
													children: [/* @__PURE__ */ jsx(BookOpen, { className: "size-3.5 text-[#087F8C]" }), " Manage Knowledge Store"]
												})
											})
										})
									]
								})
							})]
						})
					}), /* @__PURE__ */ jsx("div", {
						className: "lg:col-span-5",
						children: /* @__PURE__ */ jsxs(Card, {
							className: "border border-slate-200 bg-white shadow-xs rounded-3xl h-full flex flex-col justify-between",
							children: [/* @__PURE__ */ jsxs(CardHeader, {
								className: "pb-3 border-b border-slate-100",
								children: [/* @__PURE__ */ jsxs(CardTitle, {
									className: "text-base font-bold text-slate-900 flex items-center justify-between",
									children: [/* @__PURE__ */ jsx("span", { children: "Carrier System Health" }), /* @__PURE__ */ jsx("span", { className: "flex size-2 rounded-full bg-emerald-500 animate-pulse" })]
								}), /* @__PURE__ */ jsx(CardDescription, {
									className: "text-xs text-slate-500 mt-0.5",
									children: "Live status across voice channels, database RLS, and model routing."
								})]
							}), /* @__PURE__ */ jsxs(CardContent, {
								className: "pt-4 space-y-3.5 text-xs",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-[#FAF9F6]",
										children: [/* @__PURE__ */ jsxs("div", {
											className: "flex items-center gap-2.5",
											children: [/* @__PURE__ */ jsx(Radio, { className: "size-4 text-[#087F8C]" }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
												className: "font-semibold text-slate-900 block",
												children: "LiveKit Media Server"
											}), /* @__PURE__ */ jsx("span", {
												className: "text-[10px] font-mono text-slate-400",
												children: "WebRTC audio streaming port 7880"
											})] })]
										}), /* @__PURE__ */ jsx(Badge, {
											variant: "outline",
											className: "text-[10px] font-mono text-emerald-800 bg-emerald-50 border-emerald-200",
											children: "Active"
										})]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-[#FAF9F6]",
										children: [/* @__PURE__ */ jsxs("div", {
											className: "flex items-center gap-2.5",
											children: [/* @__PURE__ */ jsx(Database, { className: "size-4 text-[#087F8C]" }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
												className: "font-semibold text-slate-900 block",
												children: "PostgreSQL Database"
											}), /* @__PURE__ */ jsx("span", {
												className: "text-[10px] font-mono text-slate-400",
												children: "Multi-tenant RLS active"
											})] })]
										}), /* @__PURE__ */ jsx(Badge, {
											variant: "outline",
											className: "text-[10px] font-mono text-emerald-800 bg-emerald-50 border-emerald-200",
											children: "Connected"
										})]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-[#FAF9F6]",
										children: [/* @__PURE__ */ jsxs("div", {
											className: "flex items-center gap-2.5",
											children: [/* @__PURE__ */ jsx(Bot, { className: "size-4 text-[#087F8C]" }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
												className: "font-semibold text-slate-900 block",
												children: "Python Agent Worker"
											}), /* @__PURE__ */ jsx("span", {
												className: "text-[10px] font-mono text-slate-400",
												children: "Groq / Ollama sub-second routing"
											})] })]
										}), /* @__PURE__ */ jsx(Badge, {
											variant: "outline",
											className: "text-[10px] font-mono text-emerald-800 bg-emerald-50 border-emerald-200",
											children: "Registered"
										})]
									}),
									/* @__PURE__ */ jsx("div", {
										className: "pt-2",
										children: /* @__PURE__ */ jsx(Button, {
											asChild: true,
											variant: "outline",
											className: "w-full text-xs font-mono h-10 rounded-xl border-slate-200",
											children: /* @__PURE__ */ jsx(Link, {
												to: "/audit",
												children: "INSPECT REGULATORY COMPLIANCE TRAIL"
											})
										})
									})
								]
							})]
						})
					})]
				})
			]
		})
	});
}
//#endregion
export { DashboardPage as component };
