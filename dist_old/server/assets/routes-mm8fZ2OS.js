import { n as Button, t as Badge } from "./badge-CjGhifle.js";
import * as React from "react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { SignIn, SignUp } from "@clerk/clerk-react";
import { AlertTriangle, ArrowRight, Award, CheckCircle2, Clock, Database, Info, Lock, LogIn, Menu, Mic, PhoneCall, PhoneOff, ShieldCheck, UserCheck, UserPlus, Volume2, X } from "lucide-react";
//#region src/components/floating-auth-modal.tsx
function FloatingAuthModal({ isOpen, onClose }) {
	const [authMode, setAuthMode] = useState("signin");
	if (!isOpen) return null;
	return /* @__PURE__ */ jsx("div", {
		className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200",
		onClick: (e) => {
			if (e.target === e.currentTarget) onClose();
		},
		children: /* @__PURE__ */ jsxs("div", {
			className: "relative w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200",
			children: [
				/* @__PURE__ */ jsx("button", {
					onClick: onClose,
					className: "absolute top-4 right-4 z-20 grid size-8 place-items-center rounded-full bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
					title: "Close modal",
					children: /* @__PURE__ */ jsx(X, { className: "size-4" })
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mb-4 flex flex-col items-center text-center",
					children: [
						/* @__PURE__ */ jsx("img", {
							src: "/02_logo_with_InsurCall_light_transparent.png",
							alt: "InsurCall",
							className: "h-9 w-auto object-contain mb-2"
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary mb-3",
							children: [/* @__PURE__ */ jsx(Lock, { className: "size-3" }), " Secure Enterprise Portal"]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1 text-xs font-medium w-full max-w-xs mb-2",
							children: [/* @__PURE__ */ jsxs("button", {
								onClick: () => setAuthMode("signin"),
								className: `flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${authMode === "signin" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"}`,
								children: [/* @__PURE__ */ jsx(LogIn, { className: "size-3.5" }), " Sign In"]
							}), /* @__PURE__ */ jsxs("button", {
								onClick: () => setAuthMode("signup"),
								className: `flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${authMode === "signup" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"}`,
								children: [/* @__PURE__ */ jsx(UserPlus, { className: "size-3.5" }), " Register Carrier"]
							})]
						})
					]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "flex justify-center",
					children: authMode === "signin" ? /* @__PURE__ */ jsx(SignIn, {
						routing: "hash",
						fallbackRedirectUrl: "/dashboard"
					}) : /* @__PURE__ */ jsx(SignUp, {
						routing: "hash",
						fallbackRedirectUrl: "/onboarding"
					})
				})
			]
		})
	});
}
//#endregion
//#region src/components/floating-navbar.tsx
function FloatingNavbar({ onOpenAuth }) {
	const [scrolled, setScrolled] = useState(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	useEffect(() => {
		const handleScroll = () => {
			setScrolled(window.scrollY > 20);
		};
		window.addEventListener("scroll", handleScroll, { passive: true });
		handleScroll();
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);
	return /* @__PURE__ */ jsxs("nav", {
		className: `fixed top-0 inset-x-0 z-50 pointer-events-none transition-all duration-300 ${scrolled ? "pt-3.5 sm:pt-4" : "pt-5 sm:pt-6"}`,
		children: [/* @__PURE__ */ jsxs("div", {
			className: "max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between",
			children: [/* @__PURE__ */ jsx("div", {
				className: `pointer-events-auto transition-all duration-300 ${scrolled ? "rounded-full bg-white/80 border border-slate-200/80 shadow-sm backdrop-blur-xl px-3.5 py-1.5" : "px-1 py-1"}`,
				children: /* @__PURE__ */ jsxs(Link, {
					to: "/",
					className: "flex items-center gap-2.5 group",
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
				})
			}), /* @__PURE__ */ jsxs("div", {
				className: "pointer-events-auto flex items-center gap-2",
				children: [/* @__PURE__ */ jsxs("div", {
					className: `hidden md:flex items-center rounded-full border transition-all duration-300 p-1.5 ${scrolled ? "bg-white/90 border-slate-200/90 shadow-md shadow-slate-900/5 backdrop-blur-2xl" : "bg-white/70 border-slate-200/70 shadow-xs backdrop-blur-xl hover:bg-white/90"}`,
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center px-1 font-mono text-[11px] tracking-widest text-[#344054]",
						children: [
							/* @__PURE__ */ jsx("a", {
								href: "#use-cases",
								className: "px-3.5 py-1.5 rounded-full hover:text-[#087F8C] hover:bg-slate-100/70 transition-all font-medium",
								children: "SOLUTIONS"
							}),
							/* @__PURE__ */ jsx("a", {
								href: "#how-it-works",
								className: "px-3.5 py-1.5 rounded-full hover:text-[#087F8C] hover:bg-slate-100/70 transition-all font-medium",
								children: "HOW IT WORKS"
							}),
							/* @__PURE__ */ jsx("a", {
								href: "#pricing",
								className: "px-3.5 py-1.5 rounded-full hover:text-[#087F8C] hover:bg-slate-100/70 transition-all font-medium",
								children: "PRICING"
							})
						]
					}), /* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-1.5 pl-1",
						children: [/* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: onOpenAuth,
							className: "font-mono text-[11px] tracking-wider uppercase text-slate-700 hover:text-black px-3 py-1.5 transition-colors cursor-pointer",
							children: "SIGN IN"
						}), /* @__PURE__ */ jsxs(Link, {
							to: "/voice",
							className: "group flex items-center gap-1.5 bg-[#111827] hover:bg-[#1F2937] text-white font-mono text-[11px] tracking-wider uppercase px-4 py-2 rounded-full transition-all shadow-xs active:scale-95",
							children: [
								/* @__PURE__ */ jsx(Mic, { className: "size-3 text-[#10A6AE]" }),
								/* @__PURE__ */ jsx("span", { children: "TRY DEMO" }),
								/* @__PURE__ */ jsx(ArrowRight, { className: "size-3 transition-transform group-hover:translate-x-0.5 text-slate-400 group-hover:text-white" })
							]
						})]
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "md:hidden flex items-center gap-2 rounded-full bg-white/90 border border-slate-200/90 shadow-sm backdrop-blur-xl p-1.5",
					children: [/* @__PURE__ */ jsx(Link, {
						to: "/voice",
						className: "bg-[#087F8C] text-white font-mono text-[10px] tracking-wider uppercase px-3 py-1.5 rounded-full font-semibold",
						children: "DEMO"
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: () => setMobileMenuOpen(!mobileMenuOpen),
						className: "p-1.5 rounded-full text-slate-700 hover:text-black hover:bg-slate-100 transition-colors",
						"aria-label": "Toggle menu",
						children: mobileMenuOpen ? /* @__PURE__ */ jsx(X, { className: "size-4" }) : /* @__PURE__ */ jsx(Menu, { className: "size-4" })
					})]
				})]
			})]
		}), mobileMenuOpen && /* @__PURE__ */ jsx("div", {
			className: "pointer-events-auto md:hidden mx-4 mt-2 p-4 rounded-3xl bg-white/95 border border-slate-200 shadow-xl backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-150",
			children: /* @__PURE__ */ jsxs("div", {
				className: "flex flex-col gap-2 font-mono text-xs tracking-wider text-slate-800",
				children: [
					/* @__PURE__ */ jsx("a", {
						href: "#use-cases",
						onClick: () => setMobileMenuOpen(false),
						className: "px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors",
						children: "SOLUTIONS"
					}),
					/* @__PURE__ */ jsx("a", {
						href: "#how-it-works",
						onClick: () => setMobileMenuOpen(false),
						className: "px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors",
						children: "HOW IT WORKS"
					}),
					/* @__PURE__ */ jsx("a", {
						href: "#pricing",
						onClick: () => setMobileMenuOpen(false),
						className: "px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors",
						children: "PRICING"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "pt-2 border-t border-slate-100 flex flex-col gap-2",
						children: [/* @__PURE__ */ jsxs(Button, {
							variant: "outline",
							size: "sm",
							onClick: () => {
								setMobileMenuOpen(false);
								onOpenAuth();
							},
							className: "w-full text-xs font-mono justify-center",
							children: [/* @__PURE__ */ jsx(Lock, { className: "size-3.5 mr-1.5" }), "SIGN IN"]
						}), /* @__PURE__ */ jsx(Button, {
							asChild: true,
							size: "sm",
							className: "w-full bg-[#111827] text-white text-xs font-mono justify-center",
							children: /* @__PURE__ */ jsxs(Link, {
								to: "/voice",
								onClick: () => setMobileMenuOpen(false),
								children: [/* @__PURE__ */ jsx(Mic, { className: "size-3.5 mr-1.5 text-[#10A6AE]" }), "LAUNCH TEST CALL"]
							})
						})]
					})
				]
			})
		})]
	});
}
//#endregion
//#region src/components/sound-wave-motif.tsx
function SoundWaveMotif({ variant = "hero", className = "", active = true }) {
	if (variant === "bar-pulse") return /* @__PURE__ */ jsx("div", {
		className: `flex items-center gap-1 h-8 ${className}`,
		children: [
			16,
			28,
			44,
			20,
			36,
			52,
			28,
			40,
			24,
			48,
			32,
			20
		].map((h, i) => /* @__PURE__ */ jsx("span", {
			className: "w-1 rounded-full bg-[#087F8C] transition-all duration-300",
			style: {
				height: active ? `${Math.max(6, Math.sin((i + 1) * .8) * 16 + 18)}px` : "6px",
				opacity: active ? .75 + i % 3 * .12 : .3,
				animation: active ? `pulseWave 1.4s ease-in-out infinite ${i * .08}s` : "none"
			}
		}, i))
	});
	if (variant === "divider") return /* @__PURE__ */ jsx("div", {
		className: `relative w-full overflow-hidden py-4 ${className}`,
		children: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 1200 48",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			className: "w-full h-8 text-[#087F8C]/25",
			preserveAspectRatio: "none",
			children: [/* @__PURE__ */ jsx("path", {
				d: "M0 24C150 24 200 4 350 4C500 4 550 44 700 44C850 44 900 12 1050 12C1120 12 1160 24 1200 24",
				stroke: "currentColor",
				strokeWidth: "1.5",
				strokeDasharray: "4 4"
			}), /* @__PURE__ */ jsx("path", {
				d: "M0 24C180 24 240 38 420 38C600 38 660 10 840 10C1020 10 1080 24 1200 24",
				stroke: "currentColor",
				strokeWidth: "1",
				opacity: "0.6"
			})]
		})
	});
	if (variant === "nodes") return /* @__PURE__ */ jsx("div", {
		className: `relative w-full max-w-2xl mx-auto py-6 ${className}`,
		children: /* @__PURE__ */ jsxs("div", {
			className: "flex items-center justify-between relative",
			children: [
				/* @__PURE__ */ jsx("div", { className: "absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-[#087F8C]/20 via-[#10A6AE] to-[#087F8C]/20" }),
				/* @__PURE__ */ jsxs("div", {
					className: "relative z-10 flex flex-col items-center",
					children: [/* @__PURE__ */ jsx("div", {
						className: "size-10 rounded-full border-2 border-[#10A6AE] bg-[#172033] flex items-center justify-center text-xs font-mono font-bold text-[#10A6AE] shadow-[0_0_15px_rgba(16,166,174,0.3)]",
						children: "01"
					}), /* @__PURE__ */ jsx("span", {
						className: "mt-2 text-[11px] font-mono tracking-wider text-slate-300 uppercase",
						children: "Incoming Call"
					})]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "relative z-10 hidden sm:flex items-center gap-1 bg-[#172033] px-3 py-1 rounded-full border border-[#087F8C]/40",
					children: [
						12,
						22,
						16,
						26,
						14
					].map((h, i) => /* @__PURE__ */ jsx("span", {
						className: "w-1 bg-[#10A6AE] rounded-full",
						style: { height: `${h}px` }
					}, i))
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "relative z-10 flex flex-col items-center",
					children: [/* @__PURE__ */ jsx("div", {
						className: "size-10 rounded-full border-2 border-[#087F8C] bg-[#172033] flex items-center justify-center text-xs font-mono font-bold text-white shadow-[0_0_15px_rgba(8,127,140,0.4)]",
						children: "02"
					}), /* @__PURE__ */ jsx("span", {
						className: "mt-2 text-[11px] font-mono tracking-wider text-slate-300 uppercase",
						children: "Anya Receptionist"
					})]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "relative z-10 hidden sm:flex items-center gap-1 bg-[#172033] px-3 py-1 rounded-full border border-[#087F8C]/40",
					children: [
						14,
						26,
						18,
						22,
						12
					].map((h, i) => /* @__PURE__ */ jsx("span", {
						className: "w-1 bg-[#10A6AE] rounded-full",
						style: { height: `${h}px` }
					}, i))
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "relative z-10 flex flex-col items-center",
					children: [/* @__PURE__ */ jsx("div", {
						className: "size-10 rounded-full border-2 border-emerald-400 bg-[#172033] flex items-center justify-center text-xs font-mono font-bold text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]",
						children: "03"
					}), /* @__PURE__ */ jsx("span", {
						className: "mt-2 text-[11px] font-mono tracking-wider text-slate-300 uppercase",
						children: "Booked & Verified"
					})]
				})
			]
		})
	});
	return /* @__PURE__ */ jsx("div", {
		className: `relative w-full overflow-hidden ${className}`,
		children: /* @__PURE__ */ jsxs("svg", {
			viewBox: "0 0 800 120",
			fill: "none",
			xmlns: "http://www.w3.org/2000/svg",
			className: "w-full h-16 text-[#087F8C]",
			children: [/* @__PURE__ */ jsx("path", {
				d: "M0 60 C 100 20, 150 100, 250 60 C 350 20, 400 95, 500 60 C 600 25, 650 90, 750 60 C 780 50, 795 55, 800 60",
				stroke: "currentColor",
				strokeWidth: "2",
				strokeLinecap: "round",
				strokeOpacity: "0.3"
			}), /* @__PURE__ */ jsx("path", {
				d: "M0 60 C 80 40, 180 80, 280 60 C 380 40, 480 80, 580 60 C 680 40, 750 70, 800 60",
				stroke: "#10A6AE",
				strokeWidth: "1.5",
				strokeLinecap: "round",
				strokeOpacity: "0.5"
			})]
		})
	});
}
//#endregion
//#region src/components/insurance-hero-panel.tsx
function InsuranceHeroPanel() {
	const [callState, setCallState] = useState("live");
	const [callTimer, setCallTimer] = useState(38);
	useEffect(() => {
		let interval;
		if (callState === "live") interval = setInterval(() => {
			setCallTimer((prev) => prev + 1);
		}, 1e3);
		return () => clearInterval(interval);
	}, [callState]);
	const toggleCall = () => {
		if (callState === "live") setCallState("completed");
		else {
			setCallState("connecting");
			setTimeout(() => {
				setCallState("live");
				setCallTimer(0);
			}, 700);
		}
	};
	const formatTimer = (s) => {
		return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "relative rounded-[32px] border border-slate-200/90 bg-white shadow-[0_24px_55px_-12px_rgba(8,127,140,0.16)] overflow-hidden transition-all duration-300 hover:shadow-[0_28px_65px_-10px_rgba(8,127,140,0.22)]",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex items-center justify-between border-b border-slate-100 bg-[#FAF9F6] px-5 py-3.5",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-2.5",
				children: [/* @__PURE__ */ jsxs("span", {
					className: "relative flex size-2.5",
					children: [callState === "live" && /* @__PURE__ */ jsx("span", { className: "absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" }), /* @__PURE__ */ jsx("span", { className: `relative inline-flex size-2.5 rounded-full ${callState === "live" ? "bg-emerald-500" : callState === "connecting" ? "bg-amber-500 animate-pulse" : "bg-slate-400"}` })]
				}), /* @__PURE__ */ jsx("span", {
					className: "font-mono text-[11px] font-bold tracking-wider uppercase text-slate-800",
					children: callState === "live" ? "Live Insurance Call" : callState === "connecting" ? "Connecting Carrier Line" : "Call Completed"
				})]
			}), /* @__PURE__ */ jsx(Badge, {
				variant: "outline",
				className: "border-[#087F8C]/30 bg-[#E6F6F7] text-[10px] font-mono tracking-wider text-[#087F8C] uppercase font-semibold",
				children: "Interactive Simulation"
			})]
		}), /* @__PURE__ */ jsxs("div", {
			className: "p-6 space-y-4",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-[#FAF9F6] p-3.5 text-xs",
					children: [/* @__PURE__ */ jsxs("div", { children: [
						/* @__PURE__ */ jsx("span", {
							className: "text-[10px] font-mono uppercase tracking-wider text-slate-500 block",
							children: "Policyholder"
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "mt-0.5 flex items-center gap-1.5",
							children: [/* @__PURE__ */ jsx("span", { className: "size-2 rounded-full bg-slate-400" }), /* @__PURE__ */ jsx("span", {
								className: "font-bold text-slate-900",
								children: "Vikramaditya Sen"
							})]
						}),
						/* @__PURE__ */ jsx("div", {
							className: "font-mono text-[10px] text-slate-500 flex items-center gap-1 mt-0.5",
							children: /* @__PURE__ */ jsx("span", { children: "POL-MOT-2024-8842" })
						})
					] }), /* @__PURE__ */ jsxs("div", {
						className: "border-l border-slate-200/80 pl-3",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "text-[10px] font-mono uppercase tracking-wider text-slate-500 block",
								children: "AI Operations Voice"
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "mt-0.5 flex items-center gap-1.5",
								children: [/* @__PURE__ */ jsx("span", { className: "size-2 rounded-full bg-[#087F8C]" }), /* @__PURE__ */ jsx("span", {
									className: "font-bold text-[#087F8C]",
									children: "Anya (Claims Specialist)"
								})]
							}),
							/* @__PURE__ */ jsx("span", {
								className: "text-[10px] font-mono text-slate-500",
								children: "English + Hindi"
							})
						]
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-center justify-between px-2 py-0.5",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ jsx(Volume2, { className: "size-4 text-[#087F8C]" }), /* @__PURE__ */ jsx(SoundWaveMotif, {
							variant: "bar-pulse",
							active: callState === "live"
						})]
					}), /* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full",
						children: [/* @__PURE__ */ jsx(Clock, { className: "size-3 text-slate-500" }), /* @__PURE__ */ jsx("span", { children: callState === "live" ? formatTimer(callTimer) : "01:14" })]
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "space-y-2.5 rounded-2xl border border-slate-100 bg-white p-4 text-xs shadow-xs",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between",
						children: [/* @__PURE__ */ jsx("span", { children: "Illustrative Dialogue" }), /* @__PURE__ */ jsxs("span", {
							className: "text-emerald-700 font-semibold flex items-center gap-1",
							children: [/* @__PURE__ */ jsx(UserCheck, { className: "size-3" }), " Identity OTP Verified"]
						})]
					}), /* @__PURE__ */ jsxs("div", {
						className: "space-y-2 pt-1",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex items-start gap-2.5",
							children: [/* @__PURE__ */ jsx("span", {
								className: "text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 shrink-0 mt-0.5",
								children: "Policyholder:"
							}), /* @__PURE__ */ jsx("p", {
								className: "text-[11.5px] leading-relaxed text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100",
								children: "\"I submitted my motor claim last week. Can you check what happens next?\""
							})]
						}), /* @__PURE__ */ jsxs("div", {
							className: "flex items-start gap-2.5",
							children: [/* @__PURE__ */ jsx("span", {
								className: "text-[10px] font-mono font-bold uppercase tracking-wider text-[#087F8C] shrink-0 mt-0.5",
								children: "InsurCall:"
							}), /* @__PURE__ */ jsx("p", {
								className: "text-[11.5px] leading-relaxed text-slate-900 bg-[#E6F6F7]/70 px-3 py-1.5 rounded-xl border border-[#087F8C]/20",
								children: "\"I can help check the available claim status. I will first verify the relevant policy or claim reference.\""
							})]
						})]
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "rounded-2xl border border-slate-200/90 bg-[#FAF9F6] p-3 text-[11px] space-y-1.5",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center justify-between text-slate-600",
							children: [/* @__PURE__ */ jsx("span", {
								className: "font-mono text-[10px] uppercase tracking-wider",
								children: "Detected Intent:"
							}), /* @__PURE__ */ jsx("span", {
								className: "font-semibold text-slate-900",
								children: "Motor Claim Status Enquiry"
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center justify-between text-slate-600",
							children: [/* @__PURE__ */ jsx("span", {
								className: "font-mono text-[10px] uppercase tracking-wider",
								children: "Claim Reference:"
							}), /* @__PURE__ */ jsx("span", {
								className: "font-mono font-semibold text-[#087F8C]",
								children: "CLM-2026-0914"
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center justify-between text-slate-600",
							children: [/* @__PURE__ */ jsx("span", {
								className: "font-mono text-[10px] uppercase tracking-wider",
								children: "Workflow Stage:"
							}), /* @__PURE__ */ jsx("span", {
								className: "font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70",
								children: "Surveyor Assessment Completed"
							})]
						})
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "grid grid-cols-2 gap-2 pt-1",
					children: [/* @__PURE__ */ jsx(Button, {
						type: "button",
						variant: "outline",
						onClick: toggleCall,
						className: "h-11 rounded-xl text-xs font-mono tracking-wider border-slate-200 text-slate-700 hover:text-black hover:bg-slate-100 cursor-pointer",
						children: callState === "live" ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(PhoneOff, { className: "size-3.5 mr-1.5 text-rose-600" }), "END CALL"] }) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(PhoneCall, { className: "size-3.5 mr-1.5 text-[#087F8C]" }), "RESTART CALL"] })
					}), /* @__PURE__ */ jsx(Button, {
						asChild: true,
						className: "h-11 rounded-xl text-xs font-mono tracking-wider bg-[#087F8C] hover:bg-[#076C77] text-white shadow-xs",
						children: /* @__PURE__ */ jsxs(Link, {
							to: "/voice",
							children: [
								/* @__PURE__ */ jsx(Mic, { className: "size-3.5 mr-1.5 text-[#10A6AE]" }),
								"LAUNCH SIMULATOR",
								/* @__PURE__ */ jsx(ArrowRight, { className: "size-3 ml-1" })
							]
						})
					})]
				})
			]
		})]
	});
}
//#endregion
//#region src/components/insurance-workflow-showcase.tsx
var WORKFLOW_STEPS = [
	{
		id: "step-1",
		stepNumber: "01",
		name: "Incoming Call",
		shortDesc: "Inbound customer telephone line or WebRTC connection receives policyholder call.",
		agentRole: "Answers instantly, speaks natural greeting in English, Hindi, or conversational Hinglish.",
		requiredData: "Caller phone number (CLI) and inbound carrier routing trunk.",
		sourceSystem: "Telephony gateway / LiveKit WebRTC media server.",
		validationRule: "Verify line is active and map carrier trunk to authenticated insurance tenant.",
		humanApproval: "No. Autonomous instant connection without wait queue.",
		persistedRecord: "Initial call session row in call_sessions table with room ID and start timestamp."
	},
	{
		id: "step-2",
		stepNumber: "02",
		name: "Identity Verification",
		shortDesc: "Verifies policyholder identity through phone lookup and cryptographic SMS OTP.",
		agentRole: "Prompts for customer name and policy number. Sends OTP when accessing sensitive records.",
		requiredData: "Customer full name, date of birth or last 4 digits of Aadhaar/PAN, and mobile number.",
		sourceSystem: "Customers table & SMS delivery gateway.",
		validationRule: "6-digit OTP verification with 5-minute expiry and rate-limiting against brute force.",
		humanApproval: "Required if OTP fails twice or high-risk nominee modification is requested.",
		persistedRecord: "otp_verified_until timestamp updated in call_sessions and risk_state evaluated."
	},
	{
		id: "step-3",
		stepNumber: "03",
		name: "Intent Detection",
		shortDesc: "Categorizes conversation into exact insurance workflow paths.",
		agentRole: "Listens with polite turn-taking, extracts key entities (claim ID, date, vehicle damage).",
		requiredData: "Caller utterances, spoken keywords, and conversational context.",
		sourceSystem: "Local Ollama / Groq Cloud LLM engine.",
		validationRule: "Classification against approved insurance taxonomy: FNOL, Claim Status, Policy Inquiry, Renewal.",
		humanApproval: "No. Autonomous intent classification.",
		persistedRecord: "Structured metadata updated in call_sessions.metadata."
	},
	{
		id: "step-4",
		stepNumber: "04",
		name: "Approved Policy / Claim Lookup",
		shortDesc: "Retrieves ground-truth coverage terms and active claim history.",
		agentRole: "Executes typed database tool lookup_policy or get_claim_status.",
		requiredData: "Validated tenant_id, customer_id, and policy_number.",
		sourceSystem: "InsForge PostgreSQL (policies, claims, and policy_documents).",
		validationRule: "Strict multi-tenant row-level security (RLS). Cross-tenant queries are blocked.",
		humanApproval: "No. Read-only retrieval of approved policy clauses and active claim stage.",
		persistedRecord: "Audit row inserted into agent_actions with parameters and verified outcome."
	},
	{
		id: "step-5",
		stepNumber: "05",
		name: "Validated Next Action",
		shortDesc: "Performs permitted operations such as filing FNOL report or sending claim summary.",
		agentRole: "Structures First Notice of Loss incident details or sends official summary via SMS.",
		requiredData: "Incident timestamp, incident location, damage description, third-party details.",
		sourceSystem: "Claims API & carrier notification services.",
		validationRule: "Strict schema validation via Zod; fields checked for completeness before ingestion.",
		humanApproval: "Required for payouts, policy cancellations, or binding endorsements.",
		persistedRecord: "New claim intake row created in claims table with status 'submitted'."
	},
	{
		id: "step-6",
		stepNumber: "06",
		name: "Human Review When Required",
		shortDesc: "Seamless handoff to human claims adjuster or policy underwriter.",
		agentRole: "Prepares complete executive summary, verified facts, and transfers call or queues review ticket.",
		requiredData: "Conversation summary, flagged risk reason, extracted claim reference.",
		sourceSystem: "Human escalation queue (human_escalations & change_requests tables).",
		validationRule: "Mandatory human review for coverage disputes, high claims amounts, or caller distress.",
		humanApproval: "Yes. Claims supervisor or underwriter must review and sign off.",
		persistedRecord: "Human escalation row with urgency, reason, and assigned team member."
	},
	{
		id: "step-7",
		stepNumber: "07",
		name: "Audit & Compliance Record",
		shortDesc: "Stores immutable call recording, verbatim transcript, and compliance trail.",
		agentRole: "Closes session cleanly, writes final disposition, and triggers webhook to carrier CRM.",
		requiredData: "Complete turn-by-turn transcript, latency metrics, tool execution logs.",
		sourceSystem: "Audit trail database & carrier compliance archival.",
		validationRule: "Cryptographic hash verification of call events for regulatory auditability.",
		humanApproval: "No. Automated compliance logging.",
		persistedRecord: "Final ended_at timestamp, duration_sec, and full JSON transcript array persisted."
	}
];
function InsuranceWorkflowShowcase() {
	const [selectedStep, setSelectedStep] = useState(null);
	return /* @__PURE__ */ jsx("section", {
		id: "claims-workflow",
		className: "py-24 bg-white border-y border-slate-200/80",
		children: /* @__PURE__ */ jsxs("div", {
			className: "max-w-7xl mx-auto px-6 sm:px-8",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "max-w-3xl mb-16",
					children: [
						/* @__PURE__ */ jsx(Badge, {
							variant: "outline",
							className: "border-[#087F8C]/30 bg-[#E6F6F7] text-[#087F8C] text-[11px] font-mono tracking-wider uppercase mb-3 font-semibold",
							children: "End-to-End Governance"
						}),
						/* @__PURE__ */ jsx("h2", {
							className: "font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111827]",
							children: "From a conversation to a traceable insurance workflow."
						}),
						/* @__PURE__ */ jsx("p", {
							className: "mt-4 text-base sm:text-lg text-[#344054] leading-relaxed",
							children: "Every customer call moves through an auditable, step-by-step pipeline. Click any phase below to inspect the data requirements, validation checks, and compliance rules applied."
						})
					]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4",
					children: WORKFLOW_STEPS.map((step) => {
						const isSelected = selectedStep?.id === step.id;
						return /* @__PURE__ */ jsxs("div", {
							onClick: () => setSelectedStep(step),
							className: `group relative rounded-2xl border p-5 cursor-pointer transition-all flex flex-col justify-between ${isSelected ? "bg-[#172033] text-white border-[#10A6AE] shadow-lg scale-[1.02]" : "bg-[#FAF9F6] border-slate-200/90 text-slate-800 hover:border-[#087F8C]/50 hover:bg-white hover:shadow-md"}`,
							children: [/* @__PURE__ */ jsxs("div", { children: [
								/* @__PURE__ */ jsxs("div", {
									className: "flex items-center justify-between mb-3",
									children: [/* @__PURE__ */ jsx("span", {
										className: `font-mono text-xs font-bold ${isSelected ? "text-[#10A6AE]" : "text-[#087F8C]"}`,
										children: step.stepNumber
									}), /* @__PURE__ */ jsx(Info, { className: `size-3.5 transition-opacity ${isSelected ? "text-white opacity-90" : "text-slate-400 opacity-60 group-hover:opacity-100"}` })]
								}),
								/* @__PURE__ */ jsx("h3", {
									className: `font-display text-sm font-bold leading-tight ${isSelected ? "text-white" : "text-[#111827]"}`,
									children: step.name
								}),
								/* @__PURE__ */ jsx("p", {
									className: `mt-2 text-[11px] leading-relaxed line-clamp-3 ${isSelected ? "text-slate-300" : "text-[#667085]"}`,
									children: step.shortDesc
								})
							] }), /* @__PURE__ */ jsxs("div", {
								className: "mt-4 pt-3 border-t border-slate-200/40 flex items-center gap-1 font-mono text-[10px]",
								children: [/* @__PURE__ */ jsx("span", {
									className: isSelected ? "text-[#10A6AE]" : "text-[#087F8C]",
									children: "Inspect Details"
								}), /* @__PURE__ */ jsx(ArrowRight, { className: `size-2.5 ${isSelected ? "text-[#10A6AE]" : "text-[#087F8C]"}` })]
							})]
						}, step.id);
					})
				}),
				selectedStep && /* @__PURE__ */ jsxs("div", {
					className: "mt-8 rounded-3xl border border-slate-200 bg-[#FAF9F6] p-6 sm:p-8 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between border-b border-slate-200 pb-4 mb-6",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ jsxs("span", {
								className: "font-mono text-xs font-bold bg-[#087F8C] text-white px-2.5 py-1 rounded-lg",
								children: ["PHASE ", selectedStep.stepNumber]
							}), /* @__PURE__ */ jsxs("h4", {
								className: "font-display text-xl font-bold text-[#111827]",
								children: [selectedStep.name, " Detail Specification"]
							})]
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => setSelectedStep(null),
							className: "size-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-black hover:bg-slate-100",
							children: /* @__PURE__ */ jsx(X, { className: "size-4" })
						})]
					}), /* @__PURE__ */ jsxs("div", {
						className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "space-y-1",
								children: [/* @__PURE__ */ jsx("span", {
									className: "font-mono text-[10px] text-slate-500 uppercase tracking-wider block",
									children: "Agent Operational Role"
								}), /* @__PURE__ */ jsx("p", {
									className: "text-slate-800 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-200",
									children: selectedStep.agentRole
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "space-y-1",
								children: [/* @__PURE__ */ jsx("span", {
									className: "font-mono text-[10px] text-slate-500 uppercase tracking-wider block",
									children: "Required Input Data"
								}), /* @__PURE__ */ jsx("p", {
									className: "text-slate-800 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-200",
									children: selectedStep.requiredData
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "space-y-1",
								children: [/* @__PURE__ */ jsx("span", {
									className: "font-mono text-[10px] text-slate-500 uppercase tracking-wider block",
									children: "Authorised System Source"
								}), /* @__PURE__ */ jsx("p", {
									className: "text-slate-800 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-200",
									children: selectedStep.sourceSystem
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "space-y-1",
								children: [/* @__PURE__ */ jsx("span", {
									className: "font-mono text-[10px] text-slate-500 uppercase tracking-wider block",
									children: "Validation & Risk Rule"
								}), /* @__PURE__ */ jsx("p", {
									className: "text-slate-800 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-200",
									children: selectedStep.validationRule
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "space-y-1",
								children: [/* @__PURE__ */ jsx("span", {
									className: "font-mono text-[10px] text-slate-500 uppercase tracking-wider block",
									children: "Human Approval Required?"
								}), /* @__PURE__ */ jsx("p", {
									className: "text-slate-800 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-200",
									children: selectedStep.humanApproval
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "space-y-1",
								children: [/* @__PURE__ */ jsx("span", {
									className: "font-mono text-[10px] text-slate-500 uppercase tracking-wider block",
									children: "Persisted Database Record"
								}), /* @__PURE__ */ jsx("p", {
									className: "text-slate-800 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-200",
									children: selectedStep.persistedRecord
								})]
							})
						]
					})]
				})
			]
		})
	});
}
//#endregion
//#region src/components/insurance-capabilities.tsx
var CLAIM_LIFECYCLE_STAGES = [
	{
		label: "Received",
		status: "completed",
		date: "14 Oct, 09:30 AM",
		note: "FNOL Call Captured"
	},
	{
		label: "Info Required",
		status: "completed",
		date: "14 Oct, 10:15 AM",
		note: "Repair Estimate Uploaded"
	},
	{
		label: "Under Review",
		status: "active",
		date: "Current Stage",
		note: "Surveyor Inspection Active"
	},
	{
		label: "Awaiting Action",
		status: "pending",
		date: "Estimated 22 Oct",
		note: "Carrier Sign-off"
	},
	{
		label: "Updated",
		status: "pending",
		date: "Pending",
		note: "Settlement Notice"
	},
	{
		label: "Closed",
		status: "pending",
		date: "Pending",
		note: "Claim Discharged"
	}
];
function InsuranceCapabilities() {
	const [activeTab, setActiveTab] = useState("fnol");
	return /* @__PURE__ */ jsx("section", {
		id: "capabilities",
		className: "py-24 bg-[#FAF9F6]",
		children: /* @__PURE__ */ jsxs("div", {
			className: "max-w-7xl mx-auto px-6 sm:px-8",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "max-w-3xl mb-16",
					children: [
						/* @__PURE__ */ jsx(Badge, {
							variant: "outline",
							className: "border-[#087F8C]/30 bg-[#E6F6F7] text-[#087F8C] text-[11px] font-mono tracking-wider uppercase mb-3 font-semibold",
							children: "Purpose-Built InsurTech"
						}),
						/* @__PURE__ */ jsx("h2", {
							className: "font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111827]",
							children: "Workflows designed for real insurance operations."
						}),
						/* @__PURE__ */ jsx("p", {
							className: "mt-4 text-base sm:text-lg text-[#344054] leading-relaxed",
							children: "InsurCall is not a generic conversation bot. Explore how the platform structures claims intake, verifies policy limits, and manages human escalation."
						})
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex flex-wrap gap-2 pb-8 border-b border-slate-200",
					children: [
						/* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => setActiveTab("fnol"),
							className: `px-4 py-2 rounded-xl text-xs font-mono tracking-wider uppercase transition-all cursor-pointer ${activeTab === "fnol" ? "bg-[#111827] text-white shadow-xs font-bold" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"}`,
							children: "A : First Notice of Loss"
						}),
						/* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => setActiveTab("policy"),
							className: `px-4 py-2 rounded-xl text-xs font-mono tracking-wider uppercase transition-all cursor-pointer ${activeTab === "policy" ? "bg-[#111827] text-white shadow-xs font-bold" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"}`,
							children: "B : Policy Enquiry Assistant"
						}),
						/* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => setActiveTab("status"),
							className: `px-4 py-2 rounded-xl text-xs font-mono tracking-wider uppercase transition-all cursor-pointer ${activeTab === "status" ? "bg-[#111827] text-white shadow-xs font-bold" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"}`,
							children: "C : Claim-Status Lifecycle"
						}),
						/* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => setActiveTab("renewal"),
							className: `px-4 py-2 rounded-xl text-xs font-mono tracking-wider uppercase transition-all cursor-pointer ${activeTab === "renewal" ? "bg-[#111827] text-white shadow-xs font-bold" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"}`,
							children: "D : Renewal & Servicing"
						}),
						/* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => setActiveTab("escalation"),
							className: `px-4 py-2 rounded-xl text-xs font-mono tracking-wider uppercase transition-all cursor-pointer ${activeTab === "escalation" ? "bg-[#111827] text-white shadow-xs font-bold" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"}`,
							children: "E : Human Escalation Queue"
						})
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "pt-8",
					children: [
						activeTab === "fnol" && /* @__PURE__ */ jsxs("div", {
							className: "grid lg:grid-cols-12 gap-8 items-center bg-white p-8 sm:p-12 rounded-[32px] border border-slate-200/90 shadow-sm animate-in fade-in duration-200",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "lg:col-span-5 space-y-5",
								children: [
									/* @__PURE__ */ jsx(Badge, {
										variant: "outline",
										className: "text-[10px] font-mono uppercase bg-[#E6F6F7] text-[#087F8C] border-[#087F8C]/30",
										children: "Claims Intake Specialist"
									}),
									/* @__PURE__ */ jsx("h3", {
										className: "font-display text-2xl sm:text-3xl font-bold text-[#111827]",
										children: "First Notice of Loss: Structured Intake"
									}),
									/* @__PURE__ */ jsx("p", {
										className: "text-sm leading-relaxed text-[#475467]",
										children: "When a policyholder calls in distress after an incident, Anya gathers mandatory details patiently without missing critical regulatory fields."
									}),
									/* @__PURE__ */ jsxs("ul", {
										className: "space-y-2.5 text-xs text-slate-700",
										children: [
											/* @__PURE__ */ jsxs("li", {
												className: "flex items-center gap-2",
												children: [/* @__PURE__ */ jsx(CheckCircle2, { className: "size-4 text-[#087F8C] shrink-0" }), /* @__PURE__ */ jsx("span", { children: "Captures exact incident timestamp, location, and vehicle/property details" })]
											}),
											/* @__PURE__ */ jsxs("li", {
												className: "flex items-center gap-2",
												children: [/* @__PURE__ */ jsx(CheckCircle2, { className: "size-4 text-[#087F8C] shrink-0" }), /* @__PURE__ */ jsx("span", { children: "Identifies missing photos or third-party FIR requirements" })]
											}),
											/* @__PURE__ */ jsxs("li", {
												className: "flex items-center gap-2",
												children: [/* @__PURE__ */ jsx(CheckCircle2, { className: "size-4 text-[#087F8C] shrink-0" }), /* @__PURE__ */ jsx("span", { children: "Dispatches immediate SMS confirmation with document upload link" })]
											})
										]
									}),
									/* @__PURE__ */ jsx("div", {
										className: "pt-2",
										children: /* @__PURE__ */ jsx(Button, {
											asChild: true,
											size: "sm",
											className: "bg-[#087F8C] hover:bg-[#076C77] text-white text-xs font-mono rounded-xl",
											children: /* @__PURE__ */ jsx(Link, {
												to: "/claims",
												children: "OPEN CLAIMS INTAKE CONSOLE"
											})
										})
									})
								]
							}), /* @__PURE__ */ jsx("div", {
								className: "lg:col-span-7",
								children: /* @__PURE__ */ jsxs("div", {
									className: "rounded-2xl border border-slate-200 bg-[#FAF9F6] p-6 space-y-4 shadow-xs",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: "flex items-center justify-between border-b border-slate-200 pb-3",
											children: [/* @__PURE__ */ jsx("span", {
												className: "font-mono text-xs font-bold text-slate-900",
												children: "Draft FNOL Report #FNOL-2026-0418"
											}), /* @__PURE__ */ jsx(Badge, {
												variant: "outline",
												className: "text-[10px] font-mono text-amber-800 bg-amber-50 border-amber-300 font-semibold",
												children: "Awaiting Surveyor Assignment"
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "grid grid-cols-2 gap-3 text-xs",
											children: [/* @__PURE__ */ jsxs("div", {
												className: "bg-white p-3 rounded-xl border border-slate-100",
												children: [/* @__PURE__ */ jsx("span", {
													className: "text-[10px] font-mono text-slate-400 block uppercase",
													children: "Policy Number"
												}), /* @__PURE__ */ jsx("span", {
													className: "font-mono font-bold text-slate-900",
													children: "POL-MOT-2024-8842"
												})]
											}), /* @__PURE__ */ jsxs("div", {
												className: "bg-white p-3 rounded-xl border border-slate-100",
												children: [/* @__PURE__ */ jsx("span", {
													className: "text-[10px] font-mono text-slate-400 block uppercase",
													children: "Incident Timestamp"
												}), /* @__PURE__ */ jsx("span", {
													className: "font-mono text-slate-800",
													children: "18 Oct, 08:45 AM IST"
												})]
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "bg-white p-3 rounded-xl border border-slate-100 text-xs space-y-1",
											children: [/* @__PURE__ */ jsx("span", {
												className: "text-[10px] font-mono text-slate-400 block uppercase",
												children: "Reported Damage Specifics"
											}), /* @__PURE__ */ jsx("p", {
												className: "text-slate-800 leading-relaxed text-[11.5px]",
												children: "\"Front bumper and right headlight assembly damaged after vehicle scraped barricade on Western Express Highway. No third-party injury reported.\""
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "grid grid-cols-2 gap-3 text-xs",
											children: [/* @__PURE__ */ jsxs("div", {
												className: "bg-white p-3 rounded-xl border border-slate-100",
												children: [/* @__PURE__ */ jsx("span", {
													className: "text-[10px] font-mono text-slate-400 block uppercase",
													children: "Required Documents"
												}), /* @__PURE__ */ jsx("span", {
													className: "text-slate-700 text-[11px] block mt-0.5",
													children: "DL, RC Copy, Photos (4 required)"
												})]
											}), /* @__PURE__ */ jsxs("div", {
												className: "bg-white p-3 rounded-xl border border-slate-100",
												children: [/* @__PURE__ */ jsx("span", {
													className: "text-[10px] font-mono text-slate-400 block uppercase",
													children: "Follow-up Action"
												}), /* @__PURE__ */ jsx("span", {
													className: "text-emerald-700 font-semibold text-[11px] block mt-0.5",
													children: "SMS upload link sent"
												})]
											})]
										})
									]
								})
							})]
						}),
						activeTab === "policy" && /* @__PURE__ */ jsxs("div", {
							className: "grid lg:grid-cols-12 gap-8 items-center bg-white p-8 sm:p-12 rounded-[32px] border border-slate-200/90 shadow-sm animate-in fade-in duration-200",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "lg:col-span-5 space-y-5",
								children: [
									/* @__PURE__ */ jsx(Badge, {
										variant: "outline",
										className: "text-[10px] font-mono uppercase bg-[#E6F6F7] text-[#087F8C] border-[#087F8C]/30",
										children: "Grounded Truth"
									}),
									/* @__PURE__ */ jsx("h3", {
										className: "font-display text-2xl sm:text-3xl font-bold text-[#111827]",
										children: "Policy Enquiry with Source Inspection"
									}),
									/* @__PURE__ */ jsx("p", {
										className: "text-sm leading-relaxed text-[#475467]",
										children: "Never hallucinate coverage clauses. Answers cite exact document sections from your authorized policy schedule and terms wording."
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2",
										children: [/* @__PURE__ */ jsx(AlertTriangle, { className: "size-4 text-amber-600 shrink-0 mt-0.5" }), /* @__PURE__ */ jsx("span", { children: "If a source cannot be verified with certainty, the answer is flagged as unverified and routed for staff review." })]
									}),
									/* @__PURE__ */ jsx("div", {
										className: "pt-2",
										children: /* @__PURE__ */ jsx(Button, {
											asChild: true,
											size: "sm",
											variant: "outline",
											className: "border-slate-300 text-xs font-mono rounded-xl",
											children: /* @__PURE__ */ jsx(Link, {
												to: "/policies",
												children: "EXPLORE POLICY PORTFOLIO"
											})
										})
									})
								]
							}), /* @__PURE__ */ jsx("div", {
								className: "lg:col-span-7",
								children: /* @__PURE__ */ jsxs("div", {
									className: "rounded-2xl border border-slate-200 bg-[#FAF9F6] p-6 space-y-4 shadow-xs",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: "flex items-center justify-between border-b border-slate-200 pb-3",
											children: [/* @__PURE__ */ jsxs("span", {
												className: "font-mono text-xs font-bold text-slate-900 flex items-center gap-1.5",
												children: [/* @__PURE__ */ jsx(Database, { className: "size-3.5 text-[#087F8C]" }), " Verified Source Inspection"]
											}), /* @__PURE__ */ jsx(Badge, {
												variant: "outline",
												className: "text-[10px] font-mono text-emerald-800 bg-emerald-50 border-emerald-300",
												children: "Grounded Citation"
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2",
											children: [/* @__PURE__ */ jsx("span", {
												className: "font-mono text-[10px] text-slate-500 uppercase tracking-wider block",
												children: "Policyholder Query"
											}), /* @__PURE__ */ jsx("p", {
												className: "text-slate-900 font-semibold text-[12px]",
												children: "\"Does my family health policy cover robotic surgery procedures?\""
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "bg-[#E6F6F7]/60 p-4 rounded-xl border border-[#087F8C]/20 text-xs space-y-2",
											children: [/* @__PURE__ */ jsxs("div", {
												className: "flex items-center justify-between",
												children: [/* @__PURE__ */ jsx("span", {
													className: "font-mono text-[10px] text-[#087F8C] uppercase tracking-wider font-bold",
													children: "Authorised Document Citation: Section 4.2.B"
												}), /* @__PURE__ */ jsx("span", {
													className: "font-mono text-[10px] text-slate-500",
													children: "Health Master Wording v2024"
												})]
											}), /* @__PURE__ */ jsx("p", {
												className: "text-slate-800 text-[11.5px] leading-relaxed italic",
												children: "\"Robotic surgery is covered up to 50% of the sum insured, subject to prior pre-authorization and network hospital admission.\""
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "bg-white p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between",
											children: [/* @__PURE__ */ jsx("span", {
												className: "text-slate-600 font-medium text-[11px]",
												children: "Assistant Response:"
											}), /* @__PURE__ */ jsxs("span", {
												className: "text-emerald-700 font-semibold text-[11px] flex items-center gap-1",
												children: [/* @__PURE__ */ jsx(CheckCircle2, { className: "size-3" }), " Exact terms conveyed to caller"]
											})]
										})
									]
								})
							})]
						}),
						activeTab === "status" && /* @__PURE__ */ jsxs("div", {
							className: "bg-white p-8 sm:p-12 rounded-[32px] border border-slate-200/90 shadow-sm animate-in fade-in duration-200 space-y-8",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "max-w-2xl",
								children: [
									/* @__PURE__ */ jsx(Badge, {
										variant: "outline",
										className: "text-[10px] font-mono uppercase bg-[#E6F6F7] text-[#087F8C] border-[#087F8C]/30 mb-2",
										children: "Transparent Progress Tracking"
									}),
									/* @__PURE__ */ jsx("h3", {
										className: "font-display text-2xl sm:text-3xl font-bold text-[#111827]",
										children: "The 6-Stage Claims Lifecycle"
									}),
									/* @__PURE__ */ jsx("p", {
										className: "text-sm text-[#475467] mt-2",
										children: "Policyholders get real status milestones. The system never gives vague \"in-process\" answers when specific workflow stages exist."
									})
								]
							}), /* @__PURE__ */ jsx("div", {
								className: "grid grid-cols-2 md:grid-cols-6 gap-3",
								children: CLAIM_LIFECYCLE_STAGES.map((s, idx) => /* @__PURE__ */ jsxs("div", {
									className: `rounded-2xl border p-4 text-xs flex flex-col justify-between ${s.status === "completed" ? "bg-emerald-50/60 border-emerald-200 text-emerald-950" : s.status === "active" ? "bg-[#172033] text-white border-[#10A6AE] shadow-md" : "bg-slate-50 border-slate-200 text-slate-500 opacity-60"}`,
									children: [/* @__PURE__ */ jsxs("div", { children: [
										/* @__PURE__ */ jsxs("span", {
											className: "font-mono text-[10px] font-bold block mb-1",
											children: ["STAGE 0", idx + 1]
										}),
										/* @__PURE__ */ jsx("h4", {
											className: "font-display font-bold text-sm leading-tight",
											children: s.label
										}),
										/* @__PURE__ */ jsx("p", {
											className: "text-[11px] mt-1.5 leading-snug",
											children: s.note
										})
									] }), /* @__PURE__ */ jsx("span", {
										className: "font-mono text-[10px] mt-4 block opacity-80",
										children: s.date
									})]
								}, s.label))
							})]
						}),
						activeTab === "renewal" && /* @__PURE__ */ jsxs("div", {
							className: "grid lg:grid-cols-12 gap-8 items-center bg-white p-8 sm:p-12 rounded-[32px] border border-slate-200/90 shadow-sm animate-in fade-in duration-200",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "lg:col-span-5 space-y-5",
								children: [
									/* @__PURE__ */ jsx(Badge, {
										variant: "outline",
										className: "text-[10px] font-mono uppercase bg-[#E6F6F7] text-[#087F8C] border-[#087F8C]/30",
										children: "Policy Servicing"
									}),
									/* @__PURE__ */ jsx("h3", {
										className: "font-display text-2xl sm:text-3xl font-bold text-[#111827]",
										children: "Renewals & Servicing Without Unauthorized Binding"
									}),
									/* @__PURE__ */ jsx("p", {
										className: "text-sm leading-relaxed text-[#475467]",
										children: "The assistant handles renewal quote queries, explains NCB (No Claim Bonus) tiers, and collects endorsement requests without unauthorized policy modifications."
									}),
									/* @__PURE__ */ jsx("p", {
										className: "text-xs text-slate-500 leading-relaxed",
										children: "High-consequence modifications (such as changing nominees, reducing deductibles, or updating insured address) are queued for licensed agent review."
									}),
									/* @__PURE__ */ jsx("div", {
										className: "pt-2",
										children: /* @__PURE__ */ jsx(Button, {
											asChild: true,
											size: "sm",
											className: "bg-[#111827] text-white text-xs font-mono rounded-xl",
											children: /* @__PURE__ */ jsx(Link, {
												to: "/change-requests",
												children: "VIEW CHANGE REQUEST QUEUE"
											})
										})
									})
								]
							}), /* @__PURE__ */ jsx("div", {
								className: "lg:col-span-7",
								children: /* @__PURE__ */ jsxs("div", {
									className: "rounded-2xl border border-slate-200 bg-[#FAF9F6] p-6 space-y-3 shadow-xs text-xs",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: "flex items-center justify-between border-b border-slate-200 pb-2.5",
											children: [/* @__PURE__ */ jsx("span", {
												className: "font-mono font-bold text-slate-900",
												children: "Renewal Notice: POL-CAR-7719"
											}), /* @__PURE__ */ jsx(Badge, {
												variant: "outline",
												className: "text-[10px] font-mono text-[#087F8C] bg-[#E6F6F7]",
												children: "Expiring in 14 Days"
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "grid grid-cols-2 gap-3",
											children: [/* @__PURE__ */ jsxs("div", {
												className: "bg-white p-3 rounded-xl border border-slate-100",
												children: [/* @__PURE__ */ jsx("span", {
													className: "text-[10px] font-mono text-slate-400 block uppercase",
													children: "Existing Sum Insured"
												}), /* @__PURE__ */ jsx("span", {
													className: "font-mono font-bold text-slate-900 text-sm",
													children: "₹8,50,000"
												})]
											}), /* @__PURE__ */ jsxs("div", {
												className: "bg-white p-3 rounded-xl border border-slate-100",
												children: [/* @__PURE__ */ jsx("span", {
													className: "text-[10px] font-mono text-slate-400 block uppercase",
													children: "Applicable NCB"
												}), /* @__PURE__ */ jsx("span", {
													className: "font-mono font-bold text-emerald-700 text-sm",
													children: "35% Zero Claims"
												})]
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "bg-white p-3.5 rounded-xl border border-slate-100",
											children: [/* @__PURE__ */ jsx("span", {
												className: "text-[10px] font-mono text-slate-400 block uppercase mb-1",
												children: "Captured Customer Intent"
											}), /* @__PURE__ */ jsx("p", {
												className: "text-slate-800 text-[11px] leading-relaxed",
												children: "Policyholder requested renewal payment link with zero-dep rider retained. Instant payment link dispatched via verified WhatsApp & SMS."
											})]
										})
									]
								})
							})]
						}),
						activeTab === "escalation" && /* @__PURE__ */ jsxs("div", {
							className: "grid lg:grid-cols-12 gap-8 items-center bg-white p-8 sm:p-12 rounded-[32px] border border-slate-200/90 shadow-sm animate-in fade-in duration-200",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "lg:col-span-5 space-y-5",
								children: [
									/* @__PURE__ */ jsx(Badge, {
										variant: "outline",
										className: "text-[10px] font-mono uppercase bg-amber-50 text-amber-800 border-amber-300",
										children: "Supervisor Oversight"
									}),
									/* @__PURE__ */ jsx("h3", {
										className: "font-display text-2xl sm:text-3xl font-bold text-[#111827]",
										children: "Seamless Human Adjuster Handoff"
									}),
									/* @__PURE__ */ jsx("p", {
										className: "text-sm leading-relaxed text-[#475467]",
										children: "When a caller is distressed or a dispute arises, the call transfers immediately to a human claims specialist with full context pre-populated."
									}),
									/* @__PURE__ */ jsx("p", {
										className: "text-xs text-slate-600",
										children: "The human adjuster never needs to ask the customer to repeat their name, policy number, or story."
									}),
									/* @__PURE__ */ jsx("div", {
										className: "pt-2",
										children: /* @__PURE__ */ jsx(Button, {
											asChild: true,
											size: "sm",
											className: "bg-[#087F8C] hover:bg-[#076C77] text-white text-xs font-mono rounded-xl",
											children: /* @__PURE__ */ jsx(Link, {
												to: "/change-requests",
												children: "OPEN COMPLIANCE WORKSPACE"
											})
										})
									})
								]
							}), /* @__PURE__ */ jsx("div", {
								className: "lg:col-span-7",
								children: /* @__PURE__ */ jsxs("div", {
									className: "rounded-2xl border border-slate-200 bg-[#FAF9F6] p-6 space-y-3 shadow-xs text-xs",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: "flex items-center justify-between border-b border-slate-200 pb-2.5",
											children: [/* @__PURE__ */ jsx("span", {
												className: "font-mono font-bold text-slate-900",
												children: "Live Handoff Packet #ESC-901"
											}), /* @__PURE__ */ jsx(Badge, {
												variant: "outline",
												className: "text-[10px] font-mono text-rose-800 bg-rose-50 border-rose-200 font-bold",
												children: "HIGH URGENCY"
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "grid grid-cols-2 gap-3",
											children: [/* @__PURE__ */ jsxs("div", {
												className: "bg-white p-3 rounded-xl border border-slate-100",
												children: [/* @__PURE__ */ jsx("span", {
													className: "text-[10px] font-mono text-slate-400 block uppercase",
													children: "Policyholder"
												}), /* @__PURE__ */ jsx("span", {
													className: "font-bold text-slate-900",
													children: "Sunita Mukherjee"
												})]
											}), /* @__PURE__ */ jsxs("div", {
												className: "bg-white p-3 rounded-xl border border-slate-100",
												children: [/* @__PURE__ */ jsx("span", {
													className: "text-[10px] font-mono text-slate-400 block uppercase",
													children: "Policy Reference"
												}), /* @__PURE__ */ jsx("span", {
													className: "font-mono text-slate-800",
													children: "POL-HLT-2023-4109"
												})]
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "bg-amber-50/70 p-3 rounded-xl border border-amber-200 text-xs",
											children: [/* @__PURE__ */ jsx("span", {
												className: "font-mono text-[10px] text-amber-800 uppercase tracking-wider block font-bold mb-1",
												children: "Reason for Escalation"
											}), /* @__PURE__ */ jsx("p", {
												className: "text-amber-950 text-[11.5px] leading-relaxed",
												children: "Hospital denial of cashless admission at network facility. Caller requires emergency intervention from Senior TPA Specialist."
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "bg-white p-3 rounded-xl border border-slate-100 text-[11px] text-slate-600 flex items-center justify-between",
											children: [/* @__PURE__ */ jsxs("span", { children: ["Assigned Adjuster: ", /* @__PURE__ */ jsx("strong", {
												className: "text-slate-900",
												children: "Ravi Shankar (TPA Desk)"
											})] }), /* @__PURE__ */ jsx("span", {
												className: "text-emerald-700 font-semibold",
												children: "Live Call Active"
											})]
										})
									]
								})
							})]
						})
					]
				})
			]
		})
	});
}
//#endregion
//#region src/components/ui/halftone-wordmark-footer.tsx
var PRESETS = {
	night: {
		background: "#0c0c0b",
		ink: "#e9e4da",
		warm: "#e9762b"
	},
	paper: {
		background: "#efebe3",
		ink: "#17150f",
		warm: "#c2361c"
	},
	ember: {
		background: "#160a06",
		ink: "#f2c48c",
		warm: "#ff5a1f"
	},
	cobalt: {
		background: "#0d1b4d",
		ink: "#dfe7ff",
		warm: "#ffcd3c"
	}
};
var DEFAULT_COLUMNS = [
	{
		title: "Work",
		links: [
			{ label: "Index" },
			{ label: "Archive" },
			{ label: "Journal" }
		]
	},
	{
		title: "Studio",
		links: [
			{ label: "About" },
			{ label: "Process" },
			{ label: "Careers" }
		]
	},
	{
		title: "Contact",
		links: [{ label: "hello@halden.co" }, { label: "+47 22 00 41 00" }]
	}
];
var SANS_STACK = "\"Inter Tight\", \"Inter Variable\", \"Inter\", \"Helvetica Neue\", Arial, system-ui, sans-serif";
var MONO_STACK = "\"JetBrains Mono\", \"SF Mono\", ui-monospace, Menlo, Consolas, monospace";
/** Hex → [r, g, b] in 0–255, or null for anything that isn't #rgb / #rrggbb. */
function hwfHex(hex) {
	const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || "").trim());
	if (!m || !m[1]) return null;
	const raw = m[1];
	const h = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
	return [
		parseInt(h.slice(0, 2), 16),
		parseInt(h.slice(2, 4), 16),
		parseInt(h.slice(4, 6), 16)
	];
}
/** Dot radius for a cell coverage in [0, 1]: area-true, so tone stays even. */
function hwfRadius(coverage, gap) {
	return Math.sqrt(coverage < 0 ? 0 : coverage > 1 ? 1 : coverage) * gap * .56;
}
/**
* One step of a dot's spring back to home, plus the push from a pointer at
* (px, py) within radius r. Returns [x, y, vx, vy]. Away from the pointer a
* displaced dot always heads home and comes to rest.
*/
function hwfStep(x, y, vx, vy, hx, hy, px, py, r) {
	const dx = x - px;
	const dy = y - py;
	const d2 = dx * dx + dy * dy;
	if (r > 0 && d2 < r * r) {
		const d = Math.sqrt(d2) + .001;
		const f = (1 - d / r) * 2.6;
		vx += dx / d * f;
		vy += dy / d * f;
	}
	vx = (vx + (hx - x) * .05) * .84;
	vy = (vy + (hy - y) * .05) * .84;
	return [
		x + vx,
		y + vy,
		vx,
		vy
	];
}
/** How warm a dot is drawn: 0 at home, 1 once it is `span` px or more away. */
function hwfWarmth(x, y, hx, hy, span) {
	const d = Math.hypot(x - hx, y - hy);
	return span > 0 ? Math.min(1, d / span) : 0;
}
/** Font size that sets `measured` (width at 100px) to fill `width` exactly. */
function hwfFitSize(measured, width) {
	return measured > 0 ? width / measured * 100 : 0;
}
var HWF_CSS = `
.hwf-root {
  position: relative; width: 100%; overflow: hidden; isolation: isolate;
  background: var(--hwf-bg); color: var(--hwf-ink); -webkit-font-smoothing: antialiased;
}
.hwf-root canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; max-width: none; }
.hwf-top {
  position: relative; z-index: 1; display: grid; grid-template-columns: minmax(0, 1.25fr) repeat(3, minmax(0, 1fr));
  gap: 24px; padding: clamp(22px, 3.4vw, 40px) clamp(20px, 3.4vw, 44px) 0;
  font-family: var(--hwf-mono); font-size: 10.5px; letter-spacing: .18em; text-transform: uppercase; line-height: 1.75;
}
.hwf-brand strong { display: block; font-weight: 500; }
.hwf-brand span { opacity: .45; }
.hwf-col h3 { margin: 0; font: inherit; opacity: .4; font-weight: 500; }
.hwf-col ul { list-style: none; margin: 0; padding: 0; }
.hwf-col a, .hwf-up {
  color: inherit; text-decoration: none; opacity: .78; background: none; border: 0; padding: 0;
  font: inherit; letter-spacing: inherit; text-transform: inherit; cursor: pointer;
  background-image: linear-gradient(currentColor, currentColor); background-size: 0% 1px;
  background-repeat: no-repeat; background-position: 0 100%; transition: opacity .25s ease, background-size .35s cubic-bezier(.2,.7,.1,1);
}
.hwf-col a:hover, .hwf-up:hover { opacity: 1; background-size: 100% 1px; }
.hwf-col a:focus-visible, .hwf-up:focus-visible { outline: 1px solid currentColor; outline-offset: 3px; opacity: 1; }
.hwf-rule {
  position: relative; z-index: 1; display: flex; justify-content: flex-end; align-items: center; gap: 16px;
  margin: clamp(18px, 2.6vw, 30px) clamp(20px, 3.4vw, 44px) 0; padding-top: 12px;
  border-top: 0.5px solid color-mix(in srgb, var(--hwf-ink) 16%, transparent);
  font-family: var(--hwf-mono); font-size: 10.5px; letter-spacing: .18em; text-transform: uppercase;
}
.hwf-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (max-width: 720px) {
  .hwf-top { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); row-gap: 18px; }
  .hwf-brand { grid-column: 1 / -1; }
}
@media (prefers-reduced-motion: reduce) {
  .hwf-col a, .hwf-up { transition: none; }
}
`;
function HalftoneWordmarkFooter({ wordmark = "insurcall", label = "InsurCall Platform", meta = "2026 : Autonomous AI Voice Employee", columns = DEFAULT_COLUMNS, backToTop = true, preset = "paper", palette, dotGap = 6, radius = 80, crop = .2, grain = .5, interactive = true, fontFamily = SANS_STACK, fontWeight = 800, monoFamily = MONO_STACK, height = "480px", className = "" }) {
	const colors = {
		...PRESETS[preset] || PRESETS.paper,
		...palette || {}
	};
	const rootRef = React.useRef(null);
	const canvasRef = React.useRef(null);
	const opts = React.useRef({
		colors,
		dotGap,
		radius,
		crop,
		grain,
		interactive,
		fontFamily,
		fontWeight,
		wordmark
	});
	opts.current = {
		colors,
		dotGap,
		radius,
		crop,
		grain,
		interactive,
		fontFamily,
		fontWeight,
		wordmark
	};
	const key = [
		wordmark,
		dotGap,
		crop,
		grain,
		fontFamily,
		fontWeight,
		colors.background,
		colors.ink,
		colors.warm
	].join("|");
	React.useEffect(() => {
		const root = rootRef.current;
		const canvas = canvasRef.current;
		if (!root || !canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		let w = 0;
		let h = 0;
		let dpr = 1;
		let px = -1e5;
		let py = -1e5;
		let raf = 0;
		let visible = true;
		let awake = true;
		let ring = {
			x: 0,
			y: 0,
			t: -1
		};
		let dots = /* @__PURE__ */ new Float32Array(0);
		let count = 0;
		let grainTile = null;
		const ink = hwfHex(opts.current.colors.ink) || [
			23,
			32,
			51
		];
		const warm = hwfHex(opts.current.colors.warm) || [
			8,
			126,
			139
		];
		const inkR = ink[0] ?? 23;
		const inkG = ink[1] ?? 32;
		const inkB = ink[2] ?? 51;
		const warmR = warm[0] ?? 8;
		const warmG = warm[1] ?? 126;
		const warmB = warm[2] ?? 139;
		const layout = () => {
			const o = opts.current;
			const rect = root.getBoundingClientRect();
			w = Math.max(1, Math.round(rect.width));
			h = Math.max(1, Math.round(rect.height));
			dpr = Math.min(window.devicePixelRatio || 1, 2);
			canvas.width = Math.round(w * dpr);
			canvas.height = Math.round(h * dpr);
			const mask = document.createElement("canvas");
			mask.width = w;
			mask.height = h;
			const m = mask.getContext("2d", { willReadFrequently: true });
			if (!m) return;
			m.font = o.fontWeight + " 100px " + o.fontFamily;
			const word = o.wordmark || " ";
			const fit = hwfFitSize(m.measureText(word).width, w * 1.02);
			m.font = o.fontWeight + " " + fit + "px " + o.fontFamily;
			const box = m.measureText(word);
			const cap = box.actualBoundingBoxAscent || fit * .72;
			const c = Math.max(0, Math.min(.6, o.crop));
			m.fillStyle = "#000";
			m.textBaseline = "alphabetic";
			m.fillText(word, (w - box.width) / 2, h + cap * c);
			const img = m.getImageData(0, 0, w, h).data;
			const gap = Math.max(3, o.dotGap);
			const cols = Math.ceil(w / gap);
			const rows = Math.ceil(h / gap);
			const tmp = [];
			for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
				let sum = 0;
				for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) {
					const x = Math.min(w - 1, Math.floor(gx * gap + (sx + .5) * gap / 3));
					const y = Math.min(h - 1, Math.floor(gy * gap + (sy + .5) * gap / 3));
					sum += img[(y * w + x) * 4 + 3] ?? 0;
				}
				const cov = sum / 2295;
				if (cov < .06) continue;
				const hx = gx * gap + gap / 2;
				const hy = gy * gap + gap / 2;
				tmp.push(hx, hy, 0, 0, hx, hy, hwfRadius(cov, gap));
			}
			dots = new Float32Array(tmp);
			count = tmp.length / 7;
			grainTile = document.createElement("canvas");
			grainTile.width = 256;
			grainTile.height = 256;
			const g = grainTile.getContext("2d");
			if (g) {
				const id = g.createImageData(256, 256);
				for (let i = 0; i < id.data.length; i += 4) {
					const v = Math.random() * 255;
					id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
					id.data[i + 3] = Math.random() < .5 ? 0 : 255;
				}
				g.putImageData(id, 0, 0);
			}
			awake = true;
		};
		const draw = (now) => {
			const o = opts.current;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.fillStyle = o.colors.background;
			ctx.fillRect(0, 0, w, h);
			const r = o.interactive && !reduced ? Math.max(0, o.radius) : 0;
			const ringAge = ring.t < 0 ? 1e9 : now - ring.t;
			const ringR = ringAge * .9;
			let moving = false;
			for (let i = 0; i < count; i++) {
				const j = i * 7;
				let x = dots[j] ?? 0;
				let y = dots[j + 1] ?? 0;
				let vx = dots[j + 2] ?? 0;
				let vy = dots[j + 3] ?? 0;
				const hx = dots[j + 4] ?? 0;
				const hy = dots[j + 5] ?? 0;
				const dotRadius = dots[j + 6] ?? 0;
				if (!reduced) {
					if (ringAge < 900) {
						const dx = hx - ring.x;
						const dy = hy - ring.y;
						const d = Math.sqrt(dx * dx + dy * dy) + .001;
						const band = 1 - Math.min(1, Math.abs(d - ringR) / 26);
						if (band > 0) {
							const f = band * 3.2 * (1 - ringAge / 900);
							vx += dx / d * f;
							vy += dy / d * f;
						}
					}
					const s = hwfStep(x, y, vx, vy, hx, hy, px, py, r);
					x = s[0] ?? hx;
					y = s[1] ?? hy;
					vx = s[2] ?? 0;
					vy = s[3] ?? 0;
					if (Math.abs(vx) + Math.abs(vy) > .02 || Math.abs(x - hx) + Math.abs(y - hy) > .05) moving = true;
					else {
						x = hx;
						y = hy;
						vx = 0;
						vy = 0;
					}
					dots[j] = x;
					dots[j + 1] = y;
					dots[j + 2] = vx;
					dots[j + 3] = vy;
				}
				const k = hwfWarmth(x, y, hx, hy, 28);
				ctx.fillStyle = k > .02 ? "rgb(" + Math.round(inkR + (warmR - inkR) * k) + "," + Math.round(inkG + (warmG - inkG) * k) + "," + Math.round(inkB + (warmB - inkB) * k) + ")" : o.colors.ink;
				ctx.beginPath();
				ctx.arc(x, y, dotRadius, 0, 6.2832);
				ctx.fill();
			}
			if (grainTile && o.grain > 0) {
				ctx.globalAlpha = Math.min(1, o.grain) * .09;
				ctx.globalCompositeOperation = "overlay";
				const pattern = ctx.createPattern(grainTile, "repeat");
				if (pattern) {
					ctx.fillStyle = pattern;
					ctx.fillRect(0, 0, w, h);
				}
				ctx.globalAlpha = 1;
				ctx.globalCompositeOperation = "source-over";
			}
			awake = moving || ringAge < 900 || px > -1e4;
		};
		const loop = (now) => {
			raf = 0;
			if (!visible) return;
			draw(now);
			if (awake) raf = requestAnimationFrame(loop);
		};
		const wake = () => {
			awake = true;
			if (!raf && visible) raf = requestAnimationFrame(loop);
		};
		const toLocal = (e) => {
			const b = canvas.getBoundingClientRect();
			return [e.clientX - b.left, e.clientY - b.top];
		};
		const onMove = (e) => {
			if (!opts.current.interactive) return;
			const p = toLocal(e);
			px = p[0] ?? -1e5;
			py = p[1] ?? -1e5;
			wake();
		};
		const onLeave = () => {
			px = -1e5;
			py = -1e5;
			wake();
		};
		const onDown = (e) => {
			if (!opts.current.interactive || reduced) return;
			if (e.target.closest("a,button")) return;
			const p = toLocal(e);
			ring = {
				x: p[0] ?? 0,
				y: p[1] ?? 0,
				t: performance.now()
			};
			wake();
		};
		layout();
		draw(performance.now());
		wake();
		root.addEventListener("pointermove", onMove);
		root.addEventListener("pointerleave", onLeave);
		root.addEventListener("pointerdown", onDown);
		const ro = new ResizeObserver(() => {
			layout();
			wake();
		});
		ro.observe(root);
		const io = new IntersectionObserver((entries) => {
			visible = entries[0] ? entries[0].isIntersecting : true;
			if (visible) wake();
		});
		io.observe(root);
		let alive = true;
		if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => {
			if (!alive) return;
			layout();
			wake();
		});
		return () => {
			alive = false;
			cancelAnimationFrame(raf);
			ro.disconnect();
			io.disconnect();
			root.removeEventListener("pointermove", onMove);
			root.removeEventListener("pointerleave", onLeave);
			root.removeEventListener("pointerdown", onDown);
		};
	}, [key]);
	const toTop = () => {
		window.scrollTo({
			top: 0,
			behavior: "smooth"
		});
	};
	return /* @__PURE__ */ jsxs("footer", {
		ref: rootRef,
		className: "hwf-root " + className,
		style: {
			height,
			"--hwf-bg": colors.background,
			"--hwf-ink": colors.ink,
			"--hwf-mono": monoFamily
		},
		children: [
			/* @__PURE__ */ jsx("style", { children: HWF_CSS }),
			/* @__PURE__ */ jsx("canvas", {
				ref: canvasRef,
				"aria-hidden": "true"
			}),
			/* @__PURE__ */ jsx("span", {
				className: "hwf-sr",
				children: wordmark
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "hwf-top",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "hwf-brand",
					children: [/* @__PURE__ */ jsx("strong", { children: label }), /* @__PURE__ */ jsx("span", { children: meta })]
				}), columns.map((col) => /* @__PURE__ */ jsxs("nav", {
					className: "hwf-col",
					"aria-label": col.title,
					children: [/* @__PURE__ */ jsx("h3", { children: col.title }), /* @__PURE__ */ jsx("ul", { children: col.links.map((l) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", {
						href: l.href || "#",
						children: l.label
					}) }, l.label)) })]
				}, col.title))]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "hwf-rule",
				children: backToTop ? /* @__PURE__ */ jsx("button", {
					type: "button",
					className: "hwf-up",
					onClick: toTop,
					children: "Back to top ↑"
				}) : null
			})
		]
	});
}
//#endregion
//#region src/routes/index.tsx?tsr-split=component
var INSURANCE_FOOTER_COLUMNS = [
	{
		title: "Operations",
		links: [
			{
				label: "Claims Intake & FNOL",
				href: "/claims"
			},
			{
				label: "Policy Portfolio",
				href: "/policies"
			},
			{
				label: "Staff Approvals Queue",
				href: "/change-requests"
			},
			{
				label: "Audit & Compliance Records",
				href: "/audit"
			}
		]
	},
	{
		title: "Platform",
		links: [
			{
				label: "Insurance Voice Engine",
				href: "/voice"
			},
			{
				label: "Operations Dashboard",
				href: "/dashboard"
			},
			{
				label: "Assistant Studio",
				href: "/agent"
			},
			{
				label: "Policy Knowledge Store",
				href: "/train"
			}
		]
	},
	{
		title: "Carrier Portal",
		links: [
			{
				label: "Guided Onboarding",
				href: "/onboarding"
			},
			{
				label: "Tenant Settings",
				href: "/settings"
			},
			{
				label: "Data Governance Policy",
				href: "#"
			},
			{
				label: "Terms of Service",
				href: "#"
			}
		]
	}
];
function LandingPage() {
	const [showAuth, setShowAuth] = useState(false);
	useEffect(() => {
		if (typeof window !== "undefined" && window.location.search.includes("auth=true")) setShowAuth(true);
	}, []);
	return /* @__PURE__ */ jsxs("div", {
		className: "min-h-screen bg-[#FAF9F6] text-[#111827] flex flex-col justify-between selection:bg-[#087F8C]/20 font-sans",
		children: [
			/* @__PURE__ */ jsx(FloatingNavbar, { onOpenAuth: () => setShowAuth(true) }),
			/* @__PURE__ */ jsxs("main", {
				className: "flex-1",
				children: [
					/* @__PURE__ */ jsxs("section", {
						className: "relative mx-auto grid max-w-7xl gap-12 px-6 pb-16 pt-28 sm:pt-36 lg:grid-cols-12 lg:items-center",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "lg:col-span-7 space-y-6",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "inline-flex items-center gap-2 rounded-full border border-[#087F8C]/25 bg-[#E6F6F7] px-3.5 py-1 text-xs font-semibold text-[#087F8C]",
									children: [/* @__PURE__ */ jsx(ShieldCheck, { className: "size-3.5" }), /* @__PURE__ */ jsx("span", { children: "InsurTech AI Platform : Claims Intake & Policy Servicing" })]
								}),
								/* @__PURE__ */ jsx("h1", {
									className: "font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-[#111827] leading-[1.12]",
									children: "Every insurance call deserves a clear next step."
								}),
								/* @__PURE__ */ jsx("p", {
									className: "text-lg sm:text-xl font-medium text-[#172033] leading-snug",
									children: "From policy questions to first notice of loss, bring every conversation into a workflow your team can follow."
								}),
								/* @__PURE__ */ jsx("p", {
									className: "text-sm sm:text-base text-[#475467] leading-relaxed max-w-2xl",
									children: "InsurCall helps insurance teams understand policyholder enquiries, collect relevant information, retrieve authorised policy details, and organise follow-up for human review."
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "flex flex-wrap items-center gap-4 pt-2",
									children: [/* @__PURE__ */ jsx(Button, {
										asChild: true,
										size: "lg",
										className: "bg-[#087F8C] hover:bg-[#076C77] text-white font-semibold text-sm h-12 px-7 rounded-xl shadow-xs transition-all active:scale-95",
										children: /* @__PURE__ */ jsxs(Link, {
											to: "/voice",
											children: [/* @__PURE__ */ jsx(PhoneCall, { className: "size-4 mr-2" }), "Experience the insurance call demo"]
										})
									}), /* @__PURE__ */ jsx(Button, {
										asChild: true,
										size: "lg",
										variant: "outline",
										className: "border-slate-200 bg-white hover:bg-slate-50 text-[#111827] text-sm h-12 px-6 rounded-xl font-medium",
										children: /* @__PURE__ */ jsxs("a", {
											href: "#claims-workflow",
											children: ["Explore the claims workflow", /* @__PURE__ */ jsx(ArrowRight, { className: "size-4 ml-2" })]
										})
									})]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-200 pt-8 mt-6",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: "bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs",
											children: [
												/* @__PURE__ */ jsx("span", {
													className: "font-mono text-[10px] text-[#087F8C] uppercase font-bold tracking-wider block",
													children: "Capability 01"
												}),
												/* @__PURE__ */ jsx("h4", {
													className: "font-display text-sm font-bold text-slate-900 mt-1",
													children: "Policy Enquiries"
												}),
												/* @__PURE__ */ jsx("p", {
													className: "text-xs text-slate-500 mt-1 leading-relaxed",
													children: "Authorised coverage lookups, sum insured limits, and hospital network checks."
												})
											]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs",
											children: [
												/* @__PURE__ */ jsx("span", {
													className: "font-mono text-[10px] text-[#087F8C] uppercase font-bold tracking-wider block",
													children: "Capability 02"
												}),
												/* @__PURE__ */ jsx("h4", {
													className: "font-display text-sm font-bold text-slate-900 mt-1",
													children: "Claims Intake (FNOL)"
												}),
												/* @__PURE__ */ jsx("p", {
													className: "text-xs text-slate-500 mt-1 leading-relaxed",
													children: "First notice of loss capture, accident reports, and surveyor assignment queuing."
												})
											]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs",
											children: [
												/* @__PURE__ */ jsx("span", {
													className: "font-mono text-[10px] text-[#087F8C] uppercase font-bold tracking-wider block",
													children: "Capability 03"
												}),
												/* @__PURE__ */ jsx("h4", {
													className: "font-display text-sm font-bold text-slate-900 mt-1",
													children: "Human-Reviewed Actions"
												}),
												/* @__PURE__ */ jsx("p", {
													className: "text-xs text-slate-500 mt-1 leading-relaxed",
													children: "Mandatory sign-off for payouts, endorsements, and coverage disputes."
												})
											]
										})
									]
								})
							]
						}), /* @__PURE__ */ jsx("div", {
							className: "lg:col-span-5",
							children: /* @__PURE__ */ jsx(InsuranceHeroPanel, {})
						})]
					}),
					/* @__PURE__ */ jsx(SoundWaveMotif, { variant: "divider" }),
					/* @__PURE__ */ jsx("section", {
						className: "py-14 bg-white border-y border-slate-200/80",
						children: /* @__PURE__ */ jsxs("div", {
							className: "max-w-5xl mx-auto px-6 text-center space-y-4",
							children: [
								/* @__PURE__ */ jsx("span", {
									className: "font-mono text-xs font-bold text-[#087F8C] tracking-widest uppercase",
									children: "Operational Governance"
								}),
								/* @__PURE__ */ jsx("h2", {
									className: "font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]",
									children: "Built with care. Designed for real insurance conversations."
								}),
								/* @__PURE__ */ jsx("p", {
									className: "text-sm sm:text-base text-[#475467] leading-relaxed max-w-3xl mx-auto",
									children: "InsurCall is developed specifically to support insurance operations teams, claims adjusters, and brokers. Answers are strictly grounded in your approved policy schedules, policyholder identities are verified through OTP, and consequential actions remain subject to human supervisor review."
								})
							]
						})
					}),
					/* @__PURE__ */ jsxs("section", {
						className: "py-24 bg-[#172033] text-white relative overflow-hidden",
						children: [/* @__PURE__ */ jsx("div", { className: "absolute top-0 right-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-[#087F8C]/15 rounded-full blur-[140px] pointer-events-none" }), /* @__PURE__ */ jsx("div", {
							className: "max-w-7xl mx-auto px-6 sm:px-8 relative z-10",
							children: /* @__PURE__ */ jsxs("div", {
								className: "grid lg:grid-cols-12 gap-12 items-center",
								children: [/* @__PURE__ */ jsx("div", {
									className: "lg:col-span-7",
									children: /* @__PURE__ */ jsxs("div", {
										className: "relative rounded-[32px] overflow-hidden border border-slate-700/80 shadow-2xl group",
										children: [
											/* @__PURE__ */ jsx("img", {
												src: "/insurance_hero_campaign.jpg",
												alt: "Indian insurance specialist calmly reviewing policy documents with a policyholder in natural daylight",
												className: "w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-[1.02]"
											}),
											/* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-[#111827]/80 via-transparent to-transparent pointer-events-none" }),
											/* @__PURE__ */ jsxs("div", {
												className: "absolute bottom-4 left-6 right-6 flex items-center justify-between text-xs text-slate-300 font-mono",
												children: [/* @__PURE__ */ jsx("span", { children: "Modern Indian Insurance Service Environment" }), /* @__PURE__ */ jsx("span", {
													className: "text-[#10A6AE]",
													children: "Grounded Policy Intelligence"
												})]
											})
										]
									})
								}), /* @__PURE__ */ jsxs("div", {
									className: "lg:col-span-5 space-y-6",
									children: [
										/* @__PURE__ */ jsx(Badge, {
											variant: "outline",
											className: "border-[#10A6AE]/40 bg-[#10A6AE]/10 text-[#10A6AE] text-[11px] font-mono tracking-widest uppercase font-semibold",
											children: "Insurance-Only Architecture"
										}),
										/* @__PURE__ */ jsx("h2", {
											className: "font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight",
											children: "Built for the calls that protect Indian policyholders."
										}),
										/* @__PURE__ */ jsx("p", {
											className: "text-base text-slate-300 leading-relaxed",
											children: "Technology designed around how Indian insurance operations actually work."
										}),
										/* @__PURE__ */ jsx("p", {
											className: "text-sm text-slate-400 leading-relaxed",
											children: "When a vehicle is damaged on a highway or a family arrives at a hospital reception, every second matters. InsurCall provides an autonomous voice employee that speaks with empathy, verifies policyholder identity, captures First Notice of Loss with precision, and escalates complex requests to human adjusters without losing context."
										}),
										/* @__PURE__ */ jsx("div", {
											className: "pt-2",
											children: /* @__PURE__ */ jsx(Button, {
												asChild: true,
												className: "bg-[#087F8C] hover:bg-[#076C77] text-white font-mono text-xs tracking-wider uppercase h-11 px-6 rounded-xl shadow-xs",
												children: /* @__PURE__ */ jsxs(Link, {
													to: "/voice",
													children: [/* @__PURE__ */ jsx(Mic, { className: "size-3.5 mr-2 text-[#10A6AE]" }), "TEST LIVE INSURANCE CALL"]
												})
											})
										})
									]
								})]
							})
						})]
					}),
					/* @__PURE__ */ jsx(InsuranceWorkflowShowcase, {}),
					/* @__PURE__ */ jsx(InsuranceCapabilities, {}),
					/* @__PURE__ */ jsx("section", {
						className: "py-24 bg-white border-b border-slate-200/80",
						children: /* @__PURE__ */ jsxs("div", {
							className: "max-w-7xl mx-auto px-6 sm:px-8 space-y-16",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "grid lg:grid-cols-12 gap-12 items-center",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "lg:col-span-6 space-y-5",
									children: [
										/* @__PURE__ */ jsx(Badge, {
											variant: "outline",
											className: "text-[10px] font-mono uppercase bg-[#E6F6F7] text-[#087F8C] border-[#087F8C]/30",
											children: "Automated FNOL Pipeline"
										}),
										/* @__PURE__ */ jsx("h3", {
											className: "font-display text-2xl sm:text-3xl font-bold text-[#111827]",
											children: "From Incoming Distress Call to Structured Claims Docket"
										}),
										/* @__PURE__ */ jsx("p", {
											className: "text-sm leading-relaxed text-[#475467]",
											children: "The platform transforms caller speech into structured claims data: incident coordinates, vehicle or property damage assessments, and police report references."
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "grid grid-cols-2 gap-3 text-xs pt-2",
											children: [/* @__PURE__ */ jsxs("div", {
												className: "rounded-xl border border-slate-200 bg-[#FAF9F6] p-3",
												children: [/* @__PURE__ */ jsx("span", {
													className: "font-mono text-[10px] text-[#087F8C] font-bold block",
													children: "01 : Intake"
												}), /* @__PURE__ */ jsx("span", {
													className: "text-slate-700 text-[11px] block mt-1",
													children: "Audio speech recognition tuned for Hinglish & dialects."
												})]
											}), /* @__PURE__ */ jsxs("div", {
												className: "rounded-xl border border-slate-200 bg-[#FAF9F6] p-3",
												children: [/* @__PURE__ */ jsx("span", {
													className: "font-mono text-[10px] text-[#087F8C] font-bold block",
													children: "02 : Output"
												}), /* @__PURE__ */ jsx("span", {
													className: "text-slate-700 text-[11px] block mt-1",
													children: "Zod-validated schema stored in PostgreSQL claims table."
												})]
											})]
										})
									]
								}), /* @__PURE__ */ jsx("div", {
									className: "lg:col-span-6",
									children: /* @__PURE__ */ jsx("div", {
										className: "rounded-3xl overflow-hidden border border-slate-200 shadow-md",
										children: /* @__PURE__ */ jsx("img", {
											src: "/insurance_fnol_workflow.jpg",
											alt: "First notice of loss workflow illustration showing transition from audio wave to structured record",
											className: "w-full h-auto object-cover"
										})
									})
								})]
							}), /* @__PURE__ */ jsxs("div", {
								className: "grid lg:grid-cols-12 gap-12 items-center",
								children: [/* @__PURE__ */ jsx("div", {
									className: "lg:col-span-6 order-2 lg:order-1",
									children: /* @__PURE__ */ jsx("div", {
										className: "rounded-3xl overflow-hidden border border-slate-200 shadow-md",
										children: /* @__PURE__ */ jsx("img", {
											src: "/insurance_human_review.jpg",
											alt: "Human review and document verification illustration showing claims specialist inspecting case details",
											className: "w-full h-auto object-cover"
										})
									})
								}), /* @__PURE__ */ jsxs("div", {
									className: "lg:col-span-6 order-1 lg:order-2 space-y-5",
									children: [
										/* @__PURE__ */ jsx(Badge, {
											variant: "outline",
											className: "text-[10px] font-mono uppercase bg-amber-50 text-amber-800 border-amber-300",
											children: "Regulatory Compliance"
										}),
										/* @__PURE__ */ jsx("h3", {
											className: "font-display text-2xl sm:text-3xl font-bold text-[#111827]",
											children: "AI Assists the Evidence. Humans Retain Authority."
										}),
										/* @__PURE__ */ jsx("p", {
											className: "text-sm leading-relaxed text-[#475467]",
											children: "InsurCall strictly segregates read-only data extraction from consequential insurance commitments. Autonomous operations can never disburse settlement funds or deny coverage without human sign-off."
										}),
										/* @__PURE__ */ jsxs("ul", {
											className: "space-y-2 text-xs text-slate-700",
											children: [/* @__PURE__ */ jsxs("li", {
												className: "flex items-center gap-2",
												children: [/* @__PURE__ */ jsx(CheckCircle2, { className: "size-4 text-emerald-600 shrink-0" }), /* @__PURE__ */ jsx("span", { children: "Dual-control authorization matrix for high-risk endorsement changes" })]
											}), /* @__PURE__ */ jsxs("li", {
												className: "flex items-center gap-2",
												children: [/* @__PURE__ */ jsx(CheckCircle2, { className: "size-4 text-emerald-600 shrink-0" }), /* @__PURE__ */ jsx("span", { children: "Cryptographic audit event logs stored for insurance regulatory inspections" })]
											})]
										})
									]
								})]
							})]
						})
					}),
					/* @__PURE__ */ jsx("section", {
						className: "py-12 bg-white border-b border-slate-200/80",
						children: /* @__PURE__ */ jsx("div", {
							className: "max-w-4xl mx-auto px-6 text-center",
							children: /* @__PURE__ */ jsxs("div", {
								className: "inline-flex items-center gap-2.5 rounded-full border border-slate-200 bg-[#FAF9F6] px-4 py-1.5 text-xs text-slate-700 shadow-2xs",
								children: [
									/* @__PURE__ */ jsx(Award, { className: "size-4 text-[#087F8C]" }),
									/* @__PURE__ */ jsx("span", {
										className: "font-semibold text-slate-900",
										children: "IIT Bhilai-Backed Venture Building"
									}),
									/* @__PURE__ */ jsx("span", {
										className: "text-slate-400",
										children: "|"
									}),
									/* @__PURE__ */ jsx("span", {
										className: "text-slate-500 font-mono text-[11px]",
										children: "Deep-Tech Voice AI & Insurance Governance Incubation"
									})
								]
							})
						})
					}),
					/* @__PURE__ */ jsx("section", {
						className: "py-24 bg-[#172033] text-white relative overflow-hidden",
						children: /* @__PURE__ */ jsxs("div", {
							className: "max-w-4xl mx-auto px-6 text-center space-y-8 relative z-10",
							children: [
								/* @__PURE__ */ jsx(SoundWaveMotif, { variant: "nodes" }),
								/* @__PURE__ */ jsxs("div", {
									className: "space-y-4 pt-4",
									children: [/* @__PURE__ */ jsx("h2", {
										className: "font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight",
										children: "Make every insurance conversation count."
									}), /* @__PURE__ */ jsx("p", {
										className: "text-base sm:text-lg text-slate-300 max-w-xl mx-auto leading-relaxed",
										children: "Give your policyholders a clearer path to the right answer."
									})]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "pt-2 flex flex-wrap justify-center gap-4",
									children: [/* @__PURE__ */ jsx(Button, {
										asChild: true,
										size: "lg",
										className: "bg-[#087F8C] hover:bg-[#076C77] text-white font-semibold text-sm h-12 px-8 rounded-xl shadow-xs",
										children: /* @__PURE__ */ jsxs(Link, {
											to: "/voice",
											children: [/* @__PURE__ */ jsx(PhoneCall, { className: "size-4 mr-2 text-[#10A6AE]" }), "Experience the insurance call demo"]
										})
									}), /* @__PURE__ */ jsxs(Button, {
										size: "lg",
										variant: "outline",
										onClick: () => setShowAuth(true),
										className: "border-slate-700 bg-transparent text-slate-200 hover:text-white hover:bg-slate-800 text-sm h-12 px-6 rounded-xl font-medium cursor-pointer",
										children: [/* @__PURE__ */ jsx(LogIn, { className: "size-4 mr-2" }), "Sign in to Console"]
									})]
								})
							]
						})
					})
				]
			}),
			/* @__PURE__ */ jsx(HalftoneWordmarkFooter, {
				wordmark: "insurcall",
				label: "InsurCall Platform",
				meta: "2026 : Autonomous AI Voice Employee for Insurance Operations",
				columns: INSURANCE_FOOTER_COLUMNS,
				preset: "paper",
				palette: {
					background: "#FAF9F6",
					ink: "#111827",
					warm: "#087F8C"
				},
				height: "500px"
			}),
			/* @__PURE__ */ jsx(FloatingAuthModal, {
				isOpen: showAuth,
				onClose: () => setShowAuth(false)
			})
		]
	});
}
//#endregion
export { LandingPage as component };
