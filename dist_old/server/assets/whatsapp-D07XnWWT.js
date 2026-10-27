import { t as createServerFn } from "./createServerFn-CIHAFgYl.js";
import { h as createSsrRpc } from "./insurance.functions-BLePgOSY.js";
import { n as Button, t as Badge } from "./badge-CjGhifle.js";
import { t as AppShell } from "./app-shell-DAPYFpRb.js";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-3hIMutoJ.js";
import { t as Input } from "./input-U8cX-69P.js";
import { t as Label } from "./label-CJoWdPh2.js";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-BKcif44P.js";
import { useEffect, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import { AlertCircle, Bot, CheckCircle2, MessageSquare, PhoneCall, PowerOff, QrCode, RefreshCw, Search, Send, ShieldCheck, Smartphone, User, UserCheck } from "lucide-react";
//#region src/lib/whatsapp.functions.ts
/**
* InsurCall WhatsApp Server Functions
* Multi-tenant connection management, QR pairing, unified inbox, and human takeover.
*/
var ScopedWhatsAppInput = z.object({
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional()
});
/**
* 1. Get current WhatsApp connection for the authenticated tenant
*/
var getWhatsAppConnection = createServerFn({
	method: "GET",
	strict: false
}).validator((input) => ScopedWhatsAppInput.parse(input ?? {})).handler(createSsrRpc("a4866e5f33b8c3c58fb1cef8398de0208e5f172486802b11eb1b41e77068aa19"));
var InitiateSessionInput = z.object({
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional(),
	sessionName: z.string().min(2).max(50).optional()
});
/**
* 2. Initiate WhatsApp session and generate real provider QR code
*/
var initiateWhatsAppSession = createServerFn({
	method: "POST",
	strict: false
}).validator((input) => InitiateSessionInput.parse(input)).handler(createSsrRpc("dd48e98c262f6db60778d78e641007764764eb2a63dfff5d9cc1e506a2c70873"));
var SessionActionInput = z.object({
	id: z.string().uuid(),
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional()
});
/**
* 3. Refresh live QR code
*/
var refreshWhatsAppQr = createServerFn({
	method: "POST",
	strict: false
}).validator((input) => SessionActionInput.parse(input)).handler(createSsrRpc("2160a98ace36990dd06f0995317c4422b88a98ff4972e54e9442e8a88fe760b6"));
/**
* 4. Disconnect WhatsApp Session
*/
var disconnectWhatsAppSession = createServerFn({
	method: "POST",
	strict: false
}).validator((input) => SessionActionInput.parse(input)).handler(createSsrRpc("837df2bbb846477561b4da27152a8b23dd479f424b27665f413b75b9ebbf3636"));
var TestMessageInput = z.object({
	id: z.string().uuid(),
	recipientPhone: z.string().min(8).max(20),
	messageText: z.string().min(1).max(1e3),
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional()
});
/**
* 5. Send a test WhatsApp message from the connected account
*/
var sendWhatsAppTestMessage = createServerFn({
	method: "POST",
	strict: false
}).validator((input) => TestMessageInput.parse(input)).handler(createSsrRpc("5190d7f2b82ab5a8a7aded89f28a14121cdf19fbc2d8ccce3fc5b512785045a1"));
/**
* 6. List unified inbox conversations for the authenticated tenant
*/
var getWhatsAppConversations = createServerFn({
	method: "GET",
	strict: false
}).validator((input) => ScopedWhatsAppInput.parse(input ?? {})).handler(createSsrRpc("6706b82883cc23bf0241e886e471a5ad2bec20977b8d238c841c208e3c95188c"));
var ConversationMessagesInput = z.object({
	conversationId: z.string().uuid(),
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional()
});
/**
* 7. List messages for a specific conversation thread
*/
var getWhatsAppMessages = createServerFn({
	method: "GET",
	strict: false
}).validator((input) => ConversationMessagesInput.parse(input)).handler(createSsrRpc("2edb08fba265dd1b4700a675f616ef9078bf1e3468ab370cfa010d0db6fa70fc"));
var SendChatMessageInput = z.object({
	conversationId: z.string().uuid(),
	text: z.string().min(1).max(4e3),
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional()
});
/**
* 8. Send staff outbound reply in conversation (with human takeover)
*/
var sendWhatsAppChatMessage = createServerFn({
	method: "POST",
	strict: false
}).validator((input) => SendChatMessageInput.parse(input)).handler(createSsrRpc("002122668dae3048b3d5e5dbfb5e98150c38ba360a7f55b7e955348db3b08a2d"));
var TakeoverToggleInput = z.object({
	conversationId: z.string().uuid(),
	humanTakeover: z.boolean(),
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional()
});
/**
* 9. Toggle human takeover on a conversation
*/
var toggleWhatsAppHumanTakeover = createServerFn({
	method: "POST",
	strict: false
}).validator((input) => TakeoverToggleInput.parse(input)).handler(createSsrRpc("b30e22df8794c813a017561bba6ea2d6261387dd24e8d334871b7aa220b95477"));
var AutoReplyToggleInput = z.object({
	connectionId: z.string().uuid(),
	autoReplyEnabled: z.boolean(),
	tenantId: z.string().uuid().optional(),
	clerkUserId: z.string().optional()
});
/**
* 10. Toggle automated AI replies on the connection
*/
var toggleWhatsAppAutoReply = createServerFn({
	method: "POST",
	strict: false
}).validator((input) => AutoReplyToggleInput.parse(input)).handler(createSsrRpc("4942b59e9e74a323d5201e08801b96206c57254500880a19edaeef32f3500eb9"));
//#endregion
//#region src/routes/_authenticated/whatsapp.tsx?tsr-split=component
function WhatsAppManagementPage() {
	const { user } = useUser();
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState("connection");
	const [selectedConversationId, setSelectedConversationId] = useState(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [replyText, setReplyText] = useState("");
	const [isTestModalOpen, setIsTestModalOpen] = useState(false);
	const [testPhone, setTestPhone] = useState("+919876543210");
	const [testMessage, setTestMessage] = useState("Hello! This is a test message from InsurCall.");
	const [testResult, setTestResult] = useState(null);
	const [testError, setTestError] = useState(null);
	const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
	const { data: connData, isLoading: isConnLoading, refetch: refetchConn } = useQuery({
		queryKey: ["whatsapp-connection", user?.id],
		queryFn: () => getWhatsAppConnection({ data: { clerkUserId: user?.id } }),
		refetchInterval: (query) => {
			const status = query.state.data?.connection?.status;
			return status === "STARTING" || status === "QR_READY" ? 4e3 : 15e3;
		}
	});
	const connection = connData?.connection;
	const providerHealth = connData?.providerHealth;
	const { data: conversations = [], refetch: refetchConversations } = useQuery({
		queryKey: ["whatsapp-conversations", user?.id],
		queryFn: () => getWhatsAppConversations({ data: { clerkUserId: user?.id } }),
		refetchInterval: 5e3
	});
	useEffect(() => {
		if (!selectedConversationId && conversations.length > 0) {
			const first = conversations[0];
			if (first) setSelectedConversationId(first.id);
		}
	}, [conversations, selectedConversationId]);
	const { data: messages = [], refetch: refetchMessages } = useQuery({
		queryKey: [
			"whatsapp-messages",
			selectedConversationId,
			user?.id
		],
		queryFn: () => selectedConversationId ? getWhatsAppMessages({ data: {
			conversationId: selectedConversationId,
			clerkUserId: user?.id
		} }) : Promise.resolve([]),
		enabled: Boolean(selectedConversationId),
		refetchInterval: 3e3
	});
	const initiateMutation = useMutation({
		mutationFn: () => initiateWhatsAppSession({ data: { clerkUserId: user?.id } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["whatsapp-connection"] });
		}
	});
	const refreshQrMutation = useMutation({
		mutationFn: (id) => refreshWhatsAppQr({ data: {
			id,
			clerkUserId: user?.id
		} }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["whatsapp-connection"] });
		}
	});
	const disconnectMutation = useMutation({
		mutationFn: (id) => disconnectWhatsAppSession({ data: {
			id,
			clerkUserId: user?.id
		} }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["whatsapp-connection"] });
			setIsDisconnectModalOpen(false);
		}
	});
	const sendTestMutation = useMutation({
		mutationFn: () => {
			if (!connection) throw new Error("No connection");
			return sendWhatsAppTestMessage({ data: {
				id: connection.id,
				recipientPhone: testPhone,
				messageText: testMessage,
				clerkUserId: user?.id
			} });
		},
		onSuccess: (res) => {
			setTestResult(res);
			setTestError(null);
			queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
		},
		onError: (err) => {
			setTestError(err.message);
			setTestResult(null);
		}
	});
	const sendReplyMutation = useMutation({
		mutationFn: () => {
			if (!selectedConversationId || !replyText.trim()) throw new Error("Missing text");
			return sendWhatsAppChatMessage({ data: {
				conversationId: selectedConversationId,
				text: replyText.trim(),
				clerkUserId: user?.id
			} });
		},
		onSuccess: () => {
			setReplyText("");
			refetchMessages();
			refetchConversations();
		}
	});
	const takeoverMutation = useMutation({
		mutationFn: (vars) => toggleWhatsAppHumanTakeover({ data: {
			conversationId: vars.convId,
			humanTakeover: vars.takeover,
			clerkUserId: user?.id
		} }),
		onSuccess: () => {
			refetchConversations();
		}
	});
	const autoReplyMutation = useMutation({
		mutationFn: (vars) => toggleWhatsAppAutoReply({ data: {
			connectionId: vars.connId,
			autoReplyEnabled: vars.enabled,
			clerkUserId: user?.id
		} }),
		onSuccess: () => {
			refetchConn();
		}
	});
	const getStatusBadge = (status) => {
		switch (status) {
			case "CONNECTED": return /* @__PURE__ */ jsx(Badge, {
				className: "bg-emerald-600 text-white font-medium",
				children: "Connected"
			});
			case "QR_READY": return /* @__PURE__ */ jsx(Badge, {
				className: "bg-blue-600 text-white font-medium",
				children: "Scan QR to Link"
			});
			case "STARTING": return /* @__PURE__ */ jsx(Badge, {
				className: "bg-amber-600 text-white font-medium",
				children: "Starting Session"
			});
			case "AUTHENTICATING": return /* @__PURE__ */ jsx(Badge, {
				className: "bg-indigo-600 text-white font-medium",
				children: "Authenticating"
			});
			case "DISCONNECTED": return /* @__PURE__ */ jsx(Badge, {
				variant: "outline",
				className: "text-slate-600 border-slate-300",
				children: "Disconnected"
			});
			case "FAILED": return /* @__PURE__ */ jsx(Badge, {
				className: "bg-rose-600 text-white font-medium",
				children: "Failed"
			});
			default: return /* @__PURE__ */ jsx(Badge, {
				variant: "outline",
				className: "text-slate-500 border-slate-200",
				children: "Not Connected"
			});
		}
	};
	const selectedConv = conversations.find((c) => c.id === selectedConversationId);
	const filteredConversations = conversations.filter((c) => {
		const q = searchQuery.toLowerCase();
		const name = (c.customer_name || "").toLowerCase();
		const phone = c.customer_phone.toLowerCase();
		const snippet = (c.last_message_text || "").toLowerCase();
		return name.includes(q) || phone.includes(q) || snippet.includes(q);
	});
	return /* @__PURE__ */ jsx(AppShell, {
		title: "WhatsApp Business Assistant",
		subtitle: "Connect your WhatsApp account via QR pairing, manage customer conversations, and deploy grounded AI auto-replies with human takeover.",
		children: /* @__PURE__ */ jsxs("div", {
			className: "space-y-6 max-w-7xl mx-auto pb-16",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-center justify-between border-b border-slate-200 pb-2",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ jsxs(Button, {
							variant: activeTab === "connection" ? "default" : "outline",
							size: "sm",
							onClick: () => setActiveTab("connection"),
							className: activeTab === "connection" ? "bg-[#087E8B] hover:bg-[#066772] text-white" : "bg-white text-slate-700 border-slate-200",
							children: [/* @__PURE__ */ jsx(QrCode, { className: "w-4 h-4 mr-2" }), "WhatsApp Connection & Settings"]
						}), /* @__PURE__ */ jsxs(Button, {
							variant: activeTab === "inbox" ? "default" : "outline",
							size: "sm",
							onClick: () => setActiveTab("inbox"),
							className: activeTab === "inbox" ? "bg-[#087E8B] hover:bg-[#066772] text-white" : "bg-white text-slate-700 border-slate-200",
							children: [
								/* @__PURE__ */ jsx(MessageSquare, { className: "w-4 h-4 mr-2" }),
								"Unified Inbox",
								conversations.length > 0 && /* @__PURE__ */ jsx("span", {
									className: "ml-2 px-1.5 py-0.5 text-xs bg-slate-100 text-slate-700 rounded-full font-semibold",
									children: conversations.length
								})
							]
						})]
					}), /* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ jsx("span", {
							className: "text-xs text-slate-500",
							children: "Gateway Status:"
						}), providerHealth?.healthy ? /* @__PURE__ */ jsxs(Badge, {
							variant: "outline",
							className: "border-emerald-300 text-emerald-700 bg-emerald-50 text-xs flex items-center gap-1",
							children: [/* @__PURE__ */ jsx(CheckCircle2, { className: "w-3 h-3 text-emerald-600" }), "OpenWA Gateway Online (Port 2785)"]
						}) : /* @__PURE__ */ jsxs(Badge, {
							variant: "outline",
							className: "border-amber-300 text-amber-700 bg-amber-50 text-xs flex items-center gap-1",
							children: [/* @__PURE__ */ jsx(AlertCircle, { className: "w-3 h-3 text-amber-600" }), "Gateway Offline / Standalone Mock"]
						})]
					})]
				}),
				activeTab === "connection" && /* @__PURE__ */ jsxs("div", {
					className: "space-y-6",
					children: [/* @__PURE__ */ jsxs(Card, {
						className: "bg-white border-slate-200 shadow-sm",
						children: [/* @__PURE__ */ jsx(CardHeader, {
							className: "pb-4",
							children: /* @__PURE__ */ jsxs("div", {
								className: "flex flex-col md:flex-row md:items-center justify-between gap-4",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "space-y-1",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "flex items-center gap-3",
										children: [/* @__PURE__ */ jsxs(CardTitle, {
											className: "text-xl font-bold text-slate-900 flex items-center gap-2",
											children: [/* @__PURE__ */ jsx(Smartphone, { className: "w-5 h-5 text-[#087E8B]" }), "WhatsApp Business Session"]
										}), getStatusBadge(connection?.status)]
									}), /* @__PURE__ */ jsx(CardDescription, {
										className: "text-slate-500 text-sm",
										children: "Linked via OpenWA upstream gateway (Pinned v0.25.0) using Baileys socket engine."
									})]
								}), /* @__PURE__ */ jsx("div", {
									className: "flex items-center gap-2",
									children: connection?.status === "CONNECTED" ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs(Button, {
										size: "sm",
										variant: "outline",
										onClick: () => {
											setTestResult(null);
											setTestError(null);
											setIsTestModalOpen(true);
										},
										className: "text-xs border-slate-300 text-slate-700 hover:bg-slate-50",
										children: [/* @__PURE__ */ jsx(Send, { className: "w-3.5 h-3.5 mr-1.5 text-blue-600" }), "Send Test Message"]
									}), /* @__PURE__ */ jsxs(Button, {
										size: "sm",
										variant: "outline",
										onClick: () => setIsDisconnectModalOpen(true),
										className: "text-xs border-rose-200 text-rose-600 hover:bg-rose-50",
										children: [/* @__PURE__ */ jsx(PowerOff, { className: "w-3.5 h-3.5 mr-1.5" }), "Disconnect"]
									})] }) : /* @__PURE__ */ jsx(Button, {
										size: "sm",
										onClick: () => initiateMutation.mutate(),
										disabled: initiateMutation.isPending,
										className: "bg-[#087E8B] hover:bg-[#066772] text-white font-medium text-xs shadow-sm",
										children: initiateMutation.isPending ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(RefreshCw, { className: "w-3.5 h-3.5 mr-1.5 animate-spin" }), "Initializing Session..."] }) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(QrCode, { className: "w-3.5 h-3.5 mr-1.5" }), connection?.status === "QR_READY" ? "Regenerate QR Code" : "Connect WhatsApp Account"] })
									})
								})]
							})
						}), /* @__PURE__ */ jsxs(CardContent, {
							className: "space-y-6 pt-2",
							children: [
								connection?.status === "QR_READY" && connection?.qr_code && /* @__PURE__ */ jsxs("div", {
									className: "p-6 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center gap-8",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center",
										children: [/* @__PURE__ */ jsx("img", {
											src: connection.qr_code,
											alt: "WhatsApp Authentication QR Code",
											className: "w-56 h-56 object-contain"
										}), /* @__PURE__ */ jsx("div", {
											className: "mt-2 flex items-center gap-2",
											children: /* @__PURE__ */ jsxs(Button, {
												variant: "ghost",
												size: "sm",
												onClick: () => refreshQrMutation.mutate(connection.id),
												disabled: refreshQrMutation.isPending,
												className: "text-xs text-slate-600 hover:text-slate-900",
												children: [/* @__PURE__ */ jsx(RefreshCw, { className: `w-3 h-3 mr-1 ${refreshQrMutation.isPending ? "animate-spin" : ""}` }), "Refresh QR"]
											})
										})]
									}), /* @__PURE__ */ jsxs("div", {
										className: "space-y-3 flex-1 text-sm text-slate-700",
										children: [
											/* @__PURE__ */ jsxs("h4", {
												className: "font-semibold text-slate-900 text-base flex items-center gap-2",
												children: [/* @__PURE__ */ jsx(Smartphone, { className: "w-4 h-4 text-[#087E8B]" }), "How to Link Your WhatsApp Number"]
											}),
											/* @__PURE__ */ jsxs("ol", {
												className: "list-decimal list-inside space-y-1.5 text-xs text-slate-600",
												children: [
													/* @__PURE__ */ jsx("li", { children: "Open WhatsApp on your phone or business handset." }),
													/* @__PURE__ */ jsxs("li", { children: [
														"Tap ",
														/* @__PURE__ */ jsx("strong", { children: "Settings" }),
														" or ",
														/* @__PURE__ */ jsx("strong", { children: "Menu (three dots)" }),
														" > ",
														/* @__PURE__ */ jsx("strong", { children: "Linked Devices" }),
														"."
													] }),
													/* @__PURE__ */ jsxs("li", { children: [
														"Tap ",
														/* @__PURE__ */ jsx("strong", { children: "Link a Device" }),
														" and point your camera at this QR code."
													] }),
													/* @__PURE__ */ jsxs("li", { children: [
														"Once scanned, this panel will automatically update to ",
														/* @__PURE__ */ jsx("strong", { children: "Connected" }),
														"."
													] })
												]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-xs",
												children: [/* @__PURE__ */ jsx("strong", { children: "Safety Notice:" }), " Use a dedicated test number for prototype testing. OpenWA is an unofficial WhatsApp gateway and does not replace official Meta Cloud API compliance for production insurance underwriting."]
											})
										]
									})]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "grid grid-cols-1 md:grid-cols-3 gap-4",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: "p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1",
											children: [/* @__PURE__ */ jsx("span", {
												className: "text-xs text-slate-500 font-medium",
												children: "Linked Phone Number"
											}), /* @__PURE__ */ jsx("p", {
												className: "font-mono text-sm font-semibold text-slate-900",
												children: connection?.phone_number || "Not linked yet"
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1",
											children: [/* @__PURE__ */ jsx("span", {
												className: "text-xs text-slate-500 font-medium",
												children: "Gateway Session ID"
											}), /* @__PURE__ */ jsx("p", {
												className: "font-mono text-xs text-slate-700 truncate",
												children: connection?.provider_session_id || "Unassigned"
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1",
											children: [/* @__PURE__ */ jsx("span", {
												className: "text-xs text-slate-500 font-medium",
												children: "Webhook Security"
											}), /* @__PURE__ */ jsxs("p", {
												className: "text-xs text-emerald-700 font-medium flex items-center gap-1",
												children: [/* @__PURE__ */ jsx(ShieldCheck, { className: "w-3.5 h-3.5 text-emerald-600" }), "HMAC-SHA256 Signed"]
											})]
										})
									]
								}),
								connection && /* @__PURE__ */ jsxs("div", {
									className: "p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "space-y-0.5",
										children: [/* @__PURE__ */ jsxs("div", {
											className: "text-sm font-semibold text-slate-900 flex items-center gap-2",
											children: [/* @__PURE__ */ jsx(Bot, { className: "w-4 h-4 text-[#087E8B]" }), "Autonomous AI Receptionist Auto-Reply"]
										}), /* @__PURE__ */ jsx("p", {
											className: "text-xs text-slate-500",
											children: "When enabled, inbound customer messages are automatically answered with answers grounded in your policy knowledge base."
										})]
									}), /* @__PURE__ */ jsx(Button, {
										variant: connection.auto_reply_enabled ? "default" : "outline",
										size: "sm",
										onClick: () => autoReplyMutation.mutate({
											connId: connection.id,
											enabled: !connection.auto_reply_enabled
										}),
										className: connection.auto_reply_enabled ? "bg-emerald-600 hover:bg-emerald-500 text-white text-xs" : "border-slate-300 text-slate-700 text-xs",
										children: connection.auto_reply_enabled ? "Auto-Reply: Enabled" : "Auto-Reply: Disabled"
									})]
								})
							]
						})]
					}), /* @__PURE__ */ jsxs(Card, {
						className: "bg-white border-slate-200 shadow-sm",
						children: [/* @__PURE__ */ jsx(CardHeader, {
							className: "pb-3",
							children: /* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ jsxs(CardTitle, {
									className: "text-base font-bold text-slate-900 flex items-center gap-2",
									children: [/* @__PURE__ */ jsx(PhoneCall, { className: "w-4 h-4 text-slate-600" }), "WhatsApp Voice Calling Capability"]
								}), /* @__PURE__ */ jsx(Badge, {
									variant: "outline",
									className: "border-slate-300 text-slate-600 bg-slate-50 text-xs",
									children: "Not configured / Requires supported calling integration"
								})]
							})
						}), /* @__PURE__ */ jsxs(CardContent, {
							className: "space-y-2 text-xs text-slate-600",
							children: [/* @__PURE__ */ jsxs("p", { children: [
								/* @__PURE__ */ jsx("strong", { children: "Verified Upstream Reality:" }),
								" Inspection of pinned upstream OpenWA (v0.25.0) confirms that linked WhatsApp sessions support call rejection (",
								/* @__PURE__ */ jsx("code", {
									className: "text-slate-800",
									children: "calls/:id/reject"
								}),
								") and call link generation (",
								/* @__PURE__ */ jsx("code", {
									className: "text-slate-800",
									children: "calls/link"
								}),
								"). OpenWA does not provide bidirectional live audio RTP streaming to converse with callers over WhatsApp voice."
							] }), /* @__PURE__ */ jsx("p", { children: "In compliance with InsurCall release requirements, voice calling remains safely disabled for linked WhatsApp accounts. Inbound calls receive an automated message directing policyholders to dial your direct PSTN hotline." })]
						})]
					})]
				}),
				activeTab === "inbox" && /* @__PURE__ */ jsxs("div", {
					className: "bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row h-[700px]",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "w-full md:w-80 border-r border-slate-200 flex flex-col h-full bg-slate-50/50",
						children: [/* @__PURE__ */ jsx("div", {
							className: "p-3 border-b border-slate-200 bg-white",
							children: /* @__PURE__ */ jsxs("div", {
								className: "relative",
								children: [/* @__PURE__ */ jsx(Search, { className: "w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" }), /* @__PURE__ */ jsx(Input, {
									placeholder: "Search conversations...",
									value: searchQuery,
									onChange: (e) => setSearchQuery(e.target.value),
									className: "pl-8 text-xs bg-slate-50 border-slate-200 text-slate-800 h-8"
								})]
							})
						}), /* @__PURE__ */ jsx("div", {
							className: "flex-1 overflow-y-auto divide-y divide-slate-100",
							children: filteredConversations.length === 0 ? /* @__PURE__ */ jsxs("div", {
								className: "p-8 text-center text-xs text-slate-400",
								children: [/* @__PURE__ */ jsx(MessageSquare, { className: "w-8 h-8 mx-auto mb-2 text-slate-300" }), "No WhatsApp conversations found."]
							}) : filteredConversations.map((conv) => {
								const isSelected = conv.id === selectedConversationId;
								return /* @__PURE__ */ jsx("button", {
									type: "button",
									onClick: () => setSelectedConversationId(conv.id),
									className: `w-full text-left p-3.5 transition-colors flex items-start justify-between gap-2 ${isSelected ? "bg-cyan-50/60 border-l-4 border-l-[#087E8B]" : "hover:bg-slate-100/60"}`,
									children: /* @__PURE__ */ jsxs("div", {
										className: "space-y-1 min-w-0 flex-1",
										children: [
											/* @__PURE__ */ jsxs("div", {
												className: "flex items-center justify-between",
												children: [/* @__PURE__ */ jsx("span", {
													className: "font-semibold text-xs text-slate-900 truncate",
													children: conv.customer_name || conv.customer_phone
												}), /* @__PURE__ */ jsx("span", {
													className: "text-[10px] text-slate-400",
													children: new Date(conv.last_message_at).toLocaleTimeString([], {
														hour: "2-digit",
														minute: "2-digit"
													})
												})]
											}),
											/* @__PURE__ */ jsx("p", {
												className: "text-xs text-slate-500 truncate",
												children: conv.last_message_text || "No message preview"
											}),
											/* @__PURE__ */ jsx("div", {
												className: "flex items-center gap-1.5 pt-0.5",
												children: conv.human_takeover ? /* @__PURE__ */ jsx(Badge, {
													variant: "outline",
													className: "text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 py-0 px-1",
													children: "Staff Active"
												}) : /* @__PURE__ */ jsx(Badge, {
													variant: "outline",
													className: "text-[10px] bg-cyan-50 text-cyan-800 border-cyan-200 py-0 px-1",
													children: "AI Auto-Reply"
												})
											})
										]
									})
								}, conv.id);
							})
						})]
					}), /* @__PURE__ */ jsx("div", {
						className: "flex-1 flex flex-col h-full bg-white",
						children: selectedConv ? /* @__PURE__ */ jsxs(Fragment, { children: [
							/* @__PURE__ */ jsxs("div", {
								className: "p-3.5 border-b border-slate-200 bg-white flex items-center justify-between",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-2.5",
									children: [/* @__PURE__ */ jsx("div", {
										className: "w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-semibold text-xs",
										children: /* @__PURE__ */ jsx(User, { className: "w-4 h-4" })
									}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h4", {
										className: "font-bold text-xs text-slate-900",
										children: selectedConv.customer_name || selectedConv.customer_phone
									}), /* @__PURE__ */ jsx("span", {
										className: "text-[11px] text-slate-500 font-mono",
										children: selectedConv.customer_phone
									})] })]
								}), /* @__PURE__ */ jsx("div", {
									className: "flex items-center gap-2",
									children: /* @__PURE__ */ jsxs(Button, {
										size: "sm",
										variant: selectedConv.human_takeover ? "default" : "outline",
										onClick: () => takeoverMutation.mutate({
											convId: selectedConv.id,
											takeover: !selectedConv.human_takeover
										}),
										className: selectedConv.human_takeover ? "bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8" : "border-slate-300 text-slate-700 text-xs h-8",
										children: [/* @__PURE__ */ jsx(UserCheck, { className: "w-3.5 h-3.5 mr-1.5" }), selectedConv.human_takeover ? "Human Takeover Active" : "Take Over from AI"]
									})
								})]
							}),
							/* @__PURE__ */ jsx("div", {
								className: "flex-1 p-4 overflow-y-auto space-y-3 bg-[#FAF9F6]",
								children: messages.length === 0 ? /* @__PURE__ */ jsx("div", {
									className: "p-12 text-center text-xs text-slate-400",
									children: "No messages in this conversation thread yet."
								}) : messages.map((msg) => {
									const isInbound = msg.direction === "inbound";
									const isAi = msg.sender_type === "ai_agent";
									return /* @__PURE__ */ jsx("div", {
										className: `flex flex-col ${isInbound ? "items-start" : "items-end"}`,
										children: /* @__PURE__ */ jsxs("div", {
											className: `max-w-[75%] p-3 rounded-2xl text-xs space-y-1.5 shadow-2xs ${isInbound ? "bg-white text-slate-800 border border-slate-200 rounded-bl-xs" : isAi ? "bg-[#E6F5F6] text-slate-900 border border-[#B2EBF2] rounded-br-xs" : "bg-[#EDFDF5] text-slate-900 border border-[#A7F3D0] rounded-br-xs"}`,
											children: [
												/* @__PURE__ */ jsxs("div", {
													className: "flex items-center justify-between gap-2 border-b border-black/5 pb-1 text-[10px] text-slate-500",
													children: [/* @__PURE__ */ jsx("span", {
														className: "font-semibold flex items-center gap-1",
														children: isInbound ? /* @__PURE__ */ jsx(Fragment, { children: "Customer" }) : isAi ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Bot, { className: "w-3 h-3 text-[#087E8B]" }), "AI Receptionist"] }) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(User, { className: "w-3 h-3 text-emerald-600" }), "Human Staff"] })
													}), /* @__PURE__ */ jsx("span", { children: new Date(msg.created_at).toLocaleTimeString([], {
														hour: "2-digit",
														minute: "2-digit"
													}) })]
												}),
												/* @__PURE__ */ jsx("p", {
													className: "whitespace-pre-wrap leading-relaxed",
													children: msg.body
												}),
												isAi && msg.grounded_facts && msg.grounded_facts.length > 0 && /* @__PURE__ */ jsxs("div", {
													className: "mt-1 pt-1.5 border-t border-cyan-200/50 text-[10px] text-cyan-900 space-y-0.5",
													children: [/* @__PURE__ */ jsx("span", {
														className: "font-semibold",
														children: "Grounded in Knowledge Store:"
													}), /* @__PURE__ */ jsx("ul", {
														className: "list-disc list-inside space-y-0.5 text-cyan-800",
														children: msg.grounded_facts.map((cit, idx) => /* @__PURE__ */ jsx("li", {
															className: "truncate",
															children: cit.title
														}, idx))
													})]
												})
											]
										})
									}, msg.id);
								})
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "p-3 border-t border-slate-200 bg-white flex items-center gap-2",
								children: [/* @__PURE__ */ jsx(Input, {
									placeholder: selectedConv.human_takeover ? "Type a message as staff..." : "Type reply (will automatically enable staff takeover)...",
									value: replyText,
									onChange: (e) => setReplyText(e.target.value),
									onKeyDown: (e) => {
										if (e.key === "Enter" && !e.shiftKey) {
											e.preventDefault();
											sendReplyMutation.mutate();
										}
									},
									className: "text-xs bg-slate-50 border-slate-200 text-slate-800"
								}), /* @__PURE__ */ jsxs(Button, {
									size: "sm",
									onClick: () => sendReplyMutation.mutate(),
									disabled: !replyText.trim() || sendReplyMutation.isPending,
									className: "bg-[#087E8B] hover:bg-[#066772] text-white font-medium text-xs h-9 shrink-0",
									children: [/* @__PURE__ */ jsx(Send, { className: "w-3.5 h-3.5 mr-1.5" }), "Send"]
								})]
							})
						] }) : /* @__PURE__ */ jsxs("div", {
							className: "flex-1 flex flex-col items-center justify-center p-8 text-slate-400 text-xs",
							children: [/* @__PURE__ */ jsx(MessageSquare, { className: "w-10 h-10 mb-2 text-slate-300" }), "Select a conversation from the left to view messages."]
						})
					})]
				}),
				/* @__PURE__ */ jsx(Dialog, {
					open: isTestModalOpen,
					onOpenChange: setIsTestModalOpen,
					children: /* @__PURE__ */ jsxs(DialogContent, {
						className: "max-w-md bg-white border-slate-200 text-slate-900",
						children: [
							/* @__PURE__ */ jsxs(DialogHeader, { children: [/* @__PURE__ */ jsxs(DialogTitle, {
								className: "text-base font-bold flex items-center gap-2 text-slate-900",
								children: [/* @__PURE__ */ jsx(Send, { className: "w-4 h-4 text-[#087E8B]" }), "Send WhatsApp Test Message"]
							}), /* @__PURE__ */ jsx(DialogDescription, {
								className: "text-slate-500 text-xs",
								children: "Transmit a test message through your active OpenWA session to verify outbound messaging."
							})] }),
							/* @__PURE__ */ jsxs("div", {
								className: "space-y-4 my-2 text-xs",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "space-y-1.5",
										children: [/* @__PURE__ */ jsx(Label, {
											className: "text-xs text-slate-700 font-medium",
											children: "Recipient Phone Number (with Country Code)"
										}), /* @__PURE__ */ jsx(Input, {
											value: testPhone,
											onChange: (e) => setTestPhone(e.target.value),
											placeholder: "+919876543210",
											className: "bg-slate-50 border-slate-200 text-slate-900 font-mono text-xs"
										})]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "space-y-1.5",
										children: [/* @__PURE__ */ jsx(Label, {
											className: "text-xs text-slate-700 font-medium",
											children: "Test Message Body"
										}), /* @__PURE__ */ jsx(Input, {
											value: testMessage,
											onChange: (e) => setTestMessage(e.target.value),
											className: "bg-slate-50 border-slate-200 text-slate-900 text-xs"
										})]
									}),
									testResult && /* @__PURE__ */ jsxs("div", {
										className: "p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 space-y-1",
										children: [/* @__PURE__ */ jsxs("div", {
											className: "font-semibold flex items-center gap-1.5 text-xs",
											children: [/* @__PURE__ */ jsx(CheckCircle2, { className: "w-3.5 h-3.5 text-emerald-600" }), "Message Sent Successfully"]
										}), /* @__PURE__ */ jsxs("p", {
											className: "font-mono text-[10px] text-emerald-700",
											children: ["ID: ", testResult.messageId]
										})]
									}),
									testError && /* @__PURE__ */ jsxs("div", {
										className: "p-3 bg-rose-50 rounded-lg border border-rose-200 text-rose-800 space-y-1",
										children: [/* @__PURE__ */ jsxs("div", {
											className: "font-semibold flex items-center gap-1.5 text-xs",
											children: [/* @__PURE__ */ jsx(AlertCircle, { className: "w-3.5 h-3.5 text-rose-600" }), "Delivery Failed"]
										}), /* @__PURE__ */ jsx("p", {
											className: "text-[10px] text-rose-700",
											children: testError
										})]
									})
								]
							}),
							/* @__PURE__ */ jsxs(DialogFooter, { children: [/* @__PURE__ */ jsx(Button, {
								variant: "outline",
								size: "sm",
								onClick: () => setIsTestModalOpen(false),
								children: "Close"
							}), /* @__PURE__ */ jsx(Button, {
								size: "sm",
								className: "bg-[#087E8B] hover:bg-[#066772] text-white font-medium text-xs",
								disabled: !testPhone.trim() || !testMessage.trim() || sendTestMutation.isPending,
								onClick: () => sendTestMutation.mutate(),
								children: sendTestMutation.isPending ? "Sending..." : "Transmit Test"
							})] })
						]
					})
				}),
				/* @__PURE__ */ jsx(Dialog, {
					open: isDisconnectModalOpen,
					onOpenChange: setIsDisconnectModalOpen,
					children: /* @__PURE__ */ jsxs(DialogContent, {
						className: "max-w-md bg-white border-slate-200 text-slate-900",
						children: [/* @__PURE__ */ jsxs(DialogHeader, { children: [/* @__PURE__ */ jsxs(DialogTitle, {
							className: "text-base font-bold flex items-center gap-2 text-rose-600",
							children: [/* @__PURE__ */ jsx(PowerOff, { className: "w-4 h-4 text-rose-600" }), "Disconnect WhatsApp Account"]
						}), /* @__PURE__ */ jsx(DialogDescription, {
							className: "text-slate-500 text-xs",
							children: "Are you sure you want to stop this WhatsApp session? Inbound customer messages will no longer be received by InsurCall until reconnected."
						})] }), /* @__PURE__ */ jsxs(DialogFooter, {
							className: "mt-2",
							children: [/* @__PURE__ */ jsx(Button, {
								variant: "outline",
								size: "sm",
								onClick: () => setIsDisconnectModalOpen(false),
								children: "Cancel"
							}), /* @__PURE__ */ jsx(Button, {
								size: "sm",
								className: "bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs",
								disabled: disconnectMutation.isPending,
								onClick: () => {
									if (connection) disconnectMutation.mutate(connection.id);
								},
								children: disconnectMutation.isPending ? "Disconnecting..." : "Confirm Disconnect"
							})]
						})]
					})
				})
			]
		})
	});
}
//#endregion
export { WhatsAppManagementPage as component };
