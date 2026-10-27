import { n as Button, r as cn, t as Badge } from "./badge-CjGhifle.js";
import { t as AppShell } from "./app-shell-DAPYFpRb.js";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-3hIMutoJ.js";
import { t as Input } from "./input-U8cX-69P.js";
import { t as Label } from "./label-CJoWdPh2.js";
import { t as Textarea } from "./textarea-B4p8JS7Y.js";
import { n as useBusiness, t as insforge } from "./client-BntXr5t7.js";
import * as React from "react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, BookOpen, Bot, Check, ChevronDown, ChevronUp, Mic, Radio, Sliders } from "lucide-react";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as SwitchPrimitives from "@radix-ui/react-switch";
//#region src/components/ui/select.tsx
var Select = SelectPrimitive.Root;
var SelectValue = SelectPrimitive.Value;
var SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(SelectPrimitive.Trigger, {
	ref,
	className: cn("flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1", className),
	...props,
	children: [children, /* @__PURE__ */ jsx(SelectPrimitive.Icon, {
		asChild: true,
		children: /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4 opacity-50" })
	})]
}));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;
var SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.ScrollUpButton, {
	ref,
	className: cn("flex cursor-default items-center justify-center py-1", className),
	...props,
	children: /* @__PURE__ */ jsx(ChevronUp, { className: "h-4 w-4" })
}));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;
var SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.ScrollDownButton, {
	ref,
	className: cn("flex cursor-default items-center justify-center py-1", className),
	...props,
	children: /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4" })
}));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;
var SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.Portal, { children: /* @__PURE__ */ jsxs(SelectPrimitive.Content, {
	ref,
	className: cn("relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-select-content-transform-origin)", position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1", className),
	position,
	...props,
	children: [
		/* @__PURE__ */ jsx(SelectScrollUpButton, {}),
		/* @__PURE__ */ jsx(SelectPrimitive.Viewport, {
			className: cn("p-1", position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"),
			children
		}),
		/* @__PURE__ */ jsx(SelectScrollDownButton, {})
	]
}) }));
SelectContent.displayName = SelectPrimitive.Content.displayName;
var SelectLabel = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.Label, {
	ref,
	className: cn("px-2 py-1.5 text-sm font-semibold", className),
	...props
}));
SelectLabel.displayName = SelectPrimitive.Label.displayName;
var SelectItem = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(SelectPrimitive.Item, {
	ref,
	className: cn("relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
	...props,
	children: [/* @__PURE__ */ jsx("span", {
		className: "absolute right-2 flex h-3.5 w-3.5 items-center justify-center",
		children: /* @__PURE__ */ jsx(SelectPrimitive.ItemIndicator, { children: /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" }) })
	}), /* @__PURE__ */ jsx(SelectPrimitive.ItemText, { children })]
}));
SelectItem.displayName = SelectPrimitive.Item.displayName;
var SelectSeparator = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.Separator, {
	ref,
	className: cn("-mx-1 my-1 h-px bg-muted", className),
	...props
}));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;
//#endregion
//#region src/components/ui/switch.tsx
var Switch = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SwitchPrimitives.Root, {
	className: cn("peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input", className),
	...props,
	ref,
	children: /* @__PURE__ */ jsx(SwitchPrimitives.Thumb, { className: cn("pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0") })
}));
Switch.displayName = SwitchPrimitives.Root.displayName;
//#endregion
//#region src/routes/_authenticated/agent.tsx?tsr-split=component
var LANGUAGE_SETS = [
	{
		value: "hi,en,hinglish",
		label: "Hindi + English + Hinglish (Bilingual)"
	},
	{
		value: "en",
		label: "English (Global / Standard)"
	},
	{
		value: "hi",
		label: "Hindi (शुद्ध हिन्दी)"
	}
];
var VOICES = [
	{
		value: "hi-IN-SwaraNeural",
		label: "Swara (Natural Indian English & Hindi)"
	},
	{
		value: "hi-IN-MadhurNeural",
		label: "Madhur (Deep Male, Clear Hindi & English)"
	},
	{
		value: "en-US-JennyNeural",
		label: "Jenny (Warm & Friendly US English)"
	},
	{
		value: "en-US-GuyNeural",
		label: "Guy (Professional Executive US English)"
	}
];
var DEPLOYMENT_MODES = [
	{
		mode: "test",
		title: "Test Mode",
		desc: "Internal staff testing only. No live external customer calls or actions.",
		badge: "Testing",
		badgeColor: "border-slate-500/40 text-slate-400 bg-slate-500/10"
	},
	{
		mode: "assist",
		title: "Assist Mode",
		desc: "AI handles routine inquiries and FAQs; transfers complex calls to staff.",
		badge: "Recommended",
		badgeColor: "border-cyan-500/40 text-cyan-400 bg-cyan-500/10"
	},
	{
		mode: "controlled",
		title: "Controlled Mode",
		desc: "Executes only explicitly permitted actions with mandatory confirmation.",
		badge: "Regulated",
		badgeColor: "border-amber-500/40 text-amber-400 bg-amber-500/10"
	},
	{
		mode: "autopilot",
		title: "Autopilot",
		desc: "Fully autonomous customer handling within configured policy boundaries.",
		badge: "Production",
		badgeColor: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
	}
];
var PERMISSIONS = [
	{
		key: "can_answer_questions",
		title: "Search Knowledge & Answer FAQs",
		desc: "Answers caller questions using verified company documents, pricing, and policies."
	},
	{
		key: "can_capture_leads",
		title: "Capture Inquiries & Leads",
		desc: "Records caller contact details, requirements, and urgency for follow-up."
	},
	{
		key: "can_book",
		title: "Appointment & Service Booking",
		desc: "Checks calendar availability and books confirmed slots directly."
	},
	{
		key: "can_transfer",
		title: "Human Staff Warm Transfer",
		desc: "Offers instant escalation or scheduled callback when caller requests human staff."
	}
];
function AgentPage() {
	const { data: business } = useBusiness();
	const businessId = business?.id;
	const queryClient = useQueryClient();
	const agent = useQuery({
		queryKey: ["agent", businessId],
		enabled: !!businessId,
		queryFn: async () => {
			const { data, error } = await insforge.database.from("ai_agents").select("*").or(`tenant_id.eq.${businessId},business_id.eq.${businessId}`).maybeSingle();
			if (error) throw error;
			return data;
		}
	});
	const [form, setForm] = useState({
		name: "Riya",
		role: "AI Receptionist & Support Specialist",
		greeting: "Hello! Thank you for calling. I am Riya, your AI voice assistant. How may I help you today?",
		tone: "professional",
		voice: "hi-IN-SwaraNeural",
		languages: "hi,en,hinglish",
		deployment_mode: "assist",
		can_book: true,
		can_capture_leads: true,
		can_transfer: true,
		can_answer_questions: true
	});
	useEffect(() => {
		if (!agent.data) return;
		setForm({
			name: agent.data.name || "Riya",
			role: agent.data.role || "AI Receptionist & Support Specialist",
			greeting: agent.data.greeting || "Hello! Thank you for calling. How may I help you today?",
			tone: agent.data.tone || "professional",
			voice: agent.data.voice || "hi-IN-SwaraNeural",
			languages: Array.isArray(agent.data.languages) ? agent.data.languages.join(",") : agent.data.languages ?? "hi,en,hinglish",
			deployment_mode: agent.data.deployment_mode || "assist",
			can_book: agent.data.can_book ?? true,
			can_capture_leads: agent.data.can_capture_leads ?? true,
			can_transfer: agent.data.can_transfer ?? true,
			can_answer_questions: agent.data.can_answer_questions ?? true
		});
	}, [agent.data]);
	const save = useMutation({
		mutationFn: async () => {
			const payload = {
				tenant_id: businessId,
				business_id: businessId,
				name: form.name.trim(),
				role: form.role.trim(),
				greeting: form.greeting.trim(),
				tone: form.tone,
				voice: form.voice,
				languages: form.languages.split(",").map((l) => l.trim()).filter(Boolean),
				deployment_mode: form.deployment_mode,
				can_book: form.can_book,
				can_capture_leads: form.can_capture_leads,
				can_transfer: form.can_transfer,
				can_answer_questions: form.can_answer_questions,
				updated_at: (/* @__PURE__ */ new Date()).toISOString()
			};
			const { error } = agent.data?.id ? await insforge.database.from("ai_agents").update(payload).eq("id", agent.data.id) : await insforge.database.from("ai_agents").insert([payload]);
			if (error) throw error;
		},
		onSuccess: () => {
			toast.success("AI Employee configuration saved successfully.");
			queryClient.invalidateQueries({ queryKey: ["agent", businessId] });
		},
		onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save employee configuration")
	});
	return /* @__PURE__ */ jsx(AppShell, {
		title: "AI Employee Studio",
		subtitle: "Configure identity, conversational skills, voice parameters, and operational deployment mode.",
		children: /* @__PURE__ */ jsxs("div", {
			className: "space-y-6 max-w-4xl",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-950 shadow-sm",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "space-y-1",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2",
							children: [
								/* @__PURE__ */ jsx(Bot, { className: "h-4 w-4 text-cyan-400" }),
								/* @__PURE__ */ jsxs("span", {
									className: "font-semibold text-sm text-white",
									children: ["Active Employee: ", form.name]
								}),
								/* @__PURE__ */ jsx(Badge, {
									variant: "outline",
									className: "text-[10px] border-cyan-500/40 text-cyan-400 uppercase",
									children: form.deployment_mode
								})
							]
						}), /* @__PURE__ */ jsxs("p", {
							className: "text-xs text-muted-foreground",
							children: [
								form.role,
								" • Speaks ",
								form.languages.includes("hi") ? "Hindi, English & Hinglish" : "English"
							]
						})]
					}), /* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ jsx(Link, {
							to: "/train",
							children: /* @__PURE__ */ jsxs(Button, {
								variant: "outline",
								size: "sm",
								className: "text-xs gap-1.5 border-border/80",
								children: [/* @__PURE__ */ jsx(BookOpen, { className: "h-3.5 w-3.5" }), " Teach Knowledge"]
							})
						}), /* @__PURE__ */ jsx(Link, {
							to: "/voice",
							children: /* @__PURE__ */ jsxs(Button, {
								size: "sm",
								className: "bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold text-xs gap-1.5 shadow",
								children: [/* @__PURE__ */ jsx(Mic, { className: "h-3.5 w-3.5" }), " Test Voice Call"]
							})
						})]
					})]
				}),
				/* @__PURE__ */ jsxs(Card, {
					className: "border-border/60 bg-card/60",
					children: [/* @__PURE__ */ jsxs(CardHeader, {
						className: "pb-3",
						children: [/* @__PURE__ */ jsxs(CardTitle, {
							className: "text-base font-semibold flex items-center gap-2",
							children: [/* @__PURE__ */ jsx(Bot, { className: "h-4 w-4 text-cyan-400" }), " Employee Identity & Voice"]
						}), /* @__PURE__ */ jsx(CardDescription, {
							className: "text-xs",
							children: "Define the employee's caller persona, pronunciation voice, and opening greeting."
						})]
					}), /* @__PURE__ */ jsxs(CardContent, {
						className: "space-y-4",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "grid gap-4 sm:grid-cols-2",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ jsx(Label, {
										htmlFor: "agent-name",
										className: "text-xs",
										children: "Employee Name"
									}), /* @__PURE__ */ jsx(Input, {
										id: "agent-name",
										value: form.name,
										onChange: (e) => setForm({
											...form,
											name: e.target.value
										}),
										placeholder: "e.g. Riya, Aarav, Sarah",
										className: "text-xs bg-background"
									})]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ jsx(Label, {
										htmlFor: "agent-role",
										className: "text-xs",
										children: "Job Role & Title"
									}), /* @__PURE__ */ jsx(Input, {
										id: "agent-role",
										value: form.role,
										onChange: (e) => setForm({
											...form,
											role: e.target.value
										}),
										placeholder: "e.g. Customer Support Specialist, Appointment Coordinator",
										className: "text-xs bg-background"
									})]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ jsx(Label, {
										className: "text-xs",
										children: "Voice Selection"
									}), /* @__PURE__ */ jsxs(Select, {
										value: form.voice,
										onValueChange: (voice) => setForm({
											...form,
											voice
										}),
										children: [/* @__PURE__ */ jsx(SelectTrigger, {
											className: "text-xs bg-background",
											children: /* @__PURE__ */ jsx(SelectValue, {})
										}), /* @__PURE__ */ jsx(SelectContent, { children: VOICES.map((v) => /* @__PURE__ */ jsx(SelectItem, {
											value: v.value,
											className: "text-xs",
											children: v.label
										}, v.value)) })]
									})]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ jsx(Label, {
										className: "text-xs",
										children: "Languages"
									}), /* @__PURE__ */ jsxs(Select, {
										value: form.languages,
										onValueChange: (languages) => setForm({
											...form,
											languages
										}),
										children: [/* @__PURE__ */ jsx(SelectTrigger, {
											className: "text-xs bg-background",
											children: /* @__PURE__ */ jsx(SelectValue, {})
										}), /* @__PURE__ */ jsx(SelectContent, { children: LANGUAGE_SETS.map((set) => /* @__PURE__ */ jsx(SelectItem, {
											value: set.value,
											className: "text-xs",
											children: set.label
										}, set.value)) })]
									})]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ jsx(Label, {
										className: "text-xs",
										children: "Tone & Demeanor"
									}), /* @__PURE__ */ jsxs(Select, {
										value: form.tone,
										onValueChange: (tone) => setForm({
											...form,
											tone
										}),
										children: [/* @__PURE__ */ jsx(SelectTrigger, {
											className: "text-xs bg-background",
											children: /* @__PURE__ */ jsx(SelectValue, {})
										}), /* @__PURE__ */ jsxs(SelectContent, { children: [
											/* @__PURE__ */ jsx(SelectItem, {
												value: "professional",
												className: "text-xs",
												children: "Professional & Courteous"
											}),
											/* @__PURE__ */ jsx(SelectItem, {
												value: "warm",
												className: "text-xs",
												children: "Warm & Empathetic"
											}),
											/* @__PURE__ */ jsx(SelectItem, {
												value: "friendly",
												className: "text-xs",
												children: "Friendly & Engaging"
											}),
											/* @__PURE__ */ jsx(SelectItem, {
												value: "brisk",
												className: "text-xs",
												children: "Concise & Direct"
											})
										] })]
									})]
								})
							]
						}), /* @__PURE__ */ jsxs("div", {
							className: "space-y-1.5 pt-2",
							children: [/* @__PURE__ */ jsx(Label, {
								htmlFor: "greeting",
								className: "text-xs",
								children: "Opening Line (Spoken Immediately on Call Connect)"
							}), /* @__PURE__ */ jsx(Textarea, {
								id: "greeting",
								rows: 3,
								value: form.greeting,
								onChange: (e) => setForm({
									...form,
									greeting: e.target.value
								}),
								placeholder: "Hello! Thank you for calling. How may I assist you today?",
								className: "text-xs leading-relaxed bg-background"
							})]
						})]
					})]
				}),
				/* @__PURE__ */ jsxs(Card, {
					className: "border-border/60 bg-card/60",
					children: [/* @__PURE__ */ jsxs(CardHeader, {
						className: "pb-3",
						children: [/* @__PURE__ */ jsxs(CardTitle, {
							className: "text-base font-semibold flex items-center gap-2",
							children: [/* @__PURE__ */ jsx(Sliders, { className: "h-4 w-4 text-emerald-400" }), " Permitted Skills & Actions"]
						}), /* @__PURE__ */ jsx(CardDescription, {
							className: "text-xs",
							children: "Actions the employee is explicitly authorized to execute on behalf of the company."
						})]
					}), /* @__PURE__ */ jsx(CardContent, {
						className: "space-y-3",
						children: PERMISSIONS.map(({ key, title, desc }) => /* @__PURE__ */ jsxs("div", {
							className: "flex items-center justify-between gap-4 p-3.5 rounded-xl border border-border/50 bg-background/50",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "space-y-0.5",
								children: [/* @__PURE__ */ jsx("div", {
									className: "text-xs font-semibold text-foreground",
									children: title
								}), /* @__PURE__ */ jsx("div", {
									className: "text-[11px] text-muted-foreground",
									children: desc
								})]
							}), /* @__PURE__ */ jsx(Switch, {
								checked: form[key],
								onCheckedChange: (checked) => setForm({
									...form,
									[key]: checked
								})
							})]
						}, key))
					})]
				}),
				/* @__PURE__ */ jsxs(Card, {
					className: "border-border/60 bg-card/60",
					children: [/* @__PURE__ */ jsxs(CardHeader, {
						className: "pb-3",
						children: [/* @__PURE__ */ jsxs(CardTitle, {
							className: "text-base font-semibold flex items-center gap-2",
							children: [/* @__PURE__ */ jsx(Radio, { className: "h-4 w-4 text-cyan-400" }), " Deployment Mode"]
						}), /* @__PURE__ */ jsx(CardDescription, {
							className: "text-xs",
							children: "Control the autonomy level of this AI employee when handling real customer calls."
						})]
					}), /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx("div", {
						className: "grid gap-3 sm:grid-cols-2",
						children: DEPLOYMENT_MODES.map((d) => {
							const isSelected = form.deployment_mode === d.mode;
							return /* @__PURE__ */ jsxs("div", {
								onClick: () => setForm({
									...form,
									deployment_mode: d.mode
								}),
								className: `cursor-pointer p-3.5 rounded-xl border transition-all text-left space-y-1.5 ${isSelected ? "border-cyan-500 bg-cyan-950/20 shadow-sm" : "border-border/60 bg-background/40 hover:border-border"}`,
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ jsx("span", {
										className: "text-xs font-bold text-foreground",
										children: d.title
									}), /* @__PURE__ */ jsx(Badge, {
										variant: "outline",
										className: `text-[10px] ${d.badgeColor}`,
										children: d.badge
									})]
								}), /* @__PURE__ */ jsx("p", {
									className: "text-[11px] text-muted-foreground leading-relaxed",
									children: d.desc
								})]
							}, d.mode);
						})
					}) })]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-center justify-between pt-2",
					children: [/* @__PURE__ */ jsx(Link, {
						to: "/voice",
						children: /* @__PURE__ */ jsxs(Button, {
							variant: "ghost",
							size: "sm",
							className: "text-xs text-muted-foreground gap-1",
							children: ["Test in private room ", /* @__PURE__ */ jsx(ArrowRight, { className: "h-3.5 w-3.5" })]
						})
					}), /* @__PURE__ */ jsx(Button, {
						onClick: () => save.mutate(),
						disabled: !businessId || save.isPending,
						className: "bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold text-xs px-6",
						children: save.isPending ? "Saving..." : "Save AI Employee"
					})]
				})
			]
		})
	});
}
//#endregion
export { AgentPage as component };
