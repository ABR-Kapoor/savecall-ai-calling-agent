import { r as getCallSessions } from "./insurance.functions-BLePgOSY.js";
import { n as Button } from "./badge-CjGhifle.js";
import { t as AppShell } from "./app-shell-DAPYFpRb.js";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-3hIMutoJ.js";
import { t as Input } from "./input-U8cX-69P.js";
import { a as DialogHeader, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-BKcif44P.js";
import { n as EmptyState, t as ErrorState } from "./error-state-aOFIjvAB.js";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./table-c1eHmahT.js";
import { a as StatusBadge, n as getCallStatusPresentation } from "./status-presentation-L6E3KiEp.js";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import { Mic, PhoneCall, PhoneIncoming, Search } from "lucide-react";
//#region src/routes/_authenticated/calls.tsx?tsr-split=component
function VoiceSessionsPage() {
	const { user } = useUser();
	const [search, setSearch] = useState("");
	const [selectedSession, setSelectedSession] = useState(null);
	const { data: sessions, isLoading, error, refetch } = useQuery({
		queryKey: ["call-sessions-list", user?.id],
		queryFn: () => getCallSessions({ data: { clerkUserId: user?.id } }),
		enabled: !!user?.id
	});
	const filtered = (sessions ?? []).filter((s) => {
		const q = search.toLowerCase();
		const custName = s.customers?.name?.toLowerCase() ?? "";
		const callerName = s.caller_name?.toLowerCase() ?? "";
		const room = s.room_name?.toLowerCase() ?? "";
		const phone = s.caller_phone?.toLowerCase() ?? "";
		return custName.includes(q) || callerName.includes(q) || room.includes(q) || phone.includes(q);
	});
	const formatDuration = (seconds) => {
		if (!seconds && seconds !== 0) return "--";
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
	};
	return /* @__PURE__ */ jsx(AppShell, {
		title: "Voice Sessions",
		subtitle: "Live & archived WebRTC conversational AI calls with transcript logs and outcome verification",
		children: /* @__PURE__ */ jsxs("div", {
			className: "space-y-6",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "relative w-full max-w-sm",
						children: [/* @__PURE__ */ jsx(Search, { className: "absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ jsx(Input, {
							placeholder: "Search by caller, room, or phone...",
							className: "pl-8 text-xs bg-background",
							value: search,
							onChange: (e) => setSearch(e.target.value)
						})]
					}), /* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-3",
						children: [/* @__PURE__ */ jsxs("span", {
							className: "text-xs text-muted-foreground font-mono hidden sm:inline",
							children: [
								"Showing ",
								filtered.length,
								" of ",
								sessions?.length || 0,
								" calls"
							]
						}), /* @__PURE__ */ jsx(Link, {
							to: "/voice",
							children: /* @__PURE__ */ jsxs(Button, {
								size: "sm",
								className: "bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium gap-1.5 shadow-xs w-full sm:w-auto",
								children: [/* @__PURE__ */ jsx(Mic, { className: "size-3.5" }), "Launch Live Call"]
							})
						})]
					})]
				}),
				error && /* @__PURE__ */ jsx(ErrorState, {
					title: "Failed to load voice sessions",
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
								children: "LiveKit Call Registry"
							}), /* @__PURE__ */ jsx(CardDescription, {
								className: "text-xs text-muted-foreground",
								children: "Recorded WebRTC voice sessions and conversational transcripts stored in InsForge PostgreSQL"
							})] })
						})
					}), /* @__PURE__ */ jsx(CardContent, {
						className: "p-0",
						children: isLoading ? /* @__PURE__ */ jsxs("div", {
							className: "py-16 text-center text-xs text-muted-foreground flex flex-col items-center gap-2",
							children: [/* @__PURE__ */ jsx("span", { className: "size-4 rounded-full border-2 border-primary border-t-transparent animate-spin" }), /* @__PURE__ */ jsx("span", { children: "Loading voice sessions from database..." })]
						}) : filtered.length === 0 ? /* @__PURE__ */ jsx("div", {
							className: "p-6",
							children: /* @__PURE__ */ jsx(EmptyState, {
								icon: /* @__PURE__ */ jsx(PhoneCall, { className: "size-8" }),
								title: "No voice sessions found",
								description: search ? "No calls match your search query." : "Start a browser test call to record your first LiveKit session.",
								actionLabel: "Launch Test Call",
								onAction: () => window.location.assign("/voice")
							})
						}) : /* @__PURE__ */ jsx("div", {
							className: "overflow-x-auto",
							children: /* @__PURE__ */ jsxs(Table, { children: [/* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, {
								className: "hover:bg-transparent",
								children: [
									/* @__PURE__ */ jsx(TableHead, {
										className: "text-xs font-semibold",
										children: "Caller"
									}),
									/* @__PURE__ */ jsx(TableHead, {
										className: "text-xs font-semibold",
										children: "LiveKit Room"
									}),
									/* @__PURE__ */ jsx(TableHead, {
										className: "text-xs font-semibold",
										children: "Duration"
									}),
									/* @__PURE__ */ jsx(TableHead, {
										className: "text-xs font-semibold",
										children: "Status"
									}),
									/* @__PURE__ */ jsx(TableHead, {
										className: "text-xs font-semibold",
										children: "Started At"
									}),
									/* @__PURE__ */ jsx(TableHead, {
										className: "text-xs font-semibold",
										children: "Transcript"
									}),
									/* @__PURE__ */ jsx(TableHead, {
										className: "text-xs text-right font-semibold",
										children: "Action"
									})
								]
							}) }), /* @__PURE__ */ jsx(TableBody, { children: filtered.map((s) => {
								const statusInfo = getCallStatusPresentation(s.status);
								return /* @__PURE__ */ jsxs(TableRow, {
									className: "hover:bg-muted/30 transition-colors",
									children: [
										/* @__PURE__ */ jsxs(TableCell, {
											className: "text-xs",
											children: [/* @__PURE__ */ jsxs("div", {
												className: "font-semibold text-foreground flex items-center gap-1.5",
												children: [/* @__PURE__ */ jsx(PhoneIncoming, { className: "size-3.5 text-primary" }), s.caller_name || "Anonymous Caller"]
											}), /* @__PURE__ */ jsx("div", {
												className: "text-[10px] text-muted-foreground font-mono",
												children: s.caller_phone || "WebRTC Client"
											})]
										}),
										/* @__PURE__ */ jsxs(TableCell, {
											className: "text-xs font-mono text-muted-foreground",
											children: [s.room_name?.slice(0, 20), "..."]
										}),
										/* @__PURE__ */ jsx(TableCell, {
											className: "text-xs font-semibold font-mono text-foreground",
											children: formatDuration(s.duration_sec)
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
											children: s.started_at ? new Date(s.started_at).toLocaleString() : "--"
										}),
										/* @__PURE__ */ jsx(TableCell, {
											className: "text-xs text-muted-foreground max-w-xs truncate",
											children: s.transcript ? s.transcript : "No recorded transcript"
										}),
										/* @__PURE__ */ jsx(TableCell, {
											className: "text-right",
											children: /* @__PURE__ */ jsx(Button, {
												variant: "ghost",
												size: "sm",
												onClick: () => setSelectedSession(s),
												className: "h-7 text-xs text-primary hover:text-primary/90 hover:bg-primary/10",
												children: "Inspect"
											})
										})
									]
								}, s.id);
							}) })] })
						})
					})]
				}),
				selectedSession && /* @__PURE__ */ jsx(Dialog, {
					open: !!selectedSession,
					onOpenChange: () => setSelectedSession(null),
					children: /* @__PURE__ */ jsxs(DialogContent, {
						className: "max-w-lg bg-card border-border",
						children: [/* @__PURE__ */ jsxs(DialogHeader, { children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-between pr-6",
								children: [/* @__PURE__ */ jsx("span", {
									className: "font-mono text-xs font-bold text-foreground",
									children: selectedSession.caller_name || "Caller"
								}), /* @__PURE__ */ jsx(StatusBadge, {
									label: getCallStatusPresentation(selectedSession.status).label,
									tone: getCallStatusPresentation(selectedSession.status).tone
								})]
							}),
							/* @__PURE__ */ jsx(DialogTitle, {
								className: "font-display text-lg font-bold text-foreground",
								children: "Voice Session Transcript"
							}),
							/* @__PURE__ */ jsxs(DialogDescription, {
								className: "text-xs text-muted-foreground",
								children: [
									"LiveKit Room: ",
									selectedSession.room_name,
									" • Duration: ",
									formatDuration(selectedSession.duration_sec)
								]
							})
						] }), /* @__PURE__ */ jsxs("div", {
							className: "space-y-4 pt-2 text-xs",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "grid grid-cols-2 gap-3 p-3 rounded-xl border border-border bg-muted/20",
									children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
										className: "text-[10px] text-muted-foreground uppercase font-semibold block",
										children: "Started At"
									}), /* @__PURE__ */ jsx("span", {
										className: "font-medium text-foreground",
										children: selectedSession.started_at ? new Date(selectedSession.started_at).toLocaleString() : "--"
									})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
										className: "text-[10px] text-muted-foreground uppercase font-semibold block",
										children: "Session ID"
									}), /* @__PURE__ */ jsx("span", {
										className: "font-mono text-[10px] text-muted-foreground block truncate",
										children: selectedSession.id
									})] })]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "p-3 rounded-xl border border-border bg-card space-y-2",
									children: [/* @__PURE__ */ jsx("span", {
										className: "text-[10px] text-muted-foreground uppercase font-semibold block",
										children: "Recorded Audio Transcript"
									}), /* @__PURE__ */ jsx("div", {
										className: "font-mono text-xs text-foreground bg-muted/30 p-3 rounded-lg border border-border/60 max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed",
										children: selectedSession.transcript || "No transcript turns captured for this call."
									})]
								}),
								/* @__PURE__ */ jsx("div", {
									className: "flex justify-end pt-2",
									children: /* @__PURE__ */ jsx(Button, {
										size: "sm",
										variant: "outline",
										onClick: () => setSelectedSession(null),
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
export { VoiceSessionsPage as component };
