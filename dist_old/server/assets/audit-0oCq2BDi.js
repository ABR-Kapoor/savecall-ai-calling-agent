import { n as getAuditLogs } from "./insurance.functions-BLePgOSY.js";
import { n as Button, t as Badge } from "./badge-CjGhifle.js";
import { t as AppShell } from "./app-shell-DAPYFpRb.js";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-3hIMutoJ.js";
import { t as Input } from "./input-U8cX-69P.js";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./table-c1eHmahT.js";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import { AlertCircle, Search, ShieldCheck, Terminal } from "lucide-react";
//#region src/routes/_authenticated/audit.tsx?tsr-split=component
function AuditLogsPage() {
	const { user } = useUser();
	const [search, setSearch] = useState("");
	const [selectedPayload, setSelectedPayload] = useState(null);
	const { data: logs, isLoading, error } = useQuery({
		queryKey: ["audit-logs-list", user?.id],
		queryFn: () => getAuditLogs({ data: { clerkUserId: user?.id } }),
		enabled: !!user?.id
	});
	const filtered = (logs ?? []).filter((l) => {
		const q = search.toLowerCase();
		const action = l.action?.toLowerCase() ?? "";
		const target = l.target_resource?.toLowerCase() ?? "";
		const actor = l.actor_type?.toLowerCase() ?? "";
		const targetId = l.target_id?.toLowerCase() ?? "";
		return action.includes(q) || target.includes(q) || actor.includes(q) || targetId.includes(q);
	});
	return /* @__PURE__ */ jsx(AppShell, {
		title: "Compliance & Security Audit Trail",
		subtitle: "Immutable cryptographic log of AI voice agent operations, policy access, and risk enforcement actions",
		children: /* @__PURE__ */ jsxs("div", {
			className: "space-y-6",
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "flex items-center justify-between gap-4",
					children: /* @__PURE__ */ jsxs("div", {
						className: "relative w-full max-w-sm",
						children: [/* @__PURE__ */ jsx(Search, { className: "absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ jsx(Input, {
							placeholder: "Search action, target resource, or actor...",
							className: "pl-8 text-xs bg-background",
							value: search,
							onChange: (e) => setSearch(e.target.value)
						})]
					})
				}),
				error && /* @__PURE__ */ jsxs("div", {
					className: "rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2",
					children: [/* @__PURE__ */ jsx(AlertCircle, { className: "h-4 w-4" }), /* @__PURE__ */ jsxs("span", { children: ["Failed to load audit logs: ", error.message] })]
				}),
				/* @__PURE__ */ jsxs(Card, {
					className: "border-border/60 bg-card/60",
					children: [/* @__PURE__ */ jsxs(CardHeader, {
						className: "p-4 sm:p-6 pb-4",
						children: [/* @__PURE__ */ jsx(CardTitle, {
							className: "text-base font-semibold",
							children: "Security Event Log"
						}), /* @__PURE__ */ jsx(CardDescription, {
							className: "text-xs",
							children: "Every tool execution by the voice agent and human officer review is captured in real-time."
						})]
					}), /* @__PURE__ */ jsx(CardContent, {
						className: "p-0",
						children: isLoading ? /* @__PURE__ */ jsx("div", {
							className: "flex justify-center p-8 text-xs text-muted-foreground",
							children: /* @__PURE__ */ jsxs("span", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ jsx("span", { className: "h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" }), "Loading audit trail from database..."]
							})
						}) : filtered.length === 0 ? /* @__PURE__ */ jsxs("div", {
							className: "flex flex-col items-center justify-center p-12 text-center text-muted-foreground space-y-3",
							children: [
								/* @__PURE__ */ jsx(ShieldCheck, { className: "h-10 w-10 text-muted-foreground/40" }),
								/* @__PURE__ */ jsx("p", {
									className: "text-sm font-medium",
									children: "No audit events recorded yet"
								}),
								/* @__PURE__ */ jsx("p", {
									className: "text-xs max-w-sm",
									children: "Voice operations, OTP challenges, and officer policy actions will automatically record tamper-evident entries here."
								})
							]
						}) : /* @__PURE__ */ jsx("div", {
							className: "overflow-x-auto",
							children: /* @__PURE__ */ jsxs(Table, { children: [/* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
								/* @__PURE__ */ jsx(TableHead, {
									className: "text-xs",
									children: "Action / Event"
								}),
								/* @__PURE__ */ jsx(TableHead, {
									className: "text-xs",
									children: "Actor"
								}),
								/* @__PURE__ */ jsx(TableHead, {
									className: "text-xs",
									children: "Target Resource"
								}),
								/* @__PURE__ */ jsx(TableHead, {
									className: "text-xs",
									children: "Risk Level"
								}),
								/* @__PURE__ */ jsx(TableHead, {
									className: "text-xs",
									children: "Status"
								}),
								/* @__PURE__ */ jsx(TableHead, {
									className: "text-xs",
									children: "Timestamp"
								}),
								/* @__PURE__ */ jsx(TableHead, {
									className: "text-xs text-right",
									children: "Payload"
								})
							] }) }), /* @__PURE__ */ jsx(TableBody, { children: filtered.map((l) => {
								const rawRisk = l.risk_level;
								const risk = (typeof rawRisk === "object" && rawRisk !== null ? String(rawRisk.tier || rawRisk.level || "LOW") : String(rawRisk || "LOW")).toUpperCase();
								const riskBadge = risk === "HIGH" || risk === "CRITICAL" ? "border-rose-500/30 bg-rose-500/10 text-rose-400" : risk === "MEDIUM" ? "border-amber-500/30 bg-amber-500/10 text-amber-400" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
								return /* @__PURE__ */ jsxs(TableRow, { children: [
									/* @__PURE__ */ jsx(TableCell, {
										className: "font-medium text-xs",
										children: /* @__PURE__ */ jsx("span", {
											className: "font-mono text-cyan-400",
											children: l.action
										})
									}),
									/* @__PURE__ */ jsx(TableCell, {
										className: "text-xs text-muted-foreground",
										children: /* @__PURE__ */ jsx(Badge, {
											variant: "outline",
											className: "text-[10px]",
											children: l.actor_type || "system"
										})
									}),
									/* @__PURE__ */ jsxs(TableCell, {
										className: "text-xs font-mono text-muted-foreground",
										children: [
											l.target_resource,
											" ",
											l.target_id ? `(${l.target_id.substring(0, 8)}...)` : ""
										]
									}),
									/* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, {
										variant: "outline",
										className: `text-[10px] ${riskBadge}`,
										children: risk
									}) }),
									/* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx(Badge, {
										variant: "outline",
										className: `text-[10px] ${l.status === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : l.status === "rejected" ? "border-rose-500/30 bg-rose-500/10 text-rose-400" : "border-muted text-muted-foreground"}`,
										children: l.status || "logged"
									}) }),
									/* @__PURE__ */ jsx(TableCell, {
										className: "text-xs text-muted-foreground",
										children: l.created_at ? new Date(l.created_at).toLocaleString() : "--"
									}),
									/* @__PURE__ */ jsx(TableCell, {
										className: "text-right",
										children: l.payload ? /* @__PURE__ */ jsxs(Button, {
											variant: "ghost",
											size: "sm",
											className: "h-7 text-xs gap-1",
											onClick: () => setSelectedPayload({
												action: l.action,
												payload: l.payload
											}),
											children: [/* @__PURE__ */ jsx(Terminal, { className: "h-3 w-3 text-cyan-400" }), "Inspect"]
										}) : /* @__PURE__ */ jsx("span", {
											className: "text-[11px] text-muted-foreground",
											children: "None"
										})
									})
								] }, l.id);
							}) })] })
						})
					})]
				}),
				selectedPayload && /* @__PURE__ */ jsx("div", {
					className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4",
					children: /* @__PURE__ */ jsxs(Card, {
						className: "w-full max-w-lg border-border bg-card shadow-2xl",
						children: [/* @__PURE__ */ jsx(CardHeader, {
							className: "pb-3",
							children: /* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ jsxs(CardTitle, {
									className: "text-base font-semibold",
									children: ["Payload Details: ", selectedPayload.action]
								}), /* @__PURE__ */ jsx(Button, {
									variant: "ghost",
									size: "sm",
									className: "h-7 w-7 p-0",
									onClick: () => setSelectedPayload(null),
									children: "✕"
								})]
							})
						}), /* @__PURE__ */ jsxs(CardContent, {
							className: "space-y-4",
							children: [/* @__PURE__ */ jsx("pre", {
								className: "max-h-72 overflow-y-auto rounded-lg border border-border/80 bg-background/80 p-4 font-mono text-[11px] leading-relaxed text-cyan-300",
								children: typeof selectedPayload.payload === "string" ? selectedPayload.payload : JSON.stringify(selectedPayload.payload, null, 2)
							}), /* @__PURE__ */ jsx("div", {
								className: "flex justify-end",
								children: /* @__PURE__ */ jsx(Button, {
									size: "sm",
									onClick: () => setSelectedPayload(null),
									children: "Close"
								})
							})]
						})]
					})
				})
			]
		})
	});
}
//#endregion
export { AuditLogsPage as component };
