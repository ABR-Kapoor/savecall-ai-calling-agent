import { c as getTenantSettings, m as updateTenantSettings } from "./insurance.functions-BLePgOSY.js";
import { t as INTERVIEW_QUESTIONS } from "./onboarding-DpYIZ15-.js";
import { n as Button, t as Badge } from "./badge-CjGhifle.js";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-3hIMutoJ.js";
import { t as Input } from "./input-U8cX-69P.js";
import { t as Textarea } from "./textarea-B4p8JS7Y.js";
import { t as InsurCallLoadingScreen } from "./loading-screen-C2BweBhg.js";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import { AlertCircle, ArrowRight, Bot, Check, CheckSquare, ChevronLeft, ChevronRight, HelpCircle, Mic, PhoneCall, Play, Radio, RefreshCw, ShieldCheck, Sliders, Sparkles, Square, Volume2 } from "lucide-react";
//#region src/routes/_authenticated/onboarding.tsx?tsr-split=component
var DEFAULT_ONBOARDING = {
	step: 0,
	organizationName: "",
	businessType: "Agency / Brokerage",
	contactName: "",
	contactPhone: "",
	contactEmail: "",
	linesOfInsurance: ["Health Insurance", "Motor / Auto"],
	preferredLanguage: "English",
	agentName: "Anya",
	voiceStyle: "Warm & Reassuring",
	agentGreeting: "Hello! Thank you for calling our office. I am Anya, your AI insurance assistant. How can I assist you with your policy, coverage, or claim inquiry today?",
	supportedLanguages: [
		"English",
		"Hindi",
		"Hinglish"
	],
	agentInstructions: "Answer policy coverage questions, initiate accident First Notice of Loss (FNOL), check claim status, and escalate high-risk changes to staff adjusters.",
	escalationBehavior: "Immediate transfer to human adjuster on disputes or high-value claims",
	supportedWorkflows: [
		"policy_enquiries",
		"fnol_intake",
		"claim_status",
		"renewal_enquiries",
		"document_collection",
		"human_handoff"
	],
	operatingHours: "Monday - Saturday 9:00 AM - 8:00 PM IST",
	emergencyHelpline: "+91 80000 12345 (24x7 Cashless Hospital Desk)",
	coreBusinessKnowledge: "Hospitalization requires 24 hours admission for cashless approval except daycare. Claims must be submitted with original discharge summary and itemized pharmacy bills.",
	callChannel: "browser_webrtc",
	offHoursRouting: "Emergency voicemail with automated transcription and adjuster alert"
};
var STEPS = [
	{
		id: 0,
		title: "Welcome"
	},
	{
		id: 1,
		title: "Your Organisation"
	},
	{
		id: 2,
		title: "Meet Your Assistant"
	},
	{
		id: 3,
		title: "Supported Workflows"
	},
	{
		id: 4,
		title: "Business Knowledge"
	},
	{
		id: 5,
		title: "Call Handling"
	},
	{
		id: 6,
		title: "Test Assistant"
	},
	{
		id: 7,
		title: "Review & Finish"
	}
];
var INSURANCE_LINES = [
	"Health Insurance",
	"Motor / Auto",
	"Life & Term",
	"Property & Marine",
	"Commercial & Liability",
	"Travel & Personal Accident"
];
var WORKFLOW_OPTIONS = [
	{
		id: "policy_enquiries",
		title: "Policy Enquiries",
		desc: "Check coverage limits, deductibles, premium due dates, and request digital certificates."
	},
	{
		id: "fnol_intake",
		title: "First Notice of Loss (FNOL)",
		desc: "Autonomous accident and cashless hospitalization incident intake with photo checklist."
	},
	{
		id: "claim_status",
		title: "Claim-Status Enquiries",
		desc: "Real-time status tracking against active insurer dockets without caller wait."
	},
	{
		id: "renewal_enquiries",
		title: "Renewal Enquiries",
		desc: "Upcoming policy expirations, renewal quote checks, and secure payment link dispatch."
	},
	{
		id: "document_collection",
		title: "Document Collection",
		desc: "Guides callers on mandatory KYC, FIR, or discharge papers required for claim review."
	},
	{
		id: "human_handoff",
		title: "Human Handoff",
		desc: "Warm transfer of complex coverage disputes or high-value claims to licensed adjusters."
	}
];
function OnboardingPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { user } = useUser();
	const { data: tenant, isLoading } = useQuery({
		queryKey: ["tenant-settings", user?.id],
		queryFn: () => getTenantSettings({ data: {
			clerkUserId: user?.id,
			userEmail: user?.primaryEmailAddress?.emailAddress,
			userName: user?.fullName || void 0
		} }),
		enabled: !!user?.id
	});
	const [data, setData] = useState(DEFAULT_ONBOARDING);
	const [saveStatus, setSaveStatus] = useState("");
	const [saveError, setSaveError] = useState("");
	const [isPlayingPreview, setIsPlayingPreview] = useState(false);
	const synthRef = useRef(null);
	const [micPermission, setMicPermission] = useState("prompt");
	const [isTestSessionActive, setIsTestSessionActive] = useState(false);
	const [testLog, setTestLog] = useState([]);
	const [testInput, setTestInput] = useState("");
	const [interviewMode, setInterviewMode] = useState("voice");
	const [currentQIndex, setCurrentQIndex] = useState(0);
	const [interviewAnswers, setInterviewAnswers] = useState({
		businessDescription: "",
		greeting: "",
		languageTone: "",
		escalation: "",
		neverInvent: ""
	});
	const [interviewInput, setInterviewInput] = useState("");
	const [isInterviewListening, setIsInterviewListening] = useState(false);
	const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false);
	const [interviewError, setInterviewError] = useState("");
	const interviewRecognitionRef = useRef(null);
	const speakInterviewQuestion = (text) => {
		if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
		window.speechSynthesis.cancel();
		if (isSpeakingQuestion) {
			setIsSpeakingQuestion(false);
			return;
		}
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.rate = .95;
		utterance.pitch = 1.05;
		const voices = window.speechSynthesis.getVoices();
		const chosenVoice = voices.find((v) => v.lang.includes("en-IN") || v.name.includes("India")) || voices.find((v) => v.lang.startsWith("en"));
		if (chosenVoice) utterance.voice = chosenVoice;
		utterance.onstart = () => setIsSpeakingQuestion(true);
		utterance.onend = () => setIsSpeakingQuestion(false);
		utterance.onerror = () => setIsSpeakingQuestion(false);
		window.speechSynthesis.speak(utterance);
	};
	const toggleInterviewMic = () => {
		if (typeof window === "undefined") return;
		const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
		if (!SpeechRecognition) {
			setInterviewError("Web Speech Recognition is not supported in this browser. You can type your response below.");
			return;
		}
		if (isInterviewListening) {
			if (interviewRecognitionRef.current) interviewRecognitionRef.current.stop();
			setIsInterviewListening(false);
			return;
		}
		setInterviewError("");
		try {
			const recognition = new SpeechRecognition();
			recognition.continuous = false;
			recognition.interimResults = true;
			recognition.lang = data.preferredLanguage === "Hindi" ? "hi-IN" : "en-IN";
			recognition.onstart = () => {
				setIsInterviewListening(true);
			};
			recognition.onresult = (event) => {
				let transcript = "";
				for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
				setInterviewInput(transcript);
			};
			recognition.onerror = (event) => {
				setIsInterviewListening(false);
				if (event.error === "not-allowed") setInterviewError("Microphone permission denied. Please allow mic access or type your response.");
				else setInterviewError(`Voice recognition event: ${event.error}. You can continue typing.`);
			};
			recognition.onend = () => {
				setIsInterviewListening(false);
			};
			interviewRecognitionRef.current = recognition;
			recognition.start();
		} catch (err) {
			setIsInterviewListening(false);
			setInterviewError("Could not initialize microphone. Please type your response.");
		}
	};
	const handleNextInterviewQuestion = (skipSave = false) => {
		if (typeof window !== "undefined" && "speechSynthesis" in window) {
			window.speechSynthesis.cancel();
			setIsSpeakingQuestion(false);
		}
		if (isInterviewListening && interviewRecognitionRef.current) {
			interviewRecognitionRef.current.stop();
			setIsInterviewListening(false);
		}
		const currentQ = INTERVIEW_QUESTIONS[currentQIndex];
		const val = interviewInput.trim();
		if (!skipSave && val && currentQ) {
			const updated = {
				...interviewAnswers,
				[currentQ.field]: val
			};
			setInterviewAnswers(updated);
			if (currentQ.field === "businessDescription") setData((prev) => ({
				...prev,
				coreBusinessKnowledge: val
			}));
			else if (currentQ.field === "greeting") setData((prev) => ({
				...prev,
				agentGreeting: val
			}));
			else if (currentQ.field === "escalation") setData((prev) => ({
				...prev,
				escalationBehavior: val
			}));
			else if (currentQ.field === "neverInvent") setData((prev) => ({
				...prev,
				agentInstructions: `Strict Guidelines: ${val}. Answer policy coverage questions, initiate FNOL, and escalate to human adjusters when required.`
			}));
		}
		setInterviewInput("");
		if (currentQIndex < INTERVIEW_QUESTIONS.length - 1) {
			const nextIdx = currentQIndex + 1;
			setCurrentQIndex(nextIdx);
			const nextQ = INTERVIEW_QUESTIONS[nextIdx];
			if (nextQ && interviewAnswers[nextQ.field]) setInterviewInput(interviewAnswers[nextQ.field] || "");
		}
	};
	const handleApplySpokenConfiguration = () => {
		const greetingAns = interviewAnswers.greeting || data.agentGreeting;
		const escalationAns = interviewAnswers.escalation || data.escalationBehavior;
		const rulesAns = interviewAnswers.neverInvent || "Do not invent coverage limits or promise claim payouts without adjuster approval.";
		const bizAns = interviewAnswers.businessDescription || data.coreBusinessKnowledge;
		setData((prev) => ({
			...prev,
			agentGreeting: greetingAns,
			escalationBehavior: escalationAns,
			coreBusinessKnowledge: bizAns,
			agentInstructions: `Immutable Safety Policy: ${rulesAns}. Business Scope: ${bizAns}. Escalation Rule: ${escalationAns}.`
		}));
	};
	useEffect(() => {
		if (tenant && tenant.branding_config) {
			const cfg = tenant.branding_config;
			const org = cfg.organization_details || {};
			const agent = cfg.agent_config || {};
			const call = cfg.call_handling || {};
			setData((prev) => ({
				...prev,
				step: typeof cfg.onboarding_step === "number" ? cfg.onboarding_step : prev.step,
				organizationName: tenant.name || org.agency_name || prev.organizationName,
				businessType: org.business_type || prev.businessType,
				contactName: org.contact_name || user?.fullName || prev.contactName,
				contactPhone: org.contact_phone || prev.contactPhone,
				contactEmail: org.contact_email || user?.primaryEmailAddress?.emailAddress || prev.contactEmail,
				linesOfInsurance: org.lines_of_insurance || prev.linesOfInsurance,
				preferredLanguage: org.preferred_language || prev.preferredLanguage,
				agentName: agent.name || prev.agentName,
				voiceStyle: agent.voice_style || prev.voiceStyle,
				agentGreeting: agent.greeting || prev.agentGreeting,
				supportedLanguages: agent.supported_languages || prev.supportedLanguages,
				agentInstructions: agent.instructions || prev.agentInstructions,
				escalationBehavior: agent.escalation_behavior || prev.escalationBehavior,
				supportedWorkflows: cfg.supported_workflows || prev.supportedWorkflows,
				operatingHours: call.working_hours || prev.operatingHours,
				emergencyHelpline: cfg.emergency_helpline || prev.emergencyHelpline,
				coreBusinessKnowledge: cfg.core_business_knowledge || prev.coreBusinessKnowledge,
				callChannel: call.channel || prev.callChannel,
				offHoursRouting: call.after_hours_route || prev.offHoursRouting
			}));
		}
	}, [tenant, user]);
	const toggleSpeechPreview = () => {
		if (typeof window === "undefined" || !("speechSynthesis" in window)) {
			alert("Browser speech synthesis is not supported on this browser.");
			return;
		}
		if (isPlayingPreview) {
			window.speechSynthesis.cancel();
			setIsPlayingPreview(false);
			return;
		}
		window.speechSynthesis.cancel();
		const utterance = new SpeechSynthesisUtterance(data.agentGreeting);
		utterance.rate = .95;
		utterance.pitch = 1.05;
		const voices = window.speechSynthesis.getVoices();
		const chosenVoice = voices.find((v) => v.lang.includes("en-IN") || v.name.includes("India")) || voices.find((v) => v.lang.includes("en-GB") && v.name.includes("Natural")) || voices.find((v) => v.lang.startsWith("en"));
		if (chosenVoice) utterance.voice = chosenVoice;
		utterance.onend = () => setIsPlayingPreview(false);
		utterance.onerror = () => setIsPlayingPreview(false);
		synthRef.current = utterance;
		setIsPlayingPreview(true);
		window.speechSynthesis.speak(utterance);
	};
	const checkMicPermission = async () => {
		try {
			if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
				const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
				setMicPermission("granted");
				stream.getTracks().forEach((track) => track.stop());
			}
		} catch (e) {
			if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") setMicPermission("denied");
			else setMicPermission("prompt");
		}
	};
	const startTestSession = () => {
		setIsTestSessionActive(true);
		setTestLog([{
			sender: "agent",
			text: data.agentGreeting
		}]);
	};
	const stopTestSession = () => {
		setIsTestSessionActive(false);
		if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
	};
	const sendTestMessage = () => {
		if (!testInput.trim()) return;
		const userText = testInput.trim();
		setTestInput("");
		setTestLog((prev) => [...prev, {
			sender: "user",
			text: userText
		}]);
		setTimeout(() => {
			let agentReply = "";
			const lower = userText.toLowerCase();
			if (lower.includes("claim") || lower.includes("fnol") || lower.includes("accident")) agentReply = `I can help file your claim immediately. Could you please share the date of the incident and policy number?`;
			else if (lower.includes("coverage") || lower.includes("policy") || lower.includes("cashless")) agentReply = `I am checking your coverage details. Our cashless network covers approved daycare and inpatient hospitalizations. What hospital are you inquiring about?`;
			else agentReply = `Thank you for sharing that. I have noted this in your carrier profile. Our team operates ${data.operatingHours}. How else may I assist you today?`;
			setTestLog((prev) => [...prev, {
				sender: "agent",
				text: agentReply
			}]);
			if (typeof window !== "undefined" && "speechSynthesis" in window) {
				const u = new SpeechSynthesisUtterance(agentReply);
				u.rate = .95;
				window.speechSynthesis.speak(u);
			}
		}, 600);
	};
	const saveMutation = useMutation({
		mutationFn: async (opts) => {
			const { updated, isFinal } = opts;
			const existingBrd = tenant?.branding_config || {};
			const payload = {
				tenantId: tenant?.id,
				clerkUserId: user?.id,
				name: updated.organizationName || tenant?.name || "Insurance Agency",
				slug: tenant?.slug || (updated.organizationName ? updated.organizationName.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/(^-|-$)/g, "") : "insurance-agency"),
				branding_config: {
					...existingBrd,
					onboarding_step: updated.step,
					onboarding_completed: Boolean(isFinal),
					organization_details: {
						agency_name: updated.organizationName,
						business_type: updated.businessType,
						contact_name: updated.contactName,
						contact_phone: updated.contactPhone,
						contact_email: updated.contactEmail,
						lines_of_insurance: updated.linesOfInsurance,
						preferred_language: updated.preferredLanguage
					},
					agent_config: {
						name: updated.agentName,
						voice_style: updated.voiceStyle,
						greeting: updated.agentGreeting,
						supported_languages: updated.supportedLanguages,
						instructions: updated.agentInstructions,
						escalation_behavior: updated.escalationBehavior
					},
					supported_workflows: updated.supportedWorkflows,
					emergency_helpline: updated.emergencyHelpline,
					core_business_knowledge: updated.coreBusinessKnowledge,
					call_handling: {
						channel: updated.callChannel,
						working_hours: updated.operatingHours,
						after_hours_route: updated.offHoursRouting
					}
				}
			};
			return updateTenantSettings({ data: payload });
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["tenant-settings", user?.id] });
			setSaveStatus("Progress saved");
			setSaveError("");
			setTimeout(() => setSaveStatus(""), 2e3);
			if (variables.isFinal) navigate({ to: "/dashboard" });
		},
		onError: (err) => {
			console.error("Save error:", err);
			setSaveError(err?.message || "Failed to persist onboarding state. Please retry.");
			setSaveStatus("");
		}
	});
	const updateField = (field, value) => {
		setData((prev) => ({
			...prev,
			[field]: value
		}));
	};
	const goToStep = (stepNumber) => {
		setSaveError("");
		const nextData = {
			...data,
			step: stepNumber
		};
		setData(nextData);
		saveMutation.mutate({ updated: nextData });
	};
	const handleNext = () => {
		if (data.step < STEPS.length - 1) goToStep(data.step + 1);
	};
	const handleBack = () => {
		if (data.step > 0) goToStep(data.step - 1);
	};
	const handleFinishSetup = () => {
		setSaveError("");
		saveMutation.mutate({
			updated: data,
			isFinal: true
		});
	};
	if (isLoading) return /* @__PURE__ */ jsx(InsurCallLoadingScreen, {
		message: "Loading your onboarding assistant...",
		submessage: "Retrieving saved organization preferences from database."
	});
	const currentStepInfo = STEPS[data.step] || STEPS[0];
	const progressPct = Math.round(data.step / (STEPS.length - 1) * 100);
	return /* @__PURE__ */ jsxs("div", {
		className: "min-h-screen bg-[#FAF9F6] text-[#111827] antialiased flex flex-col justify-between p-4 md:p-8 select-none",
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: "max-w-4xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-200",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-2.5",
					children: [/* @__PURE__ */ jsx("div", {
						className: "size-9 rounded-xl bg-white border border-slate-200 p-1.5 shadow-2xs flex items-center justify-center",
						children: /* @__PURE__ */ jsx("img", {
							src: "/01_logo_only_transparent.png",
							alt: "InsurCall Emblem",
							className: "size-full object-contain"
						})
					}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-1.5 font-display text-base font-extrabold tracking-tight text-slate-900",
						children: ["Insur", /* @__PURE__ */ jsx("span", {
							className: "text-[#087F8C]",
							children: "Call"
						})]
					}), /* @__PURE__ */ jsx("p", {
						className: "text-[10px] font-mono text-slate-400",
						children: "Carrier Voice Assistant Setup"
					})] })]
				}), /* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-3",
					children: [
						saveStatus && /* @__PURE__ */ jsxs("span", {
							className: "text-xs font-mono text-emerald-600 flex items-center gap-1 animate-in fade-in",
							children: [
								/* @__PURE__ */ jsx(Check, { className: "size-3.5" }),
								" ",
								saveStatus
							]
						}),
						saveMutation.isPending && /* @__PURE__ */ jsxs("span", {
							className: "text-xs font-mono text-slate-400 flex items-center gap-1",
							children: [/* @__PURE__ */ jsx(RefreshCw, { className: "size-3 animate-spin text-[#087F8C]" }), " Saving..."]
						}),
						/* @__PURE__ */ jsxs(Badge, {
							variant: "outline",
							className: "text-xs font-mono border-slate-200 text-slate-600",
							children: [
								"Step ",
								data.step + 1,
								" of ",
								STEPS.length
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ jsxs("main", {
				className: "max-w-4xl mx-auto w-full my-6 flex-1 flex flex-col justify-center",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "mb-6 space-y-1.5",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex justify-between text-xs text-slate-500 font-mono",
							children: [/* @__PURE__ */ jsx("span", { children: currentStepInfo?.title || "Setup" }), /* @__PURE__ */ jsxs("span", { children: [progressPct, "% Completed"] })]
						}), /* @__PURE__ */ jsx("div", {
							className: "w-full bg-slate-200 h-1.5 rounded-full overflow-hidden",
							children: /* @__PURE__ */ jsx("div", {
								className: "bg-[#087F8C] h-full transition-all duration-300 ease-out",
								style: { width: `${progressPct}%` }
							})
						})]
					}),
					saveError && /* @__PURE__ */ jsxs("div", {
						className: "mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center justify-between",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ jsx(AlertCircle, { className: "size-4 shrink-0" }), /* @__PURE__ */ jsx("span", { children: saveError })]
						}), /* @__PURE__ */ jsx(Button, {
							variant: "outline",
							size: "sm",
							onClick: () => saveMutation.mutate({ updated: data }),
							className: "text-xs h-7 border-rose-300 bg-white text-rose-800",
							children: "Retry Save"
						})]
					}),
					/* @__PURE__ */ jsxs(Card, {
						className: "border border-slate-200 bg-white shadow-xs rounded-3xl p-6 md:p-8",
						children: [
							data.step === 0 && /* @__PURE__ */ jsxs("div", {
								className: "space-y-6 text-center max-w-xl mx-auto py-4",
								children: [
									/* @__PURE__ */ jsx("div", {
										className: "size-16 rounded-3xl bg-[#E6F6F7] text-[#087F8C] grid place-items-center mx-auto shadow-2xs",
										children: /* @__PURE__ */ jsx(Bot, { className: "size-8" })
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "space-y-2",
										children: [/* @__PURE__ */ jsx("h1", {
											className: "font-display text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900",
											children: "Let's set up your insurance assistant."
										}), /* @__PURE__ */ jsx("p", {
											className: "text-sm text-slate-600 leading-relaxed",
											children: "Configure an autonomous voice employee that handles policyholder calls, initiates First Notice of Loss (FNOL) claims, checks coverage, and escalates complex reviews to licensed adjusters."
										})]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "grid grid-cols-1 md:grid-cols-3 gap-3 text-left pt-2",
										children: [
											/* @__PURE__ */ jsxs("div", {
												className: "rounded-2xl border border-slate-100 bg-[#FAF9F6] p-3.5 space-y-1",
												children: [/* @__PURE__ */ jsxs("div", {
													className: "flex items-center gap-2 text-xs font-bold text-slate-900",
													children: [/* @__PURE__ */ jsx(PhoneCall, { className: "size-3.5 text-[#087F8C]" }), " Natural Voice"]
												}), /* @__PURE__ */ jsx("p", {
													className: "text-[11px] text-slate-500",
													children: "Sub-second speech in English, Hindi, and conversational Hinglish."
												})]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "rounded-2xl border border-slate-100 bg-[#FAF9F6] p-3.5 space-y-1",
												children: [/* @__PURE__ */ jsxs("div", {
													className: "flex items-center gap-2 text-xs font-bold text-slate-900",
													children: [/* @__PURE__ */ jsx(ShieldCheck, { className: "size-3.5 text-[#087F8C]" }), " Zero Hallucinations"]
												}), /* @__PURE__ */ jsx("p", {
													className: "text-[11px] text-slate-500",
													children: "Strict adherence to approved policy wording and carrier guidelines."
												})]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "rounded-2xl border border-slate-100 bg-[#FAF9F6] p-3.5 space-y-1",
												children: [/* @__PURE__ */ jsxs("div", {
													className: "flex items-center gap-2 text-xs font-bold text-slate-900",
													children: [/* @__PURE__ */ jsx(CheckSquare, { className: "size-3.5 text-[#087F8C]" }), " Human Sign-off"]
												}), /* @__PURE__ */ jsx("p", {
													className: "text-[11px] text-slate-500",
													children: "High-risk changes are staged for compliance review before execution."
												})]
											})
										]
									}),
									/* @__PURE__ */ jsx("div", {
										className: "pt-4",
										children: /* @__PURE__ */ jsxs(Button, {
											onClick: handleNext,
											size: "lg",
											className: "w-full sm:w-auto px-8 bg-[#087F8C] hover:bg-[#076C77] text-white font-mono text-sm gap-2 rounded-xl shadow-xs",
											children: ["Get Started ", /* @__PURE__ */ jsx(ArrowRight, { className: "size-4" })]
										})
									})
								]
							}),
							data.step === 1 && /* @__PURE__ */ jsxs("div", {
								className: "space-y-6",
								children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
									className: "font-display text-xl font-bold text-slate-900",
									children: "Your Organisation"
								}), /* @__PURE__ */ jsx("p", {
									className: "text-xs text-slate-500 mt-1",
									children: "Tell us about your insurance agency, brokerage, or carrier desk to personalize policyholder dialogues."
								})] }), /* @__PURE__ */ jsxs("div", {
									className: "grid grid-cols-1 md:grid-cols-2 gap-4",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: "space-y-1.5 md:col-span-2",
											children: [/* @__PURE__ */ jsx("label", {
												className: "text-xs font-semibold text-slate-700",
												children: "Organisation / Agency Name *"
											}), /* @__PURE__ */ jsx(Input, {
												placeholder: "e.g. Apex Life & Health Partners",
												value: data.organizationName,
												onChange: (e) => updateField("organizationName", e.target.value),
												className: "border-slate-200"
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "space-y-1.5",
											children: [/* @__PURE__ */ jsx("label", {
												className: "text-xs font-semibold text-slate-700",
												children: "Insurance Business Type"
											}), /* @__PURE__ */ jsxs("select", {
												value: data.businessType,
												onChange: (e) => updateField("businessType", e.target.value),
												className: "w-full h-10 px-3 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#087F8C]",
												children: [
													/* @__PURE__ */ jsx("option", {
														value: "Agency / Brokerage",
														children: "Insurance Agency / Brokerage"
													}),
													/* @__PURE__ */ jsx("option", {
														value: "TPA / Claims Service",
														children: "TPA / Third-Party Administrator"
													}),
													/* @__PURE__ */ jsx("option", {
														value: "Carrier / Underwriter",
														children: "Carrier / Underwriter"
													}),
													/* @__PURE__ */ jsx("option", {
														value: "MGA / InsurTech",
														children: "MGA / InsurTech Platform"
													})
												]
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "space-y-1.5",
											children: [/* @__PURE__ */ jsx("label", {
												className: "text-xs font-semibold text-slate-700",
												children: "Primary Contact Name"
											}), /* @__PURE__ */ jsx(Input, {
												placeholder: "e.g. Rajesh Sharma",
												value: data.contactName,
												onChange: (e) => updateField("contactName", e.target.value),
												className: "border-slate-200"
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "space-y-1.5",
											children: [/* @__PURE__ */ jsx("label", {
												className: "text-xs font-semibold text-slate-700",
												children: "Contact Email"
											}), /* @__PURE__ */ jsx(Input, {
												type: "email",
												placeholder: "contact@agency.com",
												value: data.contactEmail,
												onChange: (e) => updateField("contactEmail", e.target.value),
												className: "border-slate-200"
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "space-y-1.5",
											children: [/* @__PURE__ */ jsx("label", {
												className: "text-xs font-semibold text-slate-700",
												children: "Preferred Primary Language"
											}), /* @__PURE__ */ jsxs("select", {
												value: data.preferredLanguage,
												onChange: (e) => updateField("preferredLanguage", e.target.value),
												className: "w-full h-10 px-3 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#087F8C]",
												children: [
													/* @__PURE__ */ jsx("option", {
														value: "English",
														children: "English"
													}),
													/* @__PURE__ */ jsx("option", {
														value: "Hindi",
														children: "Hindi"
													}),
													/* @__PURE__ */ jsx("option", {
														value: "Hinglish",
														children: "Hinglish (Bilingual)"
													})
												]
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "space-y-2 md:col-span-2 pt-2",
											children: [/* @__PURE__ */ jsx("label", {
												className: "text-xs font-semibold text-slate-700",
												children: "Relevant Lines of Insurance (Select all that apply)"
											}), /* @__PURE__ */ jsx("div", {
												className: "flex flex-wrap gap-2",
												children: INSURANCE_LINES.map((line) => {
													const isSelected = data.linesOfInsurance.includes(line);
													return /* @__PURE__ */ jsx("button", {
														type: "button",
														onClick: () => {
															if (isSelected) updateField("linesOfInsurance", data.linesOfInsurance.filter((l) => l !== line));
															else updateField("linesOfInsurance", [...data.linesOfInsurance, line]);
														},
														className: `px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${isSelected ? "bg-[#087F8C] text-white border-[#087F8C]" : "bg-[#FAF9F6] text-slate-700 border-slate-200 hover:border-slate-300"}`,
														children: line
													}, line);
												})
											})]
										})
									]
								})]
							}),
							data.step === 2 && /* @__PURE__ */ jsxs("div", {
								className: "space-y-6",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3",
									children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
										className: "font-display text-xl font-bold text-slate-900",
										children: "Build your receptionist by talking"
									}), /* @__PURE__ */ jsx("p", {
										className: "text-xs text-slate-500 mt-1",
										children: "Teach your AI receptionist how your agency works by answering quick guided questions by voice or text."
									})] }), /* @__PURE__ */ jsxs("div", {
										className: "flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl self-start sm:self-auto",
										children: [/* @__PURE__ */ jsxs("button", {
											type: "button",
											onClick: () => setInterviewMode("voice"),
											className: `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${interviewMode === "voice" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`,
											children: [/* @__PURE__ */ jsx(Mic, { className: "size-3.5 text-[#087F8C]" }), "Voice Interview"]
										}), /* @__PURE__ */ jsxs("button", {
											type: "button",
											onClick: () => setInterviewMode("manual"),
											className: `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${interviewMode === "manual" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`,
											children: [/* @__PURE__ */ jsx(Sliders, { className: "size-3.5" }), "Manual Form"]
										})]
									})]
								}), interviewMode === "voice" ? /* @__PURE__ */ jsxs("div", {
									className: "space-y-6",
									children: [/* @__PURE__ */ jsxs(Card, {
										className: "border-[#087F8C]/20 bg-[#FAF9F6] shadow-sm",
										children: [/* @__PURE__ */ jsxs(CardHeader, {
											className: "pb-3 border-b border-slate-200/80",
											children: [
												/* @__PURE__ */ jsxs("div", {
													className: "flex items-center justify-between",
													children: [/* @__PURE__ */ jsxs("div", {
														className: "flex items-center gap-2",
														children: [/* @__PURE__ */ jsxs(Badge, {
															className: "bg-[#087F8C]/15 text-[#087F8C] border-[#087F8C]/30 text-xs",
															children: [
																"Question ",
																currentQIndex + 1,
																" of ",
																INTERVIEW_QUESTIONS.length
															]
														}), /* @__PURE__ */ jsx("span", {
															className: "text-xs text-slate-500 font-medium",
															children: "Conversational Configuration"
														})]
													}), /* @__PURE__ */ jsxs(Button, {
														type: "button",
														variant: "ghost",
														size: "sm",
														onClick: () => speakInterviewQuestion(INTERVIEW_QUESTIONS[currentQIndex]?.question || ""),
														className: "h-8 gap-1.5 text-xs text-[#087F8C] hover:bg-[#087F8C]/10",
														children: [/* @__PURE__ */ jsx(Volume2, { className: `size-3.5 ${isSpeakingQuestion ? "animate-pulse text-amber-600" : ""}` }), isSpeakingQuestion ? "Speaking..." : "Read Aloud"]
													})]
												}),
												/* @__PURE__ */ jsx(CardTitle, {
													className: "text-base font-bold text-slate-900 pt-2",
													children: INTERVIEW_QUESTIONS[currentQIndex]?.question
												}),
												/* @__PURE__ */ jsx(CardDescription, {
													className: "text-xs text-slate-600",
													children: INTERVIEW_QUESTIONS[currentQIndex]?.hint
												})
											]
										}), /* @__PURE__ */ jsxs(CardContent, {
											className: "space-y-4 pt-4",
											children: [
												/* @__PURE__ */ jsxs("div", {
													className: "flex flex-col sm:flex-row items-center gap-3",
													children: [/* @__PURE__ */ jsx(Button, {
														type: "button",
														onClick: toggleInterviewMic,
														className: `w-full sm:w-auto px-5 h-11 gap-2 rounded-xl text-xs font-bold transition-all shadow-sm ${isInterviewListening ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse" : "bg-[#087F8C] hover:bg-[#076C77] text-white"}`,
														children: isInterviewListening ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Square, { className: "size-4 fill-white" }), " Stop Recording"] }) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Mic, { className: "size-4" }), " Speak Answer"] })
													}), /* @__PURE__ */ jsx("div", {
														className: "text-xs text-slate-500 flex-1",
														children: isInterviewListening ? /* @__PURE__ */ jsx("span", {
															className: "text-rose-600 font-semibold animate-pulse",
															children: "Listening to your microphone... speak clearly."
														}) : /* @__PURE__ */ jsx("span", { children: "Click Speak Answer or type your response in the box below." })
													})]
												}),
												interviewError && /* @__PURE__ */ jsxs("div", {
													className: "p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs flex items-center gap-2",
													children: [/* @__PURE__ */ jsx(AlertCircle, { className: "size-4 shrink-0 text-amber-600" }), /* @__PURE__ */ jsx("span", { children: interviewError })]
												}),
												/* @__PURE__ */ jsxs("div", {
													className: "space-y-1.5",
													children: [/* @__PURE__ */ jsx("label", {
														className: "text-xs font-semibold text-slate-700",
														children: "Your Answer / Spoken Transcript"
													}), /* @__PURE__ */ jsx(Textarea, {
														rows: 3,
														value: interviewInput,
														onChange: (e) => setInterviewInput(e.target.value),
														placeholder: INTERVIEW_QUESTIONS[currentQIndex]?.example,
														className: "text-xs leading-relaxed border-slate-200 bg-white"
													})]
												}),
												/* @__PURE__ */ jsxs("div", {
													className: "flex items-center justify-between pt-2 border-t border-slate-200",
													children: [/* @__PURE__ */ jsx(Button, {
														type: "button",
														variant: "ghost",
														size: "sm",
														disabled: currentQIndex === 0,
														onClick: () => {
															if (currentQIndex > 0) {
																const prevIdx = currentQIndex - 1;
																setCurrentQIndex(prevIdx);
																const prevQ = INTERVIEW_QUESTIONS[prevIdx];
																if (prevQ && interviewAnswers[prevQ.field]) setInterviewInput(interviewAnswers[prevQ.field] || "");
															}
														},
														className: "text-xs h-8 text-slate-600",
														children: "Previous"
													}), /* @__PURE__ */ jsxs("div", {
														className: "flex items-center gap-2",
														children: [/* @__PURE__ */ jsx(Button, {
															type: "button",
															variant: "outline",
															size: "sm",
															onClick: () => handleNextInterviewQuestion(true),
															className: "text-xs h-8 border-slate-300",
															children: "Skip"
														}), /* @__PURE__ */ jsx(Button, {
															type: "button",
															size: "sm",
															onClick: () => handleNextInterviewQuestion(false),
															className: "text-xs h-8 bg-[#087F8C] hover:bg-[#076C77] text-white",
															children: currentQIndex === INTERVIEW_QUESTIONS.length - 1 ? "Save Response" : "Next Question"
														})]
													})]
												})
											]
										})]
									}), /* @__PURE__ */ jsxs(Card, {
										className: "border-border bg-card/60",
										children: [/* @__PURE__ */ jsxs(CardHeader, {
											className: "pb-3",
											children: [/* @__PURE__ */ jsxs("div", {
												className: "flex items-center justify-between",
												children: [/* @__PURE__ */ jsxs("div", {
													className: "flex items-center gap-2",
													children: [/* @__PURE__ */ jsx(Sparkles, { className: "size-4 text-[#087F8C]" }), /* @__PURE__ */ jsx(CardTitle, {
														className: "text-sm font-semibold",
														children: "Generated Receptionist Configuration"
													})]
												}), /* @__PURE__ */ jsxs(Button, {
													type: "button",
													size: "sm",
													onClick: handleApplySpokenConfiguration,
													className: "h-8 gap-1.5 text-xs bg-[#087F8C] hover:bg-[#076C77] text-white font-semibold",
													children: [/* @__PURE__ */ jsx(Check, { className: "size-3.5" }), " Apply Configuration"]
												})]
											}), /* @__PURE__ */ jsx(CardDescription, {
												className: "text-xs",
												children: "Derived in real time from your spoken or typed answers. Layered prompt design ensures immutable safety boundaries."
											})]
										}), /* @__PURE__ */ jsx(CardContent, {
											className: "space-y-3 text-xs",
											children: /* @__PURE__ */ jsxs("div", {
												className: "grid grid-cols-1 md:grid-cols-2 gap-3",
												children: [
													/* @__PURE__ */ jsxs("div", {
														className: "p-3 rounded-xl border border-slate-200 bg-white space-y-1",
														children: [/* @__PURE__ */ jsx("span", {
															className: "font-semibold text-slate-900 block",
															children: "Opening Greeting:"
														}), /* @__PURE__ */ jsxs("p", {
															className: "text-slate-600 italic",
															children: [
																"\"",
																interviewAnswers.greeting || data.agentGreeting,
																"\""
															]
														})]
													}),
													/* @__PURE__ */ jsxs("div", {
														className: "p-3 rounded-xl border border-slate-200 bg-white space-y-1",
														children: [/* @__PURE__ */ jsx("span", {
															className: "font-semibold text-slate-900 block",
															children: "Escalation Boundary:"
														}), /* @__PURE__ */ jsx("p", {
															className: "text-slate-600",
															children: interviewAnswers.escalation || data.escalationBehavior
														})]
													}),
													/* @__PURE__ */ jsxs("div", {
														className: "p-3 rounded-xl border border-slate-200 bg-white space-y-1 md:col-span-2",
														children: [/* @__PURE__ */ jsx("span", {
															className: "font-semibold text-slate-900 block",
															children: "Immutable Safety & Prohibited Claims:"
														}), /* @__PURE__ */ jsx("p", {
															className: "text-slate-600",
															children: interviewAnswers.neverInvent || "Never guarantee claim payouts or promise coverage without authorized adjuster review."
														})]
													})
												]
											})
										})]
									})]
								}) : /* @__PURE__ */ jsxs("div", {
									className: "grid grid-cols-1 md:grid-cols-2 gap-4",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: "space-y-1.5",
											children: [/* @__PURE__ */ jsx("label", {
												className: "text-xs font-semibold text-slate-700",
												children: "Assistant Name"
											}), /* @__PURE__ */ jsx(Input, {
												placeholder: "e.g. Anya",
												value: data.agentName,
												onChange: (e) => updateField("agentName", e.target.value),
												className: "border-slate-200"
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "space-y-1.5",
											children: [/* @__PURE__ */ jsx("label", {
												className: "text-xs font-semibold text-slate-700",
												children: "Voice & Speaking Style"
											}), /* @__PURE__ */ jsxs("select", {
												value: data.voiceStyle,
												onChange: (e) => updateField("voiceStyle", e.target.value),
												className: "w-full h-10 px-3 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#087F8C]",
												children: [
													/* @__PURE__ */ jsx("option", {
														value: "Warm & Reassuring",
														children: "Warm & Reassuring"
													}),
													/* @__PURE__ */ jsx("option", {
														value: "Clear & Professional",
														children: "Clear & Professional"
													}),
													/* @__PURE__ */ jsx("option", {
														value: "Empathetic Claims Specialist",
														children: "Empathetic Claims Specialist"
													})
												]
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "space-y-1.5 md:col-span-2",
											children: [
												/* @__PURE__ */ jsxs("div", {
													className: "flex items-center justify-between",
													children: [/* @__PURE__ */ jsx("label", {
														className: "text-xs font-semibold text-slate-700",
														children: "Opening Greeting (What the caller hears first)"
													}), /* @__PURE__ */ jsx(Button, {
														type: "button",
														variant: "outline",
														size: "sm",
														onClick: toggleSpeechPreview,
														className: "text-xs h-7 gap-1.5 border-[#087F8C] text-[#087F8C] hover:bg-[#E6F6F7]",
														children: isPlayingPreview ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Square, { className: "size-3 text-rose-600 fill-rose-600" }), " Stop Audio"] }) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Volume2, { className: "size-3" }), " Preview Voice"] })
													})]
												}),
												/* @__PURE__ */ jsx(Textarea, {
													rows: 3,
													value: data.agentGreeting,
													onChange: (e) => updateField("agentGreeting", e.target.value),
													placeholder: "Enter the opening greeting...",
													className: "border-slate-200 text-xs"
												}),
												isPlayingPreview && /* @__PURE__ */ jsxs("div", {
													className: "flex items-center gap-2 text-xs text-[#087F8C] font-mono animate-pulse",
													children: [/* @__PURE__ */ jsx("span", { className: "size-2 rounded-full bg-[#087F8C]" }), "Speaking configured greeting in real time..."]
												})
											]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "space-y-1.5 md:col-span-2",
											children: [/* @__PURE__ */ jsx("label", {
												className: "text-xs font-semibold text-slate-700",
												children: "Escalation & Transfer Rule"
											}), /* @__PURE__ */ jsxs("select", {
												value: data.escalationBehavior,
												onChange: (e) => updateField("escalationBehavior", e.target.value),
												className: "w-full h-10 px-3 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#087F8C]",
												children: [
													/* @__PURE__ */ jsx("option", {
														value: "Immediate transfer to human adjuster on disputes or high-value claims",
														children: "Immediate transfer to human adjuster on disputes or high-value claims"
													}),
													/* @__PURE__ */ jsx("option", {
														value: "Collect callback docket and send priority SMS/Email alert to staff",
														children: "Collect callback docket and send priority SMS/Email alert to staff"
													}),
													/* @__PURE__ */ jsx("option", {
														value: "Stage change request in Compliance Queue for dual-control sign-off",
														children: "Stage change request in Compliance Queue for dual-control sign-off"
													})
												]
											})]
										})
									]
								})]
							}),
							data.step === 3 && /* @__PURE__ */ jsxs("div", {
								className: "space-y-6",
								children: [
									/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
										className: "font-display text-xl font-bold text-slate-900",
										children: "What should it help with?"
									}), /* @__PURE__ */ jsx("p", {
										className: "text-xs text-slate-500 mt-1",
										children: "Select only the insurance workflows your assistant is authorized to handle autonomously."
									})] }),
									/* @__PURE__ */ jsx("div", {
										className: "grid grid-cols-1 md:grid-cols-2 gap-3",
										children: WORKFLOW_OPTIONS.map((wf) => {
											const isChecked = data.supportedWorkflows.includes(wf.id);
											return /* @__PURE__ */ jsx("div", {
												onClick: () => {
													if (isChecked) updateField("supportedWorkflows", data.supportedWorkflows.filter((id) => id !== wf.id));
													else updateField("supportedWorkflows", [...data.supportedWorkflows, wf.id]);
												},
												className: `cursor-pointer rounded-2xl border p-4 text-left transition-all ${isChecked ? "border-[#087F8C] bg-[#E6F6F7]/30 ring-1 ring-[#087F8C]" : "border-slate-200 bg-[#FAF9F6] hover:border-slate-300"}`,
												children: /* @__PURE__ */ jsxs("div", {
													className: "flex items-start justify-between gap-2",
													children: [/* @__PURE__ */ jsxs("div", {
														className: "space-y-1",
														children: [/* @__PURE__ */ jsx("h4", {
															className: "text-xs font-bold text-slate-900",
															children: wf.title
														}), /* @__PURE__ */ jsx("p", {
															className: "text-[11px] text-slate-500 leading-relaxed",
															children: wf.desc
														})]
													}), /* @__PURE__ */ jsx("div", {
														className: `size-5 rounded-md border flex items-center justify-center shrink-0 ${isChecked ? "bg-[#087F8C] border-[#087F8C] text-white" : "border-slate-300 bg-white"}`,
														children: isChecked && /* @__PURE__ */ jsx(Check, { className: "size-3.5" })
													})]
												})
											}, wf.id);
										})
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 flex items-center gap-2",
										children: [/* @__PURE__ */ jsx(HelpCircle, { className: "size-4 shrink-0 text-[#087F8C]" }), /* @__PURE__ */ jsx("span", { children: "High-risk actions like nominee benefit alterations or claim settlements always trigger mandatory adjuster verification." })]
									})
								]
							}),
							data.step === 4 && /* @__PURE__ */ jsxs("div", {
								className: "space-y-6",
								children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
									className: "font-display text-xl font-bold text-slate-900",
									children: "Add Business Knowledge"
								}), /* @__PURE__ */ jsx("p", {
									className: "text-xs text-slate-500 mt-1",
									children: "Introduce essential operational facts now. You can upload comprehensive policy PDFs in the Knowledge Store anytime."
								})] }), /* @__PURE__ */ jsxs("div", {
									className: "space-y-4",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: "space-y-1.5",
											children: [/* @__PURE__ */ jsx("label", {
												className: "text-xs font-semibold text-slate-700",
												children: "Operating Hours"
											}), /* @__PURE__ */ jsx(Input, {
												placeholder: "e.g. Monday - Saturday 9:00 AM - 8:00 PM IST",
												value: data.operatingHours,
												onChange: (e) => updateField("operatingHours", e.target.value),
												className: "border-slate-200"
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "space-y-1.5",
											children: [/* @__PURE__ */ jsx("label", {
												className: "text-xs font-semibold text-slate-700",
												children: "Emergency Cashless Helpline & Contact Numbers"
											}), /* @__PURE__ */ jsx(Input, {
												placeholder: "e.g. +91 80000 12345 (24x7 Cashless Hospital Desk)",
												value: data.emergencyHelpline,
												onChange: (e) => updateField("emergencyHelpline", e.target.value),
												className: "border-slate-200"
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "space-y-1.5",
											children: [
												/* @__PURE__ */ jsx("label", {
													className: "text-xs font-semibold text-slate-700",
													children: "Core Business Knowledge & Coverage Guidelines"
												}),
												/* @__PURE__ */ jsx(Textarea, {
													rows: 4,
													value: data.coreBusinessKnowledge,
													onChange: (e) => updateField("coreBusinessKnowledge", e.target.value),
													placeholder: "Enter core coverage notes, hospitalization rules, cashless eligibility...",
													className: "border-slate-200 text-xs"
												}),
												/* @__PURE__ */ jsx("p", {
													className: "text-[11px] text-slate-400",
													children: "Your assistant answers caller questions strictly using verified facts entered here or approved in your Policy Knowledge Store."
												})
											]
										})
									]
								})]
							}),
							data.step === 5 && /* @__PURE__ */ jsxs("div", {
								className: "space-y-6",
								children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
									className: "font-display text-xl font-bold text-slate-900",
									children: "How should calls be handled?"
								}), /* @__PURE__ */ jsx("p", {
									className: "text-xs text-slate-500 mt-1",
									children: "Configure your primary connection channel and off-hours fallback routing."
								})] }), /* @__PURE__ */ jsxs("div", {
									className: "space-y-4",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: "rounded-2xl border border-[#087F8C] bg-[#E6F6F7]/30 p-4 space-y-2",
											children: [/* @__PURE__ */ jsxs("div", {
												className: "flex items-center justify-between",
												children: [/* @__PURE__ */ jsxs("div", {
													className: "flex items-center gap-2",
													children: [/* @__PURE__ */ jsx(Radio, { className: "size-4 text-[#087F8C]" }), /* @__PURE__ */ jsx("span", {
														className: "text-xs font-bold text-slate-900",
														children: "Browser WebRTC Assistant (Ready Immediately)"
													})]
												}), /* @__PURE__ */ jsx(Badge, {
													className: "bg-emerald-600 text-white text-[10px]",
													children: "Active"
												})]
											}), /* @__PURE__ */ jsx("p", {
												className: "text-xs text-slate-600 leading-relaxed",
												children: "Browser testing is available now with zero telephony hardware. You and your staff can test voice conversations directly from the dashboard."
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "rounded-2xl border border-blue-900/30 bg-blue-950/20 p-4 space-y-3",
											children: [
												/* @__PURE__ */ jsxs("div", {
													className: "flex items-center justify-between",
													children: [/* @__PURE__ */ jsxs("div", {
														className: "flex items-center gap-2",
														children: [/* @__PURE__ */ jsx(PhoneCall, { className: "size-4 text-blue-400" }), /* @__PURE__ */ jsx("span", {
															className: "text-xs font-bold text-white",
															children: "Inbound Phone Number & Carrier Forwarding (Live Telephony)"
														})]
													}), /* @__PURE__ */ jsx(Badge, {
														className: "bg-blue-600 text-white text-[10px]",
														children: "Recommended"
													})]
												}),
												/* @__PURE__ */ jsx("p", {
													className: "text-xs text-slate-300 leading-relaxed",
													children: "Connect your existing Airtel, Jio, Vi, or BSNL mobile number via automated carrier call forwarding. Keep your existing SIM card; your AI receptionist will answer when your line is busy or unanswered."
												}),
												/* @__PURE__ */ jsx("div", {
													className: "pt-1 flex items-center gap-3",
													children: /* @__PURE__ */ jsxs(Link, {
														to: "/phone",
														target: "_blank",
														className: "inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-4",
														children: ["Open Phone Onboarding Hub in new tab ", /* @__PURE__ */ jsx(ArrowRight, { className: "size-3" })]
													})
												})
											]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "space-y-1.5 pt-2",
											children: [/* @__PURE__ */ jsx("label", {
												className: "text-xs font-semibold text-slate-700",
												children: "Off-Hours Fallback Routine"
											}), /* @__PURE__ */ jsxs("select", {
												value: data.offHoursRouting,
												onChange: (e) => updateField("offHoursRouting", e.target.value),
												className: "w-full h-10 px-3 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#087F8C]",
												children: [
													/* @__PURE__ */ jsx("option", {
														value: "Emergency voicemail with automated transcription and adjuster alert",
														children: "Emergency voicemail with automated transcription and adjuster alert"
													}),
													/* @__PURE__ */ jsx("option", {
														value: "Forward urgent calls to emergency on-call adjuster mobile",
														children: "Forward urgent calls to emergency on-call adjuster mobile"
													}),
													/* @__PURE__ */ jsx("option", {
														value: "Polite callback scheduling prompt with next-business-day slot",
														children: "Polite callback scheduling prompt with next-business-day slot"
													})
												]
											})]
										})
									]
								})]
							}),
							data.step === 6 && /* @__PURE__ */ jsxs("div", {
								className: "space-y-6",
								children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
									className: "font-display text-xl font-bold text-slate-900",
									children: "Test Your Assistant"
								}), /* @__PURE__ */ jsx("p", {
									className: "text-xs text-slate-500 mt-1",
									children: "Try an interactive voice test using the identity and greeting configured in previous steps."
								})] }), /* @__PURE__ */ jsxs("div", {
									className: "rounded-2xl border border-slate-200 bg-[#FAF9F6] p-5 space-y-4",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200",
											children: [/* @__PURE__ */ jsxs("div", {
												className: "flex items-center gap-2.5",
												children: [/* @__PURE__ */ jsx("span", {
													className: "grid size-8 place-items-center rounded-xl bg-white border border-slate-200 text-[#087F8C] shadow-2xs",
													children: /* @__PURE__ */ jsx(Mic, { className: "size-4" })
												}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
													className: "text-xs font-bold text-slate-900",
													children: "Microphone Status"
												}), /* @__PURE__ */ jsx("div", {
													className: "text-[11px] font-mono text-slate-500",
													children: micPermission === "granted" ? "Permission Granted (Ready)" : micPermission === "denied" ? "Permission Blocked in Browser" : "Not Requested Yet"
												})] })]
											}), /* @__PURE__ */ jsxs("div", {
												className: "flex items-center gap-2",
												children: [micPermission !== "granted" ? /* @__PURE__ */ jsx(Button, {
													type: "button",
													variant: "outline",
													size: "sm",
													onClick: checkMicPermission,
													className: "text-xs border-slate-300",
													children: "Check Microphone"
												}) : null, !isTestSessionActive ? /* @__PURE__ */ jsxs(Button, {
													type: "button",
													size: "sm",
													onClick: startTestSession,
													className: "text-xs bg-[#087F8C] text-white hover:bg-[#076C77] gap-1.5",
													children: [/* @__PURE__ */ jsx(Play, { className: "size-3.5 fill-white" }), " Start Interactive Test"]
												}) : /* @__PURE__ */ jsxs(Button, {
													type: "button",
													variant: "destructive",
													size: "sm",
													onClick: stopTestSession,
													className: "text-xs gap-1.5",
													children: [/* @__PURE__ */ jsx(Square, { className: "size-3.5 fill-white" }), " End Test"]
												})]
											})]
										}),
										/* @__PURE__ */ jsx("div", {
											className: "min-h-48 max-h-64 overflow-y-auto space-y-2.5 p-3 rounded-xl bg-white border border-slate-200 text-xs",
											children: testLog.length === 0 ? /* @__PURE__ */ jsx("div", {
												className: "h-40 grid place-items-center text-center text-slate-400",
												children: /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx(Bot, { className: "size-6 text-slate-300 mx-auto mb-1" }), /* @__PURE__ */ jsxs("p", { children: [
													"Click \"Start Interactive Test\" to initiate conversation with ",
													data.agentName,
													"."
												] })] })
											}) : testLog.map((msg, i) => /* @__PURE__ */ jsx("div", {
												className: `flex gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`,
												children: /* @__PURE__ */ jsxs("div", {
													className: `max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${msg.sender === "user" ? "bg-[#172033] text-white rounded-br-xs" : "bg-[#E6F6F7] text-slate-900 rounded-bl-xs border border-[#087F8C]/20"}`,
													children: [/* @__PURE__ */ jsx("span", {
														className: "font-semibold block text-[10px] text-slate-400 mb-0.5",
														children: msg.sender === "user" ? "Caller" : data.agentName
													}), msg.text]
												})
											}, i))
										}),
										isTestSessionActive && /* @__PURE__ */ jsxs("div", {
											className: "flex gap-2 pt-1",
											children: [/* @__PURE__ */ jsx(Input, {
												placeholder: "Type a policy or claim test question (e.g. 'How do I file a cashless claim?')...",
												value: testInput,
												onChange: (e) => setTestInput(e.target.value),
												onKeyDown: (e) => e.key === "Enter" && sendTestMessage(),
												className: "text-xs bg-white border-slate-200"
											}), /* @__PURE__ */ jsx(Button, {
												type: "button",
												size: "sm",
												onClick: sendTestMessage,
												className: "bg-[#087F8C] text-white hover:bg-[#076C77] text-xs font-mono",
												children: "Send"
											})]
										})
									]
								})]
							}),
							data.step === 7 && /* @__PURE__ */ jsxs("div", {
								className: "space-y-6",
								children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
									className: "font-display text-xl font-bold text-slate-900",
									children: "Review & Finish Setup"
								}), /* @__PURE__ */ jsx("p", {
									className: "text-xs text-slate-500 mt-1",
									children: "Verify your configuration before activating your insurance command center."
								})] }), /* @__PURE__ */ jsxs("div", {
									className: "space-y-3",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: "rounded-2xl border border-slate-200 bg-[#FAF9F6] p-4 flex items-center justify-between",
											children: [/* @__PURE__ */ jsxs("div", {
												className: "space-y-0.5",
												children: [
													/* @__PURE__ */ jsx("div", {
														className: "text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono",
														children: "Organisation"
													}),
													/* @__PURE__ */ jsx("div", {
														className: "text-sm font-bold text-slate-900",
														children: data.organizationName || "My Insurance Agency"
													}),
													/* @__PURE__ */ jsxs("div", {
														className: "text-xs text-slate-500",
														children: [
															data.businessType,
															" • ",
															data.linesOfInsurance.join(", ")
														]
													})
												]
											}), /* @__PURE__ */ jsx(Button, {
												variant: "ghost",
												size: "sm",
												onClick: () => goToStep(1),
												className: "text-xs text-[#087F8C]",
												children: "Edit"
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "rounded-2xl border border-slate-200 bg-[#FAF9F6] p-4 flex items-center justify-between",
											children: [/* @__PURE__ */ jsxs("div", {
												className: "space-y-0.5",
												children: [
													/* @__PURE__ */ jsx("div", {
														className: "text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono",
														children: "AI Assistant"
													}),
													/* @__PURE__ */ jsx("div", {
														className: "text-sm font-bold text-slate-900",
														children: data.agentName
													}),
													/* @__PURE__ */ jsxs("div", {
														className: "text-xs text-slate-500",
														children: [
															data.voiceStyle,
															" • ",
															data.supportedLanguages.join(", ")
														]
													})
												]
											}), /* @__PURE__ */ jsx(Button, {
												variant: "ghost",
												size: "sm",
												onClick: () => goToStep(2),
												className: "text-xs text-[#087F8C]",
												children: "Edit"
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "rounded-2xl border border-slate-200 bg-[#FAF9F6] p-4 flex items-center justify-between",
											children: [/* @__PURE__ */ jsxs("div", {
												className: "space-y-0.5",
												children: [
													/* @__PURE__ */ jsx("div", {
														className: "text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono",
														children: "Authorized Workflows"
													}),
													/* @__PURE__ */ jsxs("div", {
														className: "text-sm font-bold text-slate-900",
														children: [data.supportedWorkflows.length, " Workflows Enabled"]
													}),
													/* @__PURE__ */ jsx("div", {
														className: "text-xs text-slate-500",
														children: "FNOL intake, policy queries, and human adjuster escalation."
													})
												]
											}), /* @__PURE__ */ jsx(Button, {
												variant: "ghost",
												size: "sm",
												onClick: () => goToStep(3),
												className: "text-xs text-[#087F8C]",
												children: "Edit"
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "rounded-2xl border border-slate-200 bg-[#FAF9F6] p-4 flex items-center justify-between",
											children: [/* @__PURE__ */ jsxs("div", {
												className: "space-y-0.5",
												children: [
													/* @__PURE__ */ jsx("div", {
														className: "text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono",
														children: "Call Channel & Readiness"
													}),
													/* @__PURE__ */ jsx("div", {
														className: "text-sm font-bold text-slate-900",
														children: "Browser WebRTC Active"
													}),
													/* @__PURE__ */ jsx("div", {
														className: "text-xs text-slate-500",
														children: "Ready for browser calls and adjuster verification."
													})
												]
											}), /* @__PURE__ */ jsx(Button, {
												variant: "ghost",
												size: "sm",
												onClick: () => goToStep(5),
												className: "text-xs text-[#087F8C]",
												children: "Edit"
											})]
										})
									]
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "mt-8 pt-4 border-t border-slate-200 flex items-center justify-between",
								children: [data.step > 0 ? /* @__PURE__ */ jsxs(Button, {
									variant: "outline",
									size: "sm",
									onClick: handleBack,
									disabled: saveMutation.isPending,
									className: "text-xs font-mono gap-1.5 border-slate-200",
									children: [/* @__PURE__ */ jsx(ChevronLeft, { className: "size-4" }), " Back"]
								}) : /* @__PURE__ */ jsx("div", {}), data.step < STEPS.length - 1 ? /* @__PURE__ */ jsxs(Button, {
									size: "sm",
									onClick: handleNext,
									disabled: saveMutation.isPending,
									className: "bg-[#087F8C] hover:bg-[#076C77] text-white text-xs font-mono gap-1.5 px-5",
									children: [
										saveMutation.isPending ? "Saving..." : "Continue",
										" ",
										/* @__PURE__ */ jsx(ChevronRight, { className: "size-4" })
									]
								}) : /* @__PURE__ */ jsxs(Button, {
									size: "sm",
									onClick: handleFinishSetup,
									disabled: saveMutation.isPending,
									className: "bg-[#087F8C] hover:bg-[#076C77] text-white text-xs font-mono gap-1.5 px-6",
									children: [
										saveMutation.isPending ? "Activating..." : "Finish Setup",
										" ",
										/* @__PURE__ */ jsx(Check, { className: "size-4" })
									]
								})]
							})
						]
					})
				]
			}),
			/* @__PURE__ */ jsx("footer", {
				className: "max-w-4xl mx-auto w-full pt-4 text-center text-xs text-slate-400 font-mono",
				children: "InsurCall Enterprise AI Platform • Multi-Tenant Database Isolation • IRDAI Compliance Ready"
			})
		]
	});
}
//#endregion
export { OnboardingPage as component };
