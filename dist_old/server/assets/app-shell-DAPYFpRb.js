import { c as getTenantSettings } from "./insurance.functions-BLePgOSY.js";
import { n as Button, r as cn } from "./badge-CjGhifle.js";
import { Link, useRouter } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { UserButton, useClerk, useUser } from "@clerk/clerk-react";
import { BookOpen, Bot, CheckSquare, FileText, LayoutDashboard, LogOut, MessageSquare, Mic, PhoneCall, PhoneForwarded, Settings, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
//#region src/components/app-shell.tsx
var NAV_OPERATIONS = [
	{
		to: "/dashboard",
		label: "Operations Overview",
		icon: LayoutDashboard
	},
	{
		to: "/whatsapp",
		label: "WhatsApp Assistant",
		icon: MessageSquare
	},
	{
		to: "/phone",
		label: "Phone & Telephony",
		icon: PhoneForwarded
	},
	{
		to: "/calls",
		label: "Live Calls & Transcripts",
		icon: PhoneCall
	},
	{
		to: "/claims",
		label: "Claims Intake & FNOL",
		icon: ShieldCheck
	},
	{
		to: "/policies",
		label: "Policy Portfolio",
		icon: FileText
	},
	{
		to: "/change-requests",
		label: "Staff Approvals Queue",
		icon: CheckSquare
	}
];
var NAV_INTELLIGENCE = [
	{
		to: "/agent",
		label: "Insurance Voice Studio",
		icon: Bot
	},
	{
		to: "/train",
		label: "Policy Knowledge Store",
		icon: BookOpen
	},
	{
		to: "/voice",
		label: "Voice Call Simulator",
		icon: Mic
	},
	{
		to: "/audit",
		label: "Audit & Compliance Log",
		icon: ShieldAlert
	}
];
var NAV_CARRIER = [{
	to: "/onboarding",
	label: "Carrier Setup",
	icon: Sparkles
}, {
	to: "/settings",
	label: "Tenant & API Settings",
	icon: Settings
}];
function AppShell({ title, subtitle, children }) {
	const path = useRouter().state.location.pathname;
	const clerk = useClerk();
	const { user } = useUser();
	const { data: tenant } = useQuery({
		queryKey: ["tenant-settings", user?.id],
		queryFn: () => getTenantSettings({ data: {
			clerkUserId: user?.id,
			userEmail: user?.primaryEmailAddress?.emailAddress,
			userName: user?.fullName || void 0
		} })
	});
	const tenantConfig = tenant?.branding_config || {};
	const companyName = tenant?.name || "InsurCall Carrier Operations";
	const planRaw = tenantConfig.plan || "enterprise";
	const planDisplay = planRaw.charAt(0).toUpperCase() + planRaw.slice(1);
	const signOut = async () => {
		try {
			await clerk.signOut();
		} catch (_) {}
		window.location.href = "/";
	};
	[
		...NAV_OPERATIONS,
		...NAV_INTELLIGENCE,
		...NAV_CARRIER
	];
	return /* @__PURE__ */ jsxs("div", {
		className: "flex min-h-screen bg-[#FAF9F6] text-[#111827] antialiased font-sans",
		children: [/* @__PURE__ */ jsxs("aside", {
			className: "hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex shadow-xs sticky top-0 h-screen select-none z-20",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "mb-4 pb-3 border-b border-slate-100",
					children: [/* @__PURE__ */ jsxs(Link, {
						to: "/dashboard",
						className: "flex items-center justify-between px-1 py-1 group",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ jsx("img", {
								src: "/01_logo_only_transparent.png",
								alt: "InsurCall Emblem",
								className: "h-7 w-auto object-contain transition-transform group-hover:scale-105"
							}), /* @__PURE__ */ jsxs("span", {
								className: "font-display text-base font-extrabold tracking-tight text-[#111827]",
								children: ["Insur", /* @__PURE__ */ jsx("span", {
									className: "text-[#087F8C]",
									children: "Call"
								})]
							})]
						}), /* @__PURE__ */ jsx("span", {
							className: "rounded-full bg-[#172033] text-white px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider font-bold",
							children: planDisplay
						})]
					}), /* @__PURE__ */ jsx("div", {
						className: "px-1 pt-1.5 text-[11px] text-slate-500 font-mono font-medium truncate",
						title: companyName,
						children: companyName
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex-1 space-y-5 overflow-hidden pr-1",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "space-y-1",
							children: [/* @__PURE__ */ jsx("div", {
								className: "px-2 pb-1 text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase",
								children: "Operations"
							}), /* @__PURE__ */ jsx("nav", {
								className: "space-y-0.5",
								children: NAV_OPERATIONS.map((item) => {
									const isActive = path === item.to;
									return /* @__PURE__ */ jsxs(Link, {
										to: item.to,
										className: cn("flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-900", isActive && "bg-[#E6F6F7] text-[#087F8C] font-semibold border border-[#087F8C]/20 shadow-2xs"),
										children: [/* @__PURE__ */ jsx(item.icon, { className: cn("size-4 shrink-0", isActive ? "text-[#087F8C]" : "text-slate-400") }), /* @__PURE__ */ jsx("span", {
											className: "truncate",
											children: item.label
										})]
									}, item.to);
								})
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "space-y-1",
							children: [/* @__PURE__ */ jsx("div", {
								className: "px-2 pb-1 text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase",
								children: "AI Voice & Knowledge"
							}), /* @__PURE__ */ jsx("nav", {
								className: "space-y-0.5",
								children: NAV_INTELLIGENCE.map((item) => {
									const isActive = path === item.to;
									return /* @__PURE__ */ jsxs(Link, {
										to: item.to,
										className: cn("flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-900", isActive && "bg-[#E6F6F7] text-[#087F8C] font-semibold border border-[#087F8C]/20 shadow-2xs"),
										children: [/* @__PURE__ */ jsx(item.icon, { className: cn("size-4 shrink-0", isActive ? "text-[#087F8C]" : "text-slate-400") }), /* @__PURE__ */ jsx("span", {
											className: "truncate",
											children: item.label
										})]
									}, item.to);
								})
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "space-y-1",
							children: [/* @__PURE__ */ jsx("div", {
								className: "px-2 pb-1 text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase",
								children: "Carrier Governance"
							}), /* @__PURE__ */ jsx("nav", {
								className: "space-y-0.5",
								children: NAV_CARRIER.map((item) => {
									const isActive = path === item.to;
									return /* @__PURE__ */ jsxs(Link, {
										to: item.to,
										className: cn("flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-900", isActive && "bg-[#E6F6F7] text-[#087F8C] font-semibold border border-[#087F8C]/20 shadow-2xs"),
										children: [/* @__PURE__ */ jsx(item.icon, { className: cn("size-4 shrink-0", isActive ? "text-[#087F8C]" : "text-slate-400") }), /* @__PURE__ */ jsx("span", {
											className: "truncate",
											children: item.label
										})]
									}, item.to);
								})
							})]
						})
					]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "border-t border-slate-100 pt-3 mt-auto",
					children: /* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-100",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2 min-w-0",
							children: [/* @__PURE__ */ jsx(UserButton, { afterSignOutUrl: "/" }), /* @__PURE__ */ jsxs("div", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ jsx("p", {
									className: "text-xs font-semibold text-slate-900 truncate",
									children: user?.fullName || user?.firstName || "Staff Adjuster"
								}), /* @__PURE__ */ jsx("p", {
									className: "text-[10px] font-mono text-slate-400 truncate",
									children: user?.primaryEmailAddress?.emailAddress || "adjuster@insurcall.ai"
								})]
							})]
						}), /* @__PURE__ */ jsx("button", {
							onClick: signOut,
							title: "Sign Out",
							className: "p-1 text-slate-400 hover:text-rose-600 transition-colors",
							children: /* @__PURE__ */ jsx(LogOut, { className: "size-4" })
						})]
					})
				})
			]
		}), /* @__PURE__ */ jsxs("div", {
			className: "flex flex-1 flex-col min-w-0",
			children: [/* @__PURE__ */ jsxs("header", {
				className: "sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-md",
				children: [/* @__PURE__ */ jsx("div", {
					className: "flex items-center gap-3",
					children: /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
						className: "font-display text-base font-bold text-slate-900 leading-tight",
						children: title
					}), subtitle && /* @__PURE__ */ jsx("p", {
						className: "text-[11px] text-slate-500 font-mono leading-none mt-0.5",
						children: subtitle
					})] })
				}), /* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ jsx(Button, {
						asChild: true,
						size: "sm",
						variant: "outline",
						className: "h-8 rounded-full border-slate-200 text-xs font-mono text-slate-700 hover:text-black hover:bg-slate-100",
						children: /* @__PURE__ */ jsxs(Link, {
							to: "/voice",
							children: [/* @__PURE__ */ jsx(Mic, { className: "size-3 mr-1.5 text-[#087F8C]" }), "Test Voice Call"]
						})
					}), /* @__PURE__ */ jsx(Button, {
						asChild: true,
						size: "sm",
						className: "h-8 rounded-full bg-[#172033] hover:bg-[#1F2937] text-white text-xs font-mono font-medium",
						children: /* @__PURE__ */ jsxs(Link, {
							to: "/claims",
							children: [/* @__PURE__ */ jsx(ShieldCheck, { className: "size-3 mr-1.5 text-[#10A6AE]" }), "New FNOL Intake"]
						})
					})]
				})]
			}), /* @__PURE__ */ jsx("main", {
				className: "flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto",
				children
			})]
		})]
	});
}
//#endregion
export { AppShell as t };
