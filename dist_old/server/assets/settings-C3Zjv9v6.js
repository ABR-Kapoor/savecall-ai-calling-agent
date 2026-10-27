import { c as getTenantSettings, d as syncClerkUser, i as getCallerProfile, m as updateTenantSettings, p as updateSubscriptionPlan } from "./insurance.functions-BLePgOSY.js";
import { n as Button, t as Badge } from "./badge-CjGhifle.js";
import { t as AppShell } from "./app-shell-DAPYFpRb.js";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-3hIMutoJ.js";
import { t as Input } from "./input-U8cX-69P.js";
import { t as Label } from "./label-CJoWdPh2.js";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./tabs-BsbmV-zC.js";
import { t as Textarea } from "./textarea-B4p8JS7Y.js";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import { toast } from "sonner";
import { ArrowRight, BookOpen, Bot, Building, Check, CheckCircle2, MessageSquare, PhoneForwarded, RefreshCw, Save, Sparkles, UserCheck, Volume2, Zap } from "lucide-react";
//#region src/routes/_authenticated/settings.tsx?tsr-split=component
var DEFAULT_KNOWLEDGE_BASE = `COMPANY: SafeLife Insurance Co. Ltd.
HOTLINE: +91 800 555 0199 (24/7 Toll-Free)
CLAIMS EMAIL: claims@safelife.com

POLICY COVERAGES:
1. Comprehensive Health Shield:
   - Up to ₹15,00,000 sum insured.
   - Covers inpatient hospitalization, day care procedures, and pre/post-hospitalization (60/90 days).
   - Cashless claim approved within 2 hours at over 8,500+ network hospitals.

2. Motor Secure Drive:
   - Zero-depreciation bumper-to-bumper car & two-wheeler protection.
   - Free 24/7 roadside towing, flat tire assistance, and key replacement.
   - Spot claim settlement up to ₹50,000 via mobile inspection video.

3. Term Life Protection:
   - ₹50,00,000 to ₹2 Crore guaranteed financial payout for designated nominee.
   - Terminal illness acceleration benefit included at zero extra cost.

CASHLESS CLAIM PROCEDURES:
- Present SafeLife health card or Customer ID at the hospital TPA insurance desk.
- Pre-authorization request processed in under 120 minutes.
- Original discharge summary and pharmacy bills required for reimbursement within 7 days.

SECURITY & VERIFICATION RULES:
- Read-only actions (policy status, balance due date, claim payout status) are verified directly via caller's authenticated profile.
- High-risk operations (changing policy nominee, changing registered phone/email, policy surrender) strictly require a 6-digit email OTP.`;
function SettingsPage() {
	const { user } = useUser();
	const queryClient = useQueryClient();
	const { data: tenant, isLoading } = useQuery({
		queryKey: ["tenant-settings", user?.id],
		queryFn: () => getTenantSettings({ data: {
			clerkUserId: user?.id,
			userEmail: user?.primaryEmailAddress?.emailAddress,
			userName: user?.fullName || void 0
		} })
	});
	const { data: callerProfile } = useQuery({
		queryKey: [
			"caller-profile",
			user?.id,
			tenant?.id
		],
		queryFn: () => {
			const payload = {};
			if (user?.id) payload.clerkUserId = user.id;
			if (user?.primaryEmailAddress?.emailAddress) payload.email = user.primaryEmailAddress.emailAddress;
			if (tenant?.id) payload.tenantId = tenant.id;
			return getCallerProfile({ data: payload });
		},
		enabled: !!user
	});
	const [name, setName] = useState("");
	const [supportEmail, setSupportEmail] = useState("");
	const [supportPhone, setSupportPhone] = useState("");
	const [agentName, setAgentName] = useState("InsurCall AI Assistant");
	const [tone, setTone] = useState("Professional & Empathetic");
	const [language, setLanguage] = useState("Bilingual / Hinglish");
	const [voiceId, setVoiceId] = useState("en-IN-NeerjaNeural");
	const [greeting, setGreeting] = useState("Hello {{customer_name}}! Welcome to {{company_name}} assistance. How may I help you with your insurance policies or claims today?");
	const [systemPrompt, setSystemPrompt] = useState("You are InsurCall AI, a trusted, empathetic voice assistant for insurance policyholders. Always verify details carefully, provide concise answers, and enforce OTP for sensitive changes.");
	const [knowledgeBase, setKnowledgeBase] = useState(DEFAULT_KNOWLEDGE_BASE);
	const [isTraining, setIsTraining] = useState(false);
	const [lastTrained, setLastTrained] = useState(null);
	useEffect(() => {
		if (tenant) {
			setName(tenant.name || "SafeLife Insurance Co. Ltd.");
			const bCfg = tenant.branding_config || {};
			setSupportEmail(bCfg.support_email || "claims@safelife.com");
			setSupportPhone(bCfg.support_phone || "+91 800 555 0199");
			const aCfg = bCfg.agent_config || {};
			if (aCfg.agent_name) setAgentName(aCfg.agent_name);
			if (aCfg.tone) setTone(aCfg.tone);
			if (aCfg.language) setLanguage(aCfg.language);
			if (aCfg.voice_id) setVoiceId(aCfg.voice_id);
			if (aCfg.greeting) setGreeting(aCfg.greeting);
			if (aCfg.system_prompt) setSystemPrompt(aCfg.system_prompt);
			if (aCfg.knowledge_base) setKnowledgeBase(aCfg.knowledge_base);
			if (aCfg.last_trained_at) setLastTrained(aCfg.last_trained_at);
		}
	}, [tenant]);
	const updateMutation = useMutation({
		mutationFn: async (customAgentConfig) => {
			const existingBrd = tenant?.branding_config || {};
			const updatedAgentConfig = customAgentConfig || {
				agent_name: agentName,
				tone,
				language,
				voice_id: voiceId,
				greeting,
				system_prompt: systemPrompt,
				knowledge_base: knowledgeBase,
				last_trained_at: (/* @__PURE__ */ new Date()).toISOString()
			};
			return updateTenantSettings({ data: {
				tenantId: tenant?.id,
				clerkUserId: user?.id,
				name,
				slug: tenant?.slug || "safelife",
				branding_config: {
					...existingBrd,
					support_email: supportEmail,
					support_phone: supportPhone,
					agent_config: updatedAgentConfig
				}
			} });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tenant-settings"] });
			queryClient.invalidateQueries({ queryKey: ["my-tenant"] });
		},
		onError: (err) => {
			toast.error(err.message || "Failed to save configuration");
		}
	});
	const handleQuickTrain = async () => {
		setIsTraining(true);
		const toastId = toast.loading("Training voice agent on company knowledge base...");
		try {
			const now = (/* @__PURE__ */ new Date()).toISOString();
			const updatedAgentConfig = {
				agent_name: agentName,
				tone,
				language,
				voice_id: voiceId,
				greeting,
				system_prompt: systemPrompt,
				knowledge_base: knowledgeBase,
				last_trained_at: now
			};
			await updateMutation.mutateAsync(updatedAgentConfig);
			setLastTrained(now);
			setTimeout(() => {
				setIsTraining(false);
				toast.success("Voice model trained and live on all phone calls!", { id: toastId });
			}, 1e3);
		} catch (e) {
			setIsTraining(false);
			toast.error(e.message || "Failed to train agent", { id: toastId });
		}
	};
	const syncMutation = useMutation({
		mutationFn: () => syncClerkUser({ data: {
			tenantId: tenant?.id,
			clerkUserId: user?.id
		} }),
		onSuccess: (res) => {
			queryClient.invalidateQueries({ queryKey: ["caller-profile"] });
			queryClient.invalidateQueries({ queryKey: ["policies-list"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
			toast.success(`Successfully fetched & synced ${res.syncedCount} Clerk user(s) with database`);
		},
		onError: (err) => {
			toast.error(err.message || "Failed to sync Clerk users");
		}
	});
	const planMutation = useMutation({
		mutationFn: (plan) => updateSubscriptionPlan({ data: { plan } }),
		onSuccess: (_, plan) => {
			queryClient.invalidateQueries({ queryKey: ["tenant-settings"] });
			toast.success(`Switched to ${plan.toUpperCase()} Tier (Development Mode Activated)`);
		},
		onError: (err) => {
			toast.error(err.message || "Failed to update subscription tier");
		}
	});
	const appendKnowledgeTemplate = (text) => {
		setKnowledgeBase((prev) => `${prev.trim()}\n\n${text}`);
		toast.info("Added snippet to Company Knowledge Base");
	};
	return /* @__PURE__ */ jsx(AppShell, {
		title: "Settings & Agent Studio",
		subtitle: "ElevenLabs-style Voice Agent builder, company knowledge training, and Clerk identity mapping",
		children: /* @__PURE__ */ jsx("div", {
			className: "max-w-5xl space-y-6",
			children: /* @__PURE__ */ jsxs(Tabs, {
				defaultValue: "agent-builder",
				className: "w-full",
				children: [
					/* @__PURE__ */ jsxs(TabsList, {
						className: "grid w-full grid-cols-2 md:grid-cols-5 bg-muted/50 p-1 rounded-xl",
						children: [
							/* @__PURE__ */ jsxs(TabsTrigger, {
								value: "agent-builder",
								className: "flex items-center gap-2 text-xs font-semibold",
								children: [/* @__PURE__ */ jsx(Bot, { className: "h-4 w-4 text-primary" }), "Assistant Studio"]
							}),
							/* @__PURE__ */ jsxs(TabsTrigger, {
								value: "telephony",
								className: "flex items-center gap-2 text-xs font-semibold",
								children: [/* @__PURE__ */ jsx(PhoneForwarded, { className: "h-4 w-4 text-blue-400" }), "Phone & Telephony"]
							}),
							/* @__PURE__ */ jsxs(TabsTrigger, {
								value: "organization",
								className: "flex items-center gap-2 text-xs font-semibold",
								children: [/* @__PURE__ */ jsx(Building, { className: "h-4 w-4 text-amber-500" }), "Company Profile"]
							}),
							/* @__PURE__ */ jsxs(TabsTrigger, {
								value: "clerk-sync",
								className: "flex items-center gap-2 text-xs font-semibold",
								children: [/* @__PURE__ */ jsx(UserCheck, { className: "h-4 w-4 text-emerald-600" }), "Caller Identity"]
							}),
							/* @__PURE__ */ jsxs(TabsTrigger, {
								value: "billing-plans",
								className: "flex items-center gap-2 text-xs font-semibold",
								children: [/* @__PURE__ */ jsx(Sparkles, { className: "h-4 w-4 text-primary" }), "Plans & Allowance"]
							})
						]
					}),
					/* @__PURE__ */ jsxs(TabsContent, {
						value: "agent-builder",
						className: "space-y-6 pt-4",
						children: [
							/* @__PURE__ */ jsx(Card, {
								className: "border-border/80 bg-card/90 shadow-md",
								children: /* @__PURE__ */ jsxs(CardContent, {
									className: "p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "flex items-center gap-3",
										children: [/* @__PURE__ */ jsx("div", {
											className: "size-12 shrink-0 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center p-1.5 shadow-inner",
											children: /* @__PURE__ */ jsx("img", {
												src: "/06_app_icon_rounded_safe_area_transparent.png",
												alt: "Agent Avatar",
												className: "size-full object-contain"
											})
										}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ jsx("h2", {
												className: "text-base font-bold text-foreground font-display",
												children: agentName
											}), /* @__PURE__ */ jsx(Badge, {
												className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]",
												children: "Active & Ready"
											})]
										}), /* @__PURE__ */ jsx("p", {
											className: "text-xs text-muted-foreground mt-0.5",
											children: "Intelligent AI Voice Receptionist • Low-Latency Neural Speech • Retrieval-Grounded Grounding"
										})] })]
									}), /* @__PURE__ */ jsxs("div", {
										className: "flex items-center gap-3 w-full sm:w-auto justify-end",
										children: [lastTrained && /* @__PURE__ */ jsxs("span", {
											className: "text-[11px] text-muted-foreground font-mono hidden md:inline",
											children: ["Synced: ", new Date(lastTrained).toLocaleTimeString([], {
												hour: "2-digit",
												minute: "2-digit"
											})]
										}), /* @__PURE__ */ jsxs(Button, {
											onClick: handleQuickTrain,
											disabled: isTraining || isLoading,
											className: "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-sm gap-2 h-10 px-4 rounded-xl transition-all active:scale-95",
											children: [/* @__PURE__ */ jsx(Zap, { className: `h-4 w-4 ${isTraining ? "animate-spin" : ""}` }), isTraining ? "Syncing Receptionist..." : "Save & Sync Receptionist"]
										})]
									})]
								})
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "grid gap-6 md:grid-cols-2",
								children: [/* @__PURE__ */ jsxs(Card, {
									className: "border-border/60 bg-card/60",
									children: [/* @__PURE__ */ jsxs(CardHeader, {
										className: "pb-3",
										children: [/* @__PURE__ */ jsxs("div", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ jsx(Volume2, { className: "h-4 w-4 text-primary" }), /* @__PURE__ */ jsx(CardTitle, {
												className: "text-sm font-semibold",
												children: "Voice & Persona"
											})]
										}), /* @__PURE__ */ jsx(CardDescription, {
											className: "text-xs",
											children: "Configure the speech timbre, tone, and pacing of your voice agent."
										})]
									}), /* @__PURE__ */ jsxs(CardContent, {
										className: "space-y-4",
										children: [
											/* @__PURE__ */ jsxs("div", {
												className: "space-y-1.5",
												children: [/* @__PURE__ */ jsx(Label, {
													className: "text-xs",
													children: "Agent Name"
												}), /* @__PURE__ */ jsx(Input, {
													value: agentName,
													onChange: (e) => setAgentName(e.target.value),
													placeholder: "e.g. InsurCall AI Receptionist"
												})]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "space-y-1.5",
												children: [/* @__PURE__ */ jsx(Label, {
													className: "text-xs",
													children: "Tone & Demeanor"
												}), /* @__PURE__ */ jsx("div", {
													className: "grid grid-cols-2 gap-2 text-xs",
													children: [
														"Professional & Empathetic",
														"Concise & Direct",
														"Friendly Advisor",
														"Strict Compliance"
													].map((t) => /* @__PURE__ */ jsx("button", {
														type: "button",
														onClick: () => setTone(t),
														className: `p-2 rounded-xl text-left border transition-all text-xs font-medium ${tone === t ? "bg-primary/20 border-primary text-primary-foreground" : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"}`,
														children: t
													}, t))
												})]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "grid grid-cols-2 gap-3",
												children: [/* @__PURE__ */ jsxs("div", {
													className: "space-y-1.5",
													children: [/* @__PURE__ */ jsx(Label, {
														className: "text-xs",
														children: "Voice Selection"
													}), /* @__PURE__ */ jsxs("select", {
														value: voiceId,
														onChange: (e) => setVoiceId(e.target.value),
														className: "w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring",
														children: [
															/* @__PURE__ */ jsx("option", {
																value: "en-IN-NeerjaNeural",
																children: "Neerja (Natural Expressive - India)"
															}),
															/* @__PURE__ */ jsx("option", {
																value: "en-IN-PrabhatNeural",
																children: "Prabhat (Professional Clear - India)"
															}),
															/* @__PURE__ */ jsx("option", {
																value: "hi-IN-SwaraNeural",
																children: "Swara (Bilingual Hindi/English - India)"
															}),
															/* @__PURE__ */ jsx("option", {
																value: "hi-IN-MadhurNeural",
																children: "Madhur (Bilingual Hindi/English - India)"
															}),
															/* @__PURE__ */ jsx("option", {
																value: "en-US-JennyNeural",
																children: "Jenny (Conversational - US)"
															}),
															/* @__PURE__ */ jsx("option", {
																value: "en-US-GuyNeural",
																children: "Guy (Executive - US)"
															})
														]
													})]
												}), /* @__PURE__ */ jsxs("div", {
													className: "space-y-1.5",
													children: [/* @__PURE__ */ jsx(Label, {
														className: "text-xs",
														children: "Language Mode"
													}), /* @__PURE__ */ jsxs("select", {
														value: language,
														onChange: (e) => setLanguage(e.target.value),
														className: "w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring",
														children: [
															/* @__PURE__ */ jsx("option", {
																value: "Bilingual / Hinglish",
																children: "Bilingual (Hinglish & English)"
															}),
															/* @__PURE__ */ jsx("option", {
																value: "English (India)",
																children: "English (Indian Accent)"
															}),
															/* @__PURE__ */ jsx("option", {
																value: "Hindi (हिन्दी)",
																children: "Hindi (हिन्दी)"
															}),
															/* @__PURE__ */ jsx("option", {
																value: "English (US / Global)",
																children: "English (Global)"
															})
														]
													})]
												})]
											})
										]
									})]
								}), /* @__PURE__ */ jsxs(Card, {
									className: "border-border/60 bg-card/60 flex flex-col justify-between",
									children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs(CardHeader, {
										className: "pb-3",
										children: [/* @__PURE__ */ jsxs("div", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ jsx(MessageSquare, { className: "h-4 w-4 text-emerald-400" }), /* @__PURE__ */ jsx(CardTitle, {
												className: "text-sm font-semibold",
												children: "First Spoken Greeting"
											})]
										}), /* @__PURE__ */ jsx(CardDescription, {
											className: "text-xs",
											children: "What the voice agent speaks instantly as soon as the phone call connects."
										})]
									}), /* @__PURE__ */ jsxs(CardContent, {
										className: "space-y-3",
										children: [/* @__PURE__ */ jsx("div", {
											className: "space-y-1.5",
											children: /* @__PURE__ */ jsx(Textarea, {
												value: greeting,
												onChange: (e) => setGreeting(e.target.value),
												rows: 3,
												className: "text-xs leading-relaxed",
												placeholder: "Hello {{customer_name}}! Welcome to {{company_name}}..."
											})
										}), /* @__PURE__ */ jsxs("div", {
											className: "space-y-1",
											children: [/* @__PURE__ */ jsx("span", {
												className: "text-[10px] text-muted-foreground",
												children: "Dynamic variables:"
											}), /* @__PURE__ */ jsxs("div", {
												className: "flex flex-wrap gap-1.5",
												children: [/* @__PURE__ */ jsxs(Badge, {
													variant: "outline",
													onClick: () => setGreeting((prev) => `${prev} {{customer_name}}`),
													className: "cursor-pointer text-[10px] hover:border-primary text-foreground",
													children: ["+ ", "{{customer_name}}"]
												}), /* @__PURE__ */ jsxs(Badge, {
													variant: "outline",
													onClick: () => setGreeting((prev) => `${prev} {{company_name}}`),
													className: "cursor-pointer text-[10px] hover:border-primary text-foreground",
													children: ["+ ", "{{company_name}}"]
												})]
											})]
										})]
									})] }), /* @__PURE__ */ jsx("div", {
										className: "p-4 pt-0",
										children: /* @__PURE__ */ jsxs("div", {
											className: "rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-[11px] text-emerald-400 flex items-center gap-2",
											children: [/* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4 text-emerald-400 shrink-0" }), /* @__PURE__ */ jsx("span", { children: "Greeting is synthesized immediately when inbound telephony or test call connects." })]
										})
									})]
								})]
							}),
							/* @__PURE__ */ jsxs(Card, {
								className: "border-border/60 bg-card/60",
								children: [/* @__PURE__ */ jsx(CardHeader, {
									className: "pb-3",
									children: /* @__PURE__ */ jsxs("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ jsxs("div", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ jsx(BookOpen, { className: "h-5 w-5 text-primary" }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(CardTitle, {
												className: "text-base font-semibold",
												children: "Company Knowledge & Guidelines (Retrieval-Grounded Store)"
											}), /* @__PURE__ */ jsx(CardDescription, {
												className: "text-xs",
												children: "Add your insurance company's exact rules, coverage policies, hospital networks, and FAQs. The AI receptionist retrieves and cites these verified guidelines dynamically during customer calls."
											})] })]
										}), /* @__PURE__ */ jsx("div", {
											className: "flex items-center gap-2",
											children: /* @__PURE__ */ jsxs(Button, {
												onClick: handleQuickTrain,
												disabled: isTraining,
												size: "sm",
												className: "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5",
												children: [/* @__PURE__ */ jsx(Zap, { className: "h-3.5 w-3.5" }), "Save & Sync"]
											})
										})]
									})
								}), /* @__PURE__ */ jsxs(CardContent, {
									className: "space-y-4",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: "flex flex-wrap items-center gap-1.5",
											children: [
												/* @__PURE__ */ jsx("span", {
													className: "text-[11px] font-medium text-muted-foreground mr-1",
													children: "Insert Templates:"
												}),
												/* @__PURE__ */ jsx("button", {
													type: "button",
													onClick: () => appendKnowledgeTemplate(`NETWORK HOSPITALS:\n- City Care Hospital (Cashless ID: HOS-001) - 24/7 Emergency\n- Apollo MedCenter (Cashless ID: HOS-002) - Multi-specialty\n- Fortis Healthcare (Cashless ID: HOS-003) - Cardiology & Oncology`),
													className: "text-[11px] bg-muted/60 hover:bg-muted border border-border text-foreground px-2.5 py-1 rounded-full transition-all",
													children: "+ Hospital Network"
												}),
												/* @__PURE__ */ jsx("button", {
													type: "button",
													onClick: () => appendKnowledgeTemplate(`CLAIM SETTLEMENT SLA:\n- Cashless authorization approved within 2 hours of hospital request.\n- Reimbursement claims settled in bank account within 5 business days.\n- Required: Discharge summary, final hospital bill, medical prescriptions.`),
													className: "text-[11px] bg-muted/60 hover:bg-muted border border-border text-foreground px-2.5 py-1 rounded-full transition-all",
													children: "+ Claim Settlement SLA"
												}),
												/* @__PURE__ */ jsx("button", {
													type: "button",
													onClick: () => appendKnowledgeTemplate(`POLICY EXCLUSIONS:\n- Pre-existing diseases covered after 24-month waiting period.\n- Cosmetic surgeries and self-inflicted injuries are not covered under health plans.\n- Drink-and-drive vehicle accidents are strictly excluded from motor claims.`),
													className: "text-[11px] bg-muted/60 hover:bg-muted border border-border text-foreground px-2.5 py-1 rounded-full transition-all",
													children: "+ Policy Exclusions FAQ"
												})
											]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "space-y-1.5",
											children: [/* @__PURE__ */ jsx(Textarea, {
												value: knowledgeBase,
												onChange: (e) => setKnowledgeBase(e.target.value),
												rows: 12,
												className: "font-mono text-xs leading-relaxed bg-background/80",
												placeholder: "Enter your company's product guidelines, FAQs, hospital tie-ups..."
											}), /* @__PURE__ */ jsxs("div", {
												className: "flex justify-between items-center text-[11px] text-muted-foreground pt-1",
												children: [/* @__PURE__ */ jsx("span", { children: "Retrieved dynamically at inference time with exact source grounding. No unauthorized hallucinated coverage." }), /* @__PURE__ */ jsxs("span", {
													className: "font-mono",
													children: [knowledgeBase.length, " characters"]
												})]
											})]
										}),
										/* @__PURE__ */ jsx("div", {
											className: "pt-2 flex justify-end",
											children: /* @__PURE__ */ jsxs(Button, {
												onClick: handleQuickTrain,
												disabled: isTraining || isLoading,
												className: "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-2",
												children: [/* @__PURE__ */ jsx(Save, { className: "h-4 w-4" }), "Save & Sync Receptionist Knowledge"]
											})
										})
									]
								})]
							})
						]
					}),
					/* @__PURE__ */ jsx(TabsContent, {
						value: "organization",
						className: "space-y-6 pt-4",
						children: /* @__PURE__ */ jsxs(Card, {
							className: "border-border/60 bg-card/60",
							children: [/* @__PURE__ */ jsxs(CardHeader, { children: [/* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ jsx(Building, { className: "h-5 w-5 text-cyan-400" }), /* @__PURE__ */ jsx(CardTitle, {
										className: "text-base font-semibold",
										children: "Insurance Carrier Profile"
									})]
								}), /* @__PURE__ */ jsx(Badge, {
									className: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
									children: "Active Tenant"
								})]
							}), /* @__PURE__ */ jsx(CardDescription, {
								className: "text-xs",
								children: "Primary organization identifier and contact channels for automated AI communications."
							})] }), /* @__PURE__ */ jsxs(CardContent, {
								className: "space-y-4",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "grid gap-4 sm:grid-cols-2",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: "space-y-1.5",
											children: [/* @__PURE__ */ jsx(Label, {
												className: "text-xs",
												children: "Carrier Name"
											}), /* @__PURE__ */ jsx(Input, {
												value: name,
												onChange: (e) => setName(e.target.value),
												placeholder: "e.g. SafeLife Insurance Co. Ltd.",
												disabled: isLoading
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "space-y-1.5",
											children: [/* @__PURE__ */ jsx(Label, {
												className: "text-xs",
												children: "Tenant Identifier / Slug"
											}), /* @__PURE__ */ jsx(Input, {
												value: tenant?.slug || "safelife",
												disabled: true,
												className: "font-mono bg-muted/30"
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "space-y-1.5",
											children: [/* @__PURE__ */ jsx(Label, {
												className: "text-xs",
												children: "Support & Claims Hotline"
											}), /* @__PURE__ */ jsx(Input, {
												value: supportPhone,
												onChange: (e) => setSupportPhone(e.target.value),
												placeholder: "+91 800 555 0199",
												disabled: isLoading
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "space-y-1.5",
											children: [/* @__PURE__ */ jsx(Label, {
												className: "text-xs",
												children: "Claims Email"
											}), /* @__PURE__ */ jsx(Input, {
												value: supportEmail,
												onChange: (e) => setSupportEmail(e.target.value),
												placeholder: "claims@safelife.com",
												disabled: isLoading
											})]
										})
									]
								}), /* @__PURE__ */ jsx("div", {
									className: "pt-2 flex justify-end",
									children: /* @__PURE__ */ jsx(Button, {
										onClick: () => {
											updateMutation.mutate(void 0);
											toast.success("Carrier details saved successfully");
										},
										disabled: updateMutation.isPending || isLoading,
										className: "bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-medium",
										children: updateMutation.isPending ? "Saving..." : "Save Carrier Details"
									})
								})]
							})]
						})
					}),
					/* @__PURE__ */ jsx(TabsContent, {
						value: "clerk-sync",
						className: "space-y-6 pt-4",
						children: /* @__PURE__ */ jsxs(Card, {
							className: "border-border/60 bg-card/60",
							children: [/* @__PURE__ */ jsxs(CardHeader, { children: [/* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ jsx(UserCheck, { className: "h-5 w-5 text-emerald-400" }), /* @__PURE__ */ jsx(CardTitle, {
										className: "text-base font-semibold",
										children: "Connected Clerk Identity"
									})]
								}), /* @__PURE__ */ jsxs(Badge, {
									variant: "outline",
									className: "text-emerald-400 border-emerald-500/30 gap-1 text-[11px]",
									children: [/* @__PURE__ */ jsx(CheckCircle2, { className: "h-3 w-3" }), " Synchronized with DB"]
								})]
							}), /* @__PURE__ */ jsx(CardDescription, {
								className: "text-xs",
								children: "Authenticated policyholder details retrieved live from Clerk and mapped to InsForge PostgreSQL."
							})] }), /* @__PURE__ */ jsxs(CardContent, {
								className: "space-y-4",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "grid gap-4 sm:grid-cols-2 text-xs",
										children: [
											/* @__PURE__ */ jsxs("div", {
												className: "rounded-lg border border-border/50 bg-background/50 p-3 space-y-1",
												children: [/* @__PURE__ */ jsx("span", {
													className: "text-muted-foreground font-medium",
													children: "Clerk User ID"
												}), /* @__PURE__ */ jsx("p", {
													className: "font-mono text-foreground font-semibold",
													children: user?.id || "Signed In User"
												})]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "rounded-lg border border-border/50 bg-background/50 p-3 space-y-1",
												children: [/* @__PURE__ */ jsx("span", {
													className: "text-muted-foreground font-medium",
													children: "Primary Email"
												}), /* @__PURE__ */ jsx("p", {
													className: "text-foreground font-semibold",
													children: user?.primaryEmailAddress?.emailAddress || "user@example.com"
												})]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "rounded-lg border border-border/50 bg-background/50 p-3 space-y-1",
												children: [/* @__PURE__ */ jsx("span", {
													className: "text-muted-foreground font-medium",
													children: "Policyholder Name"
												}), /* @__PURE__ */ jsx("p", {
													className: "text-cyan-400 font-semibold",
													children: user?.fullName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || callerProfile?.customer?.name || "Active Policyholder"
												})]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "rounded-lg border border-border/50 bg-background/50 p-3 space-y-1",
												children: [/* @__PURE__ */ jsx("span", {
													className: "text-muted-foreground font-medium",
													children: "Active Policy Mapping"
												}), /* @__PURE__ */ jsxs("p", {
													className: "text-emerald-400 font-semibold font-mono",
													children: [
														callerProfile?.customer?.customer_number || "CUST-VERIFIED",
														": ",
														" ",
														callerProfile?.policiesCount ?? 3,
														" Active Policies"
													]
												})]
											})
										]
									}),
									callerProfile?.policies && callerProfile.policies.length > 0 && /* @__PURE__ */ jsxs("div", {
										className: "rounded-xl border border-border/60 bg-background/40 p-3 space-y-2",
										children: [/* @__PURE__ */ jsx("span", {
											className: "text-[11px] font-semibold text-slate-300",
											children: "Policies Linked to this Account:"
										}), /* @__PURE__ */ jsx("div", {
											className: "grid gap-2 sm:grid-cols-3",
											children: callerProfile.policies.map((p) => /* @__PURE__ */ jsxs("div", {
												className: "rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-[11px]",
												children: [
													/* @__PURE__ */ jsx("div", {
														className: "font-mono text-cyan-400 font-semibold",
														children: p.policy_number
													}),
													/* @__PURE__ */ jsxs("div", {
														className: "text-slate-400 capitalize",
														children: [p.policy_type, " Policy"]
													}),
													/* @__PURE__ */ jsx(Badge, {
														variant: "outline",
														className: "text-[9px] border-emerald-500/30 text-emerald-400 mt-1",
														children: p.status
													})
												]
											}, p.id))
										})]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
										children: [/* @__PURE__ */ jsx("span", {
											className: "text-xs text-muted-foreground",
											children: "Sync all Clerk users and policyholder associations with InsForge PostgreSQL."
										}), /* @__PURE__ */ jsxs(Button, {
											variant: "outline",
											size: "sm",
											onClick: () => syncMutation.mutate(),
											disabled: syncMutation.isPending,
											className: "gap-2 text-xs",
											children: [/* @__PURE__ */ jsx(RefreshCw, { className: `h-3.5 w-3.5 ${syncMutation.isPending ? "animate-spin" : ""}` }), syncMutation.isPending ? "Syncing..." : "Re-sync from Clerk"]
										})]
									})
								]
							})]
						})
					}),
					/* @__PURE__ */ jsxs(TabsContent, {
						value: "billing-plans",
						className: "space-y-6 pt-4",
						children: [/* @__PURE__ */ jsxs(Card, {
							className: "border border-border bg-card shadow-xs",
							children: [/* @__PURE__ */ jsxs(CardHeader, {
								className: "pb-3",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "space-y-1",
										children: [/* @__PURE__ */ jsxs("div", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ jsx(Badge, {
												className: "bg-primary/10 text-primary border-primary/20 text-xs",
												children: "Free Starter Tier"
											}), /* @__PURE__ */ jsx("span", {
												className: "text-xs text-muted-foreground",
												children: "Active Workspace"
											})]
										}), /* @__PURE__ */ jsx(CardTitle, {
											className: "font-display text-lg font-bold text-foreground",
											children: "Voice Allowance & Testing Limits"
										})]
									}), /* @__PURE__ */ jsx("span", {
										className: "text-xl font-bold font-mono text-primary",
										children: "12 / 15 mins"
									})]
								}), /* @__PURE__ */ jsx(CardDescription, {
									className: "text-xs text-muted-foreground mt-1",
									children: "InsurCall includes 15 free voice testing minutes in your browser. Real SIP trunking and dedicated business phone lines require an active concurrency plan."
								})]
							}), /* @__PURE__ */ jsxs(CardContent, {
								className: "space-y-3",
								children: [/* @__PURE__ */ jsx("div", {
									className: "h-2 w-full overflow-hidden rounded-full bg-border",
									children: /* @__PURE__ */ jsx("div", {
										className: "h-full bg-primary rounded-full transition-all",
										style: { width: "80%" }
									})
								}), /* @__PURE__ */ jsxs("div", {
									className: "flex items-center justify-between text-[11px] text-muted-foreground",
									children: [/* @__PURE__ */ jsx("span", { children: "80% utilized (3 minutes remaining)" }), /* @__PURE__ */ jsx("span", { children: "Resets on the 1st of every month" })]
								})]
							})]
						}), (() => {
							const currentPlan = (tenant?.branding_config)?.plan || "starter";
							return /* @__PURE__ */ jsxs("div", {
								className: "grid grid-cols-1 md:grid-cols-3 gap-6 pt-2",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: `rounded-2xl border-2 p-5 flex flex-col justify-between shadow-xs transition-all ${currentPlan === "starter" ? "border-primary bg-primary/5" : "border-border bg-card"}`,
										children: [/* @__PURE__ */ jsxs("div", {
											className: "space-y-3",
											children: [
												/* @__PURE__ */ jsxs("div", {
													className: "flex items-center justify-between",
													children: [/* @__PURE__ */ jsx("h3", {
														className: "font-display text-base font-bold text-foreground",
														children: "Free Starter"
													}), currentPlan === "starter" && /* @__PURE__ */ jsx(Badge, {
														variant: "outline",
														className: "bg-primary text-primary-foreground text-[10px]",
														children: "Current Plan"
													})]
												}),
												/* @__PURE__ */ jsxs("div", {
													className: "flex items-baseline gap-1",
													children: [/* @__PURE__ */ jsx("span", {
														className: "font-display text-2xl font-bold text-foreground",
														children: "₹0"
													}), /* @__PURE__ */ jsx("span", {
														className: "text-xs text-muted-foreground",
														children: "/ month"
													})]
												}),
												/* @__PURE__ */ jsx("p", {
													className: "text-xs text-muted-foreground",
													children: "Perfect for evaluating real-time conversational WebRTC audio and testing knowledge base Q&A."
												}),
												/* @__PURE__ */ jsxs("ul", {
													className: "space-y-2 pt-2 text-xs text-foreground",
													children: [
														/* @__PURE__ */ jsxs("li", {
															className: "flex items-center gap-2",
															children: [/* @__PURE__ */ jsx(Check, { className: "size-4 text-primary shrink-0" }), " 15 live audio minutes / month"]
														}),
														/* @__PURE__ */ jsxs("li", {
															className: "flex items-center gap-2",
															children: [/* @__PURE__ */ jsx(Check, { className: "size-4 text-primary shrink-0" }), " 1 AI Voice Assistant Persona"]
														}),
														/* @__PURE__ */ jsxs("li", {
															className: "flex items-center gap-2",
															children: [/* @__PURE__ */ jsx(Check, { className: "size-4 text-primary shrink-0" }), " Ground-truth knowledge Q&A"]
														}),
														/* @__PURE__ */ jsxs("li", {
															className: "flex items-center gap-2",
															children: [/* @__PURE__ */ jsx(Check, { className: "size-4 text-primary shrink-0" }), " Human approval queue"]
														})
													]
												})
											]
										}), /* @__PURE__ */ jsx("div", {
											className: "pt-6",
											children: /* @__PURE__ */ jsx(Button, {
												variant: currentPlan === "starter" ? "outline" : "default",
												size: "sm",
												className: "w-full text-xs font-medium",
												disabled: currentPlan === "starter" || planMutation.isPending,
												onClick: () => planMutation.mutate("starter"),
												children: currentPlan === "starter" ? "Currently Active" : "Switch to Free Starter (Dev)"
											})
										})]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: `rounded-2xl border-2 p-5 flex flex-col justify-between shadow-xs transition-all ${currentPlan === "growth" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`,
										children: [/* @__PURE__ */ jsxs("div", {
											className: "space-y-3",
											children: [
												/* @__PURE__ */ jsxs("div", {
													className: "flex items-center justify-between",
													children: [/* @__PURE__ */ jsx("h3", {
														className: "font-display text-base font-bold text-foreground",
														children: "Growth"
													}), currentPlan === "growth" ? /* @__PURE__ */ jsx(Badge, {
														variant: "outline",
														className: "bg-primary text-primary-foreground text-[10px]",
														children: "Current Plan"
													}) : /* @__PURE__ */ jsx(Badge, {
														variant: "outline",
														className: "text-[10px] text-primary border-primary/20",
														children: "Popular"
													})]
												}),
												/* @__PURE__ */ jsxs("div", {
													className: "flex items-baseline gap-1",
													children: [/* @__PURE__ */ jsx("span", {
														className: "font-display text-2xl font-bold text-foreground",
														children: "₹2,499"
													}), /* @__PURE__ */ jsx("span", {
														className: "text-xs text-muted-foreground",
														children: "/ month ($29)"
													})]
												}),
												/* @__PURE__ */ jsx("p", {
													className: "text-xs text-muted-foreground",
													children: "For local agencies, clinics, and businesses that need real telephone number integration."
												}),
												/* @__PURE__ */ jsxs("ul", {
													className: "space-y-2 pt-2 text-xs text-foreground",
													children: [
														/* @__PURE__ */ jsxs("li", {
															className: "flex items-center gap-2",
															children: [/* @__PURE__ */ jsx(Check, { className: "size-4 text-emerald-600 shrink-0" }), " 300 minutes included"]
														}),
														/* @__PURE__ */ jsxs("li", {
															className: "flex items-center gap-2",
															children: [/* @__PURE__ */ jsx(Check, { className: "size-4 text-emerald-600 shrink-0" }), " 1 Dedicated phone number (SIP)"]
														}),
														/* @__PURE__ */ jsxs("li", {
															className: "flex items-center gap-2",
															children: [/* @__PURE__ */ jsx(Check, { className: "size-4 text-emerald-600 shrink-0" }), " Multi-lingual Hindi + English"]
														}),
														/* @__PURE__ */ jsxs("li", {
															className: "flex items-center gap-2",
															children: [/* @__PURE__ */ jsx(Check, { className: "size-4 text-emerald-600 shrink-0" }), " Custom PDF & document uploads"]
														})
													]
												})
											]
										}), /* @__PURE__ */ jsx("div", {
											className: "pt-6",
											children: /* @__PURE__ */ jsx(Button, {
												variant: currentPlan === "growth" ? "outline" : "default",
												size: "sm",
												className: "w-full text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90",
												disabled: currentPlan === "growth" || planMutation.isPending,
												onClick: () => planMutation.mutate("growth"),
												children: currentPlan === "growth" ? "Currently Active" : "Activate Growth (Dev)"
											})
										})]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: `rounded-2xl border-2 p-5 flex flex-col justify-between shadow-xs transition-all ${currentPlan === "business" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`,
										children: [/* @__PURE__ */ jsxs("div", {
											className: "space-y-3",
											children: [
												/* @__PURE__ */ jsxs("div", {
													className: "flex items-center justify-between",
													children: [/* @__PURE__ */ jsx("h3", {
														className: "font-display text-base font-bold text-foreground",
														children: "Business"
													}), currentPlan === "business" ? /* @__PURE__ */ jsx(Badge, {
														variant: "outline",
														className: "bg-primary text-primary-foreground text-[10px]",
														children: "Current Plan"
													}) : /* @__PURE__ */ jsx(Badge, {
														variant: "outline",
														className: "text-[10px] text-foreground border-border",
														children: "Scale"
													})]
												}),
												/* @__PURE__ */ jsxs("div", {
													className: "flex items-baseline gap-1",
													children: [/* @__PURE__ */ jsx("span", {
														className: "font-display text-2xl font-bold text-foreground",
														children: "₹7,999"
													}), /* @__PURE__ */ jsx("span", {
														className: "text-xs text-muted-foreground",
														children: "/ month ($99)"
													})]
												}),
												/* @__PURE__ */ jsx("p", {
													className: "text-xs text-muted-foreground",
													children: "For high-volume contact centers requiring concurrency, CRM sync, and custom tool actions."
												}),
												/* @__PURE__ */ jsxs("ul", {
													className: "space-y-2 pt-2 text-xs text-foreground",
													children: [
														/* @__PURE__ */ jsxs("li", {
															className: "flex items-center gap-2",
															children: [/* @__PURE__ */ jsx(Check, { className: "size-4 text-emerald-600 shrink-0" }), " 1,500 minutes included"]
														}),
														/* @__PURE__ */ jsxs("li", {
															className: "flex items-center gap-2",
															children: [/* @__PURE__ */ jsx(Check, { className: "size-4 text-emerald-600 shrink-0" }), " Unlimited concurrent voice lines"]
														}),
														/* @__PURE__ */ jsxs("li", {
															className: "flex items-center gap-2",
															children: [/* @__PURE__ */ jsx(Check, { className: "size-4 text-emerald-600 shrink-0" }), " Custom CRM webhooks & tools"]
														})
													]
												})
											]
										}), /* @__PURE__ */ jsx("div", {
											className: "pt-6",
											children: /* @__PURE__ */ jsx(Button, {
												variant: currentPlan === "business" ? "outline" : "default",
												size: "sm",
												className: "w-full text-xs font-medium",
												disabled: currentPlan === "business" || planMutation.isPending,
												onClick: () => planMutation.mutate("business"),
												children: currentPlan === "business" ? "Currently Active" : "Activate Business (Dev)"
											})
										})]
									})
								]
							});
						})()]
					}),
					/* @__PURE__ */ jsx(TabsContent, {
						value: "telephony",
						className: "space-y-6 pt-4",
						children: /* @__PURE__ */ jsxs(Card, {
							className: "border-blue-900/40 bg-zinc-950/70 shadow-lg",
							children: [/* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "space-y-1",
									children: [/* @__PURE__ */ jsxs(CardTitle, {
										className: "text-base font-bold text-white flex items-center gap-2",
										children: [/* @__PURE__ */ jsx(PhoneForwarded, { className: "w-5 h-5 text-blue-400" }), "Inbound & Outbound Calling Configuration"]
									}), /* @__PURE__ */ jsx(CardDescription, {
										className: "text-xs text-zinc-400",
										children: "Manage cellular carrier forwarding, enterprise SIP trunks, routing DIDs, and live agent test calls."
									})]
								}), /* @__PURE__ */ jsx(Link, {
									to: "/phone",
									children: /* @__PURE__ */ jsxs(Button, {
										size: "sm",
										className: "bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs",
										children: ["Open Phone Hub", /* @__PURE__ */ jsx(ArrowRight, { className: "w-3.5 h-3.5 ml-1.5" })]
									})
								})]
							}) }), /* @__PURE__ */ jsxs(CardContent, {
								className: "space-y-4 text-xs text-zinc-300",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "grid grid-cols-1 md:grid-cols-3 gap-4",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: "p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2",
											children: [/* @__PURE__ */ jsx("div", {
												className: "font-semibold text-white",
												children: "1. Mobile Call Forwarding"
											}), /* @__PURE__ */ jsx("p", {
												className: "text-zinc-400 text-[11px]",
												children: "Keep your existing mobile phone and SIM. Uses carrier MMI codes (*67*, *401*) on Airtel, Jio, Vi, and BSNL."
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2",
											children: [/* @__PURE__ */ jsx("div", {
												className: "font-semibold text-white",
												children: "2. Enterprise SIP Trunking"
											}), /* @__PURE__ */ jsx("p", {
												className: "text-zinc-400 text-[11px]",
												children: "Connect Tata Tele Smartflo, Exotel, Twilio, or FreePBX via secure SIP URI and authenticated credentials."
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2",
											children: [/* @__PURE__ */ jsx("div", {
												className: "font-semibold text-white",
												children: "3. Dedicated Virtual DIDs"
											}), /* @__PURE__ */ jsx("p", {
												className: "text-zinc-400 text-[11px]",
												children: "Provision landline numbers (+91-11, +91-22, +91-80) or 1800 Toll Free with business GSTIN KYC under DoT regulations."
											})]
										})
									]
								}), /* @__PURE__ */ jsxs("div", {
									className: "p-3.5 rounded-lg bg-blue-950/20 border border-blue-900/30 text-blue-300 flex items-center justify-between",
									children: [/* @__PURE__ */ jsx("span", { children: "To view configured lines, generate carrier MMI codes, or simulate test calls, use the dedicated workspace." }), /* @__PURE__ */ jsx(Link, {
										to: "/phone",
										children: /* @__PURE__ */ jsx(Button, {
											variant: "outline",
											size: "sm",
											className: "border-blue-700/50 text-blue-200 hover:bg-blue-950/40 text-xs shrink-0",
											children: "Manage Phone Lines"
										})
									})]
								})]
							})]
						})
					})
				]
			})
		})
	});
}
//#endregion
export { SettingsPage as component };
