import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import {
  Bot,
  Building2,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  Mic,
  MicOff,
  Volume2,
  FileText,
  Clock,
  ArrowRight,
  Check,
  AlertCircle,
  HelpCircle,
  PhoneCall,
  Radio,
  Play,
  Square,
  RefreshCw,
  Sliders,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getTenantSettings, updateTenantSettings } from "@/lib/insurance.functions";
import { InsurCallLoadingScreen } from "@/components/loading-screen";

export const Route = createFileRoute("/_authenticated/onboarding")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Guided Setup: InsurCall AI Voice Employee" }],
  }),
  component: OnboardingPage,
});

export type InterviewFieldKey =
  | "businessDescription"
  | "greeting"
  | "languageTone"
  | "escalation"
  | "neverInvent";

export interface InterviewAnswersMap {
  businessDescription: string;
  greeting: string;
  languageTone: string;
  escalation: string;
  neverInvent: string;
}

export interface InterviewQuestion {
  id: number;
  question: string;
  field: InterviewFieldKey;
  hint: string;
  example: string;
}

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: 0,
    question: "What is your company name, and what core insurance services or products do you provide?",
    field: "businessDescription",
    hint: "Speak or type your business focus (e.g. 'We are Apex Health Partners, providing health insurance and cashless claim assistance.')",
    example: "We run a health & motor insurance agency helping individuals and families with policy issuance and cashless claims.",
  },
  {
    id: 1,
    question: "How would you like your receptionist to introduce itself when a customer calls?",
    field: "greeting",
    hint: "Your receptionist's opening sentence (e.g. 'Hello, welcome to our office. How can I assist you with your policy today?')",
    example: "Hello! Welcome to our office. How can I help you with your insurance policy today?",
  },
  {
    id: 2,
    question: "What language and tone should your receptionist use with customers?",
    field: "languageTone",
    hint: "e.g. 'Empathetic and professional in Hinglish and English'",
    example: "Warm and professional, speaking fluent Hinglish and English.",
  },
  {
    id: 3,
    question: "When a customer has an emergency or complex dispute, when should a human staff member take over?",
    field: "escalation",
    hint: "Define your team's escalation boundary",
    example: "Immediately transfer complex claim disputes or emergency hospitalization cases to our claims desk.",
  },
  {
    id: 4,
    question: "What critical company rules, limitations, or coverage facts must the receptionist NEVER invent?",
    field: "neverInvent",
    hint: "Explicit boundaries (e.g. Never guarantee claim payout without adjuster approval; pre-existing waiting period is 24 months)",
    example: "Never guarantee claim approval or promise payment amounts over the phone. Direct claim approval requires adjuster sign-off.",
  },
];

interface OnboardingData {
  step: number;
  organizationName: string;
  businessType: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  linesOfInsurance: string[];
  preferredLanguage: string;
  agentName: string;
  voiceStyle: string;
  agentGreeting: string;
  supportedLanguages: string[];
  agentInstructions: string;
  escalationBehavior: string;
  supportedWorkflows: string[];
  operatingHours: string;
  emergencyHelpline: string;
  coreBusinessKnowledge: string;
  callChannel: string;
  offHoursRouting: string;
}

const DEFAULT_ONBOARDING: OnboardingData = {
  step: 0,
  organizationName: "",
  businessType: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  linesOfInsurance: [],
  preferredLanguage: "",
  agentName: "",
  voiceStyle: "",
  agentGreeting: "",
  supportedLanguages: [],
  agentInstructions: "",
  escalationBehavior: "",
  supportedWorkflows: [
    "policy_enquiries",
    "fnol_intake",
    "claim_status",
    "renewal_enquiries",
    "document_collection",
    "human_handoff",
  ],
  operatingHours: "",
  emergencyHelpline: "",
  coreBusinessKnowledge: "",
  callChannel: "whatsapp",
  offHoursRouting: "",
};

const STEPS = [
  { id: 0, title: "Welcome" },
  { id: 1, title: "Your Organisation" },
  { id: 2, title: "Meet Your Assistant" },
  { id: 3, title: "Supported Workflows" },
  { id: 4, title: "Business Knowledge" },
  { id: 5, title: "Call Handling" },
  { id: 6, title: "Test Assistant" },
  { id: 7, title: "Review & Finish" },
];

const INSURANCE_LINES = [
  "Health Insurance",
  "Motor / Auto",
  "Life & Term",
  "Property & Marine",
  "Commercial & Liability",
  "Travel & Personal Accident",
];

const WORKFLOW_OPTIONS = [
  {
    id: "policy_enquiries",
    title: "Policy Enquiries",
    desc: "Check coverage limits, deductibles, premium due dates, and request digital certificates.",
  },
  {
    id: "fnol_intake",
    title: "First Notice of Loss (FNOL)",
    desc: "Autonomous accident and cashless hospitalization incident intake with photo checklist.",
  },
  {
    id: "claim_status",
    title: "Claim-Status Enquiries",
    desc: "Real-time status tracking against active insurer dockets without caller wait.",
  },
  {
    id: "renewal_enquiries",
    title: "Renewal Enquiries",
    desc: "Upcoming policy expirations, renewal quote checks, and secure payment link dispatch.",
  },
  {
    id: "document_collection",
    title: "Document Collection",
    desc: "Guides callers on mandatory KYC, FIR, or discharge papers required for claim review.",
  },
  {
    id: "human_handoff",
    title: "Human Handoff",
    desc: "Warm transfer of complex coverage disputes or high-value claims to licensed adjusters.",
  },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useUser();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-settings", user?.id],
    queryFn: () =>
      getTenantSettings({
        data: {
          clerkUserId: user?.id,
          userEmail: user?.primaryEmailAddress?.emailAddress,
          userName: user?.fullName || undefined,
        },
      }),
    enabled: !!user?.id,
  });

  const [data, setData] = useState<OnboardingData>(DEFAULT_ONBOARDING);
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [saveError, setSaveError] = useState<string>("");

  // Speech preview state
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Audio test state (Step 7)
  const [micPermission, setMicPermission] = useState<"prompt" | "granted" | "denied">("prompt");
  const [isTestSessionActive, setIsTestSessionActive] = useState(false);
  const [testLog, setTestLog] = useState<{ sender: "user" | "agent"; text: string }[]>([]);
  const [testInput, setTestInput] = useState("");

  // Step 2: "Build your receptionist by talking" conversational interview state
  const [interviewMode, setInterviewMode] = useState<"voice" | "manual">("voice");
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [interviewAnswers, setInterviewAnswers] = useState<InterviewAnswersMap>({
    businessDescription: "",
    greeting: "",
    languageTone: "",
    escalation: "",
    neverInvent: "",
  });
  const [interviewInput, setInterviewInput] = useState("");
  const [isInterviewListening, setIsInterviewListening] = useState(false);
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false);
  const [interviewError, setInterviewError] = useState("");
  const interviewRecognitionRef = useRef<any>(null);

  // Speak question aloud via SpeechSynthesis
  const speakInterviewQuestion = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    if (isSpeakingQuestion) {
      setIsSpeakingQuestion(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const chosenVoice =
      voices.find((v) => v.lang.includes("en-IN") || v.name.includes("India")) ||
      voices.find((v) => v.lang.startsWith("en"));
    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }
    utterance.onstart = () => setIsSpeakingQuestion(true);
    utterance.onend = () => setIsSpeakingQuestion(false);
    utterance.onerror = () => setIsSpeakingQuestion(false);
    window.speechSynthesis.speak(utterance);
  };

  // Toggle speech recognition for answer
  const toggleInterviewMic = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setInterviewError("Web Speech Recognition is not supported in this browser. You can type your response below.");
      return;
    }

    if (isInterviewListening) {
      if (interviewRecognitionRef.current) {
        interviewRecognitionRef.current.stop();
      }
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

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInterviewInput(transcript);
      };

      recognition.onerror = (event: any) => {
        setIsInterviewListening(false);
        if (event.error === "not-allowed") {
          setInterviewError("Microphone permission denied. Please allow mic access or type your response.");
        } else {
          setInterviewError(`Voice recognition event: ${event.error}. You can continue typing.`);
        }
      };

      recognition.onend = () => {
        setIsInterviewListening(false);
      };

      interviewRecognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
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
      const updated = { ...interviewAnswers, [currentQ.field]: val };
      setInterviewAnswers(updated);

      if (currentQ.field === "businessDescription") {
        setData((prev) => ({
          ...prev,
          coreBusinessKnowledge: val,
        }));
      } else if (currentQ.field === "greeting") {
        setData((prev) => ({
          ...prev,
          agentGreeting: val,
        }));
      } else if (currentQ.field === "escalation") {
        setData((prev) => ({
          ...prev,
          escalationBehavior: val,
        }));
      } else if (currentQ.field === "neverInvent") {
        setData((prev) => ({
          ...prev,
          agentInstructions: `Strict Guidelines: ${val}. Answer policy coverage questions, initiate FNOL, and escalate to human adjusters when required.`,
        }));
      }
    }

    setInterviewInput("");
    if (currentQIndex < INTERVIEW_QUESTIONS.length - 1) {
      const nextIdx = currentQIndex + 1;
      setCurrentQIndex(nextIdx);
      const nextQ = INTERVIEW_QUESTIONS[nextIdx];
      if (nextQ && interviewAnswers[nextQ.field]) {
        setInterviewInput(interviewAnswers[nextQ.field] || "");
      }
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
      agentInstructions: `Immutable Safety Policy: ${rulesAns}. Business Scope: ${bizAns}. Escalation Rule: ${escalationAns}.`,
    }));
  };

  // Load saved state from server
  useEffect(() => {
    if (tenant && tenant.branding_config) {
      const cfg = tenant.branding_config as any;
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
        offHoursRouting: call.after_hours_route || prev.offHoursRouting,
      }));
    }
  }, [tenant, user]);

  // Voice Preview synthesis
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
    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    // Pick a natural English/Indian voice if available
    const voices = window.speechSynthesis.getVoices();
    const chosenVoice =
      voices.find((v) => v.lang.includes("en-IN") || v.name.includes("India")) ||
      voices.find((v) => v.lang.includes("en-GB") && v.name.includes("Natural")) ||
      voices.find((v) => v.lang.startsWith("en"));
    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }

    utterance.onend = () => setIsPlayingPreview(false);
    utterance.onerror = () => setIsPlayingPreview(false);

    synthRef.current = utterance;
    setIsPlayingPreview(true);
    window.speechSynthesis.speak(utterance);
  };

  // Mic permission check for Step 7
  const checkMicPermission = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicPermission("granted");
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (e: any) {
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setMicPermission("denied");
      } else {
        setMicPermission("prompt");
      }
    }
  };

  const startTestSession = () => {
    setIsTestSessionActive(true);
    setTestLog([
      {
        sender: "agent",
        text: data.agentGreeting,
      },
    ]);
  };

  const stopTestSession = () => {
    setIsTestSessionActive(false);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  const sendTestMessage = () => {
    if (!testInput.trim()) return;
    const userText = testInput.trim();
    setTestInput("");

    setTestLog((prev) => [...prev, { sender: "user", text: userText }]);

    // Assistant response simulation using entered greeting & instructions
    setTimeout(() => {
      let agentReply = "";
      const lower = userText.toLowerCase();
      if (lower.includes("claim") || lower.includes("fnol") || lower.includes("accident")) {
        agentReply = `I can help file your claim immediately. Could you please share the date of the incident and policy number?`;
      } else if (lower.includes("coverage") || lower.includes("policy") || lower.includes("cashless")) {
        agentReply = `I am checking your coverage details. Our cashless network covers approved daycare and inpatient hospitalizations. What hospital are you inquiring about?`;
      } else {
        agentReply = `Thank you for sharing that. I have noted this in your carrier profile. Our team operates ${data.operatingHours}. How else may I assist you today?`;
      }

      setTestLog((prev) => [...prev, { sender: "agent", text: agentReply }]);

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(agentReply);
        u.rate = 0.95;
        window.speechSynthesis.speak(u);
      }
    }, 600);
  };

  // Save changes to backend
  const saveMutation = useMutation({
    mutationFn: async (opts: { updated: OnboardingData; isFinal?: boolean }) => {
      const { updated, isFinal } = opts;
      const existingBrd = (tenant?.branding_config as any) || {};

      const payload = {
        tenantId: tenant?.id,
        clerkUserId: user?.id,
        name: updated.organizationName || tenant?.name || "Insurance Agency",
        slug:
          tenant?.slug ||
          (updated.organizationName
            ? updated.organizationName.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/(^-|-$)/g, "")
            : "insurance-agency"),
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
            preferred_language: updated.preferredLanguage,
          },
          agent_config: {
            name: updated.agentName,
            voice_style: updated.voiceStyle,
            greeting: updated.agentGreeting,
            supported_languages: updated.supportedLanguages,
            instructions: updated.agentInstructions,
            escalation_behavior: updated.escalationBehavior,
          },
          supported_workflows: updated.supportedWorkflows,
          emergency_helpline: updated.emergencyHelpline,
          core_business_knowledge: updated.coreBusinessKnowledge,
          call_handling: {
            channel: updated.callChannel,
            working_hours: updated.operatingHours,
            after_hours_route: updated.offHoursRouting,
          },
        },
      };

      return updateTenantSettings({ data: payload });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-settings", user?.id] });
      setSaveStatus("Progress saved");
      setSaveError("");
      setTimeout(() => setSaveStatus(""), 2000);

      if (variables.isFinal) {
        navigate({ to: "/dashboard" });
      }
    },
    onError: (err: any) => {
      console.error("Save error:", err);
      setSaveError(err?.message || "Failed to persist onboarding state. Please retry.");
      setSaveStatus("");
    },
  });

  const updateField = <K extends keyof OnboardingData>(field: K, value: OnboardingData[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const goToStep = (stepNumber: number) => {
    setSaveError("");
    const nextData = { ...data, step: stepNumber };
    setData(nextData);
    saveMutation.mutate({ updated: nextData });
  };

  const handleNext = () => {
    if (data.step < STEPS.length - 1) {
      goToStep(data.step + 1);
    }
  };

  const handleBack = () => {
    if (data.step > 0) {
      goToStep(data.step - 1);
    }
  };

  const handleFinishSetup = () => {
    setSaveError("");
    saveMutation.mutate({ updated: data, isFinal: true });
  };

  if (isLoading) {
    return (
      <InsurCallLoadingScreen
        message="Loading your onboarding assistant..."
        submessage="Retrieving saved organization preferences from database."
      />
    );
  }

  const currentStepInfo = STEPS[data.step] || STEPS[0];
  const progressPct = Math.round(((data.step) / (STEPS.length - 1)) * 100);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#111827] antialiased flex flex-col justify-between p-4 md:p-8 select-none">
      {/* Top Header */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-white border border-slate-200 p-1.5 shadow-2xs flex items-center justify-center">
            <img
              src="/01_logo_only_transparent.png"
              alt="InsurCall Emblem"
              className="size-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-display text-base font-extrabold tracking-tight text-slate-900">
              Insur<span className="text-[#087F8C]">Call</span>
            </div>
            <p className="text-[10px] font-mono text-slate-400">Carrier Voice Assistant Setup</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveStatus && (
            <span className="text-xs font-mono text-emerald-600 flex items-center gap-1 animate-in fade-in">
              <Check className="size-3.5" /> {saveStatus}
            </span>
          )}
          {saveMutation.isPending && (
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
              <RefreshCw className="size-3 animate-spin text-[#087F8C]" /> Saving...
            </span>
          )}
          <Badge variant="outline" className="text-xs font-mono border-slate-200 text-slate-600">
            Step {data.step + 1} of {STEPS.length}
          </Badge>
        </div>
      </header>

      {/* Main Form Body */}
      <main className="max-w-4xl mx-auto w-full my-6 flex-1 flex flex-col justify-center">
        {/* Progress Bar */}
        <div className="mb-6 space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500 font-mono">
            <span>{currentStepInfo?.title || "Setup"}</span>
            <span>{progressPct}% Completed</span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#087F8C] h-full transition-all duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {saveError && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{saveError}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveMutation.mutate({ updated: data })}
              className="text-xs h-7 border-rose-300 bg-white text-rose-800"
            >
              Retry Save
            </Button>
          </div>
        )}

        <Card className="border border-slate-200 bg-white shadow-xs rounded-3xl p-6 md:p-8">
          {/* STEP 1: WELCOME */}
          {data.step === 0 && (
            <div className="space-y-6 text-center max-w-xl mx-auto py-4">
              <div className="size-16 rounded-3xl bg-[#E6F6F7] text-[#087F8C] grid place-items-center mx-auto shadow-2xs">
                <Bot className="size-8" />
              </div>

              <div className="space-y-2">
                <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
                  Let's set up your insurance assistant.
                </h1>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Configure an autonomous voice employee that handles policyholder calls, initiates First Notice of Loss (FNOL) claims, checks coverage, and escalates complex reviews to licensed adjusters.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left pt-2">
                <div className="rounded-2xl border border-slate-100 bg-[#FAF9F6] p-3.5 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <PhoneCall className="size-3.5 text-[#087F8C]" /> Natural Voice
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Sub-second speech in English, Hindi, and conversational Hinglish.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-[#FAF9F6] p-3.5 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <ShieldCheck className="size-3.5 text-[#087F8C]" /> Zero Hallucinations
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Strict adherence to approved policy wording and carrier guidelines.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-[#FAF9F6] p-3.5 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <CheckSquare className="size-3.5 text-[#087F8C]" /> Human Sign-off
                  </div>
                  <p className="text-[11px] text-slate-500">
                    High-risk changes are staged for compliance review before execution.
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleNext}
                  size="lg"
                  className="w-full sm:w-auto px-8 bg-[#087F8C] hover:bg-[#076C77] text-white font-mono text-sm gap-2 rounded-xl shadow-xs"
                >
                  Get Started <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: YOUR ORGANISATION */}
          {data.step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900">Your Organisation</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Tell us about your insurance agency, brokerage, or carrier desk to personalize policyholder dialogues.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Organisation / Agency Name *</label>
                  <Input
                    placeholder="e.g. Apex Life & Health Partners"
                    value={data.organizationName}
                    onChange={(e) => updateField("organizationName", e.target.value)}
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Insurance Business Type</label>
                  <select
                    value={data.businessType}
                    onChange={(e) => updateField("businessType", e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                  >
                    <option value="Agency / Brokerage">Insurance Agency / Brokerage</option>
                    <option value="TPA / Claims Service">TPA / Third-Party Administrator</option>
                    <option value="Carrier / Underwriter">Carrier / Underwriter</option>
                    <option value="MGA / InsurTech">MGA / InsurTech Platform</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Primary Contact Name</label>
                  <Input
                    placeholder="e.g. Rajesh Sharma"
                    value={data.contactName}
                    onChange={(e) => updateField("contactName", e.target.value)}
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Contact Email</label>
                  <Input
                    type="email"
                    placeholder="contact@agency.com"
                    value={data.contactEmail}
                    onChange={(e) => updateField("contactEmail", e.target.value)}
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Preferred Primary Language</label>
                  <select
                    value={data.preferredLanguage}
                    onChange={(e) => updateField("preferredLanguage", e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Hinglish">Hinglish (Bilingual)</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2 pt-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Relevant Lines of Insurance (Select all that apply)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {INSURANCE_LINES.map((line) => {
                      const isSelected = data.linesOfInsurance.includes(line);
                      return (
                        <button
                          key={line}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              updateField(
                                "linesOfInsurance",
                                data.linesOfInsurance.filter((l) => l !== line)
                              );
                            } else {
                              updateField("linesOfInsurance", [...data.linesOfInsurance, line]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                            isSelected
                              ? "bg-[#087F8C] text-white border-[#087F8C]"
                              : "bg-[#FAF9F6] text-slate-700 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {line}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: BUILD YOUR RECEPTIONIST BY TALKING */}
          {data.step === 2 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900">
                    Build your receptionist by talking
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Teach your AI receptionist how your agency works by answering quick guided questions by voice or text.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setInterviewMode("voice")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      interviewMode === "voice"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Mic className="size-3.5 text-[#087F8C]" />
                    Voice Interview
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterviewMode("manual")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      interviewMode === "manual"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Sliders className="size-3.5" />
                    Manual Form
                  </button>
                </div>
              </div>

              {interviewMode === "voice" ? (
                <div className="space-y-6">
                  {/* Guided Interview Card */}
                  <Card className="border-[#087F8C]/20 bg-[#FAF9F6] shadow-sm">
                    <CardHeader className="pb-3 border-b border-slate-200/80">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-[#087F8C]/15 text-[#087F8C] border-[#087F8C]/30 text-xs">
                            Question {currentQIndex + 1} of {INTERVIEW_QUESTIONS.length}
                          </Badge>
                          <span className="text-xs text-slate-500 font-medium">Conversational Configuration</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => speakInterviewQuestion(INTERVIEW_QUESTIONS[currentQIndex]?.question || "")}
                          className="h-8 gap-1.5 text-xs text-[#087F8C] hover:bg-[#087F8C]/10"
                        >
                          <Volume2 className={`size-3.5 ${isSpeakingQuestion ? "animate-pulse text-amber-600" : ""}`} />
                          {isSpeakingQuestion ? "Speaking..." : "Read Aloud"}
                        </Button>
                      </div>
                      <CardTitle className="text-base font-bold text-slate-900 pt-2">
                        {INTERVIEW_QUESTIONS[currentQIndex]?.question}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-600">
                        {INTERVIEW_QUESTIONS[currentQIndex]?.hint}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-4">
                      {/* Voice Recording / Input Section */}
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <Button
                          type="button"
                          onClick={toggleInterviewMic}
                          className={`w-full sm:w-auto px-5 h-11 gap-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                            isInterviewListening
                              ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                              : "bg-[#087F8C] hover:bg-[#076C77] text-white"
                          }`}
                        >
                          {isInterviewListening ? (
                            <>
                              <Square className="size-4 fill-white" /> Stop Recording
                            </>
                          ) : (
                            <>
                              <Mic className="size-4" /> Speak Answer
                            </>
                          )}
                        </Button>

                        <div className="text-xs text-slate-500 flex-1">
                          {isInterviewListening ? (
                            <span className="text-rose-600 font-semibold animate-pulse">
                              Listening to your microphone... speak clearly.
                            </span>
                          ) : (
                            <span>Click Speak Answer or type your response in the box below.</span>
                          )}
                        </div>
                      </div>

                      {interviewError && (
                        <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs flex items-center gap-2">
                          <AlertCircle className="size-4 shrink-0 text-amber-600" />
                          <span>{interviewError}</span>
                        </div>
                      )}

                      {/* Text Input / Live Transcript area */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Your Answer / Spoken Transcript</label>
                        <Textarea
                          rows={3}
                          value={interviewInput}
                          onChange={(e) => setInterviewInput(e.target.value)}
                          placeholder={INTERVIEW_QUESTIONS[currentQIndex]?.example}
                          className="text-xs leading-relaxed border-slate-200 bg-white"
                        />
                      </div>

                      {/* Question Navigation */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={currentQIndex === 0}
                          onClick={() => {
                            if (currentQIndex > 0) {
                              const prevIdx = currentQIndex - 1;
                              setCurrentQIndex(prevIdx);
                              const prevQ = INTERVIEW_QUESTIONS[prevIdx];
                              if (prevQ && interviewAnswers[prevQ.field]) {
                                setInterviewInput(interviewAnswers[prevQ.field] || "");
                              }
                            }
                          }}
                          className="text-xs h-8 text-slate-600"
                        >
                          Previous
                        </Button>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleNextInterviewQuestion(true)}
                            className="text-xs h-8 border-slate-300"
                          >
                            Skip
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleNextInterviewQuestion(false)}
                            className="text-xs h-8 bg-[#087F8C] hover:bg-[#076C77] text-white"
                          >
                            {currentQIndex === INTERVIEW_QUESTIONS.length - 1 ? "Save Response" : "Next Question"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Live Generated Configuration Summary */}
                  <Card className="border-border bg-card/60">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="size-4 text-[#087F8C]" />
                          <CardTitle className="text-sm font-semibold">
                            Generated Receptionist Configuration
                          </CardTitle>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleApplySpokenConfiguration}
                          className="h-8 gap-1.5 text-xs bg-[#087F8C] hover:bg-[#076C77] text-white font-semibold"
                        >
                          <Check className="size-3.5" /> Apply Configuration
                        </Button>
                      </div>
                      <CardDescription className="text-xs">
                        Derived in real time from your spoken or typed answers. Layered prompt design ensures immutable safety boundaries.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                          <span className="font-semibold text-slate-900 block">Opening Greeting:</span>
                          <p className="text-slate-600 italic">
                            "{interviewAnswers.greeting || data.agentGreeting}"
                          </p>
                        </div>

                        <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                          <span className="font-semibold text-slate-900 block">Escalation Boundary:</span>
                          <p className="text-slate-600">
                            {interviewAnswers.escalation || data.escalationBehavior}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1 md:col-span-2">
                          <span className="font-semibold text-slate-900 block">Immutable Safety & Prohibited Claims:</span>
                          <p className="text-slate-600">
                            {interviewAnswers.neverInvent || "Never guarantee claim payouts or promise coverage without authorized adjuster review."}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                /* Manual Form Mode */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Assistant Name</label>
                    <Input
                      placeholder="Enter assistant name"
                      value={data.agentName}
                      onChange={(e) => updateField("agentName", e.target.value)}
                      className="border-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Voice & Speaking Style</label>
                    <select
                      value={data.voiceStyle}
                      onChange={(e) => updateField("voiceStyle", e.target.value)}
                      className="w-full h-10 px-3 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                    >
                      <option value="Warm & Reassuring">Warm & Reassuring</option>
                      <option value="Clear & Professional">Clear & Professional</option>
                      <option value="Empathetic Claims Specialist">Empathetic Claims Specialist</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700">
                        Opening Greeting (What the caller hears first)
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={toggleSpeechPreview}
                        className="text-xs h-7 gap-1.5 border-[#087F8C] text-[#087F8C] hover:bg-[#E6F6F7]"
                      >
                        {isPlayingPreview ? (
                          <>
                            <Square className="size-3 text-rose-600 fill-rose-600" /> Stop Audio
                          </>
                        ) : (
                          <>
                            <Volume2 className="size-3" /> Preview Voice
                          </>
                        )}
                      </Button>
                    </div>
                    <Textarea
                      rows={3}
                      value={data.agentGreeting}
                      onChange={(e) => updateField("agentGreeting", e.target.value)}
                      placeholder="Enter the opening greeting..."
                      className="border-slate-200 text-xs"
                    />
                    {isPlayingPreview && (
                      <div className="flex items-center gap-2 text-xs text-[#087F8C] font-mono animate-pulse">
                        <span className="size-2 rounded-full bg-[#087F8C]" />
                        Speaking configured greeting in real time...
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-700">
                      Escalation & Transfer Rule
                    </label>
                    <select
                      value={data.escalationBehavior}
                      onChange={(e) => updateField("escalationBehavior", e.target.value)}
                      className="w-full h-10 px-3 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                    >
                      <option value="Immediate transfer to human adjuster on disputes or high-value claims">
                        Immediate transfer to human adjuster on disputes or high-value claims
                      </option>
                      <option value="Collect callback docket and send priority SMS/Email alert to staff">
                        Collect callback docket and send priority SMS/Email alert to staff
                      </option>
                      <option value="Stage change request in Compliance Queue for dual-control sign-off">
                        Stage change request in Compliance Queue for dual-control sign-off
                      </option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: SUPPORTED WORKFLOWS */}
          {data.step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900">What should it help with?</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Select only the insurance workflows your assistant is authorized to handle autonomously.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {WORKFLOW_OPTIONS.map((wf) => {
                  const isChecked = data.supportedWorkflows.includes(wf.id);
                  return (
                    <div
                      key={wf.id}
                      onClick={() => {
                        if (isChecked) {
                          updateField(
                            "supportedWorkflows",
                            data.supportedWorkflows.filter((id) => id !== wf.id)
                          );
                        } else {
                          updateField("supportedWorkflows", [...data.supportedWorkflows, wf.id]);
                        }
                      }}
                      className={`cursor-pointer rounded-2xl border p-4 text-left transition-all ${
                        isChecked
                          ? "border-[#087F8C] bg-[#E6F6F7]/30 ring-1 ring-[#087F8C]"
                          : "border-slate-200 bg-[#FAF9F6] hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-slate-900">{wf.title}</h4>
                          <p className="text-[11px] text-slate-500 leading-relaxed">{wf.desc}</p>
                        </div>
                        <div
                          className={`size-5 rounded-md border flex items-center justify-center shrink-0 ${
                            isChecked
                              ? "bg-[#087F8C] border-[#087F8C] text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isChecked && <Check className="size-3.5" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 flex items-center gap-2">
                <HelpCircle className="size-4 shrink-0 text-[#087F8C]" />
                <span>
                  High-risk actions like nominee benefit alterations or claim settlements always trigger mandatory adjuster verification.
                </span>
              </div>
            </div>
          )}

          {/* STEP 5: ADD BUSINESS KNOWLEDGE */}
          {data.step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900">Add Business Knowledge</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Introduce essential operational facts now. You can upload comprehensive policy PDFs in the Knowledge Store anytime.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Operating Hours</label>
                  <Input
                    placeholder="e.g. Monday - Saturday 9:00 AM - 8:00 PM IST"
                    value={data.operatingHours}
                    onChange={(e) => updateField("operatingHours", e.target.value)}
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Emergency Cashless Helpline & Contact Numbers
                  </label>
                  <Input
                    placeholder="e.g. +91 80000 12345 (24x7 Cashless Hospital Desk)"
                    value={data.emergencyHelpline}
                    onChange={(e) => updateField("emergencyHelpline", e.target.value)}
                    className="border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Core Business Knowledge & Coverage Guidelines
                  </label>
                  <Textarea
                    rows={4}
                    value={data.coreBusinessKnowledge}
                    onChange={(e) => updateField("coreBusinessKnowledge", e.target.value)}
                    placeholder="Enter core coverage notes, hospitalization rules, cashless eligibility..."
                    className="border-slate-200 text-xs"
                  />
                  <p className="text-[11px] text-slate-400">
                    Your assistant answers caller questions strictly using verified facts entered here or approved in your Policy Knowledge Store.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: CALL HANDLING */}
          {data.step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900">How should calls be handled?</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Configure your primary connection channel and off-hours fallback routing.
                </p>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-[#087F8C] bg-[#E6F6F7]/30 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radio className="size-4 text-[#087F8C]" />
                      <span className="text-xs font-bold text-slate-900">
                        Browser WebRTC Assistant (Ready Immediately)
                      </span>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[10px]">Active</Badge>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Browser testing is available now with zero telephony hardware. You and your staff can test voice conversations directly from the dashboard.
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-900/30 bg-blue-950/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PhoneCall className="size-4 text-blue-400" />
                      <span className="text-xs font-bold text-white">
                        Inbound Phone Number & Carrier Forwarding (Live Telephony)
                      </span>
                    </div>
                    <Badge className="bg-blue-600 text-white text-[10px]">
                      Recommended
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Connect your existing Airtel, Jio, Vi, or BSNL mobile number via automated carrier call forwarding. Keep your existing SIM card; your AI receptionist will answer when your line is busy or unanswered.
                  </p>
                  <div className="pt-1 flex items-center gap-3">
                    <Link
                      to="/phone"
                      target="_blank"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-4"
                    >
                      Open Phone Onboarding Hub in new tab <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Off-Hours Fallback Routine
                  </label>
                  <select
                    value={data.offHoursRouting}
                    onChange={(e) => updateField("offHoursRouting", e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#087F8C]"
                  >
                    <option value="Emergency voicemail with automated transcription and adjuster alert">
                      Emergency voicemail with automated transcription and adjuster alert
                    </option>
                    <option value="Forward urgent calls to emergency on-call adjuster mobile">
                      Forward urgent calls to emergency on-call adjuster mobile
                    </option>
                    <option value="Polite callback scheduling prompt with next-business-day slot">
                      Polite callback scheduling prompt with next-business-day slot
                    </option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: TEST YOUR ASSISTANT */}
          {data.step === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900">Test Your Assistant</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Try an interactive voice test using the identity and greeting configured in previous steps.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-[#FAF9F6] p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-xl bg-white border border-slate-200 text-[#087F8C] shadow-2xs">
                      <Mic className="size-4" />
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Microphone Status</div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {micPermission === "granted"
                          ? "Permission Granted (Ready)"
                          : micPermission === "denied"
                          ? "Permission Blocked in Browser"
                          : "Not Requested Yet"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {micPermission !== "granted" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={checkMicPermission}
                        className="text-xs border-slate-300"
                      >
                        Check Microphone
                      </Button>
                    ) : null}

                    {!isTestSessionActive ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={startTestSession}
                        className="text-xs bg-[#087F8C] text-white hover:bg-[#076C77] gap-1.5"
                      >
                        <Play className="size-3.5 fill-white" /> Start Interactive Test
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={stopTestSession}
                        className="text-xs gap-1.5"
                      >
                        <Square className="size-3.5 fill-white" /> End Test
                      </Button>
                    )}
                  </div>
                </div>

                {/* Conversation Box */}
                <div className="min-h-48 max-h-64 overflow-y-auto space-y-2.5 p-3 rounded-xl bg-white border border-slate-200 text-xs">
                  {testLog.length === 0 ? (
                    <div className="h-40 grid place-items-center text-center text-slate-400">
                      <div>
                        <Bot className="size-6 text-slate-300 mx-auto mb-1" />
                        <p>Click "Start Interactive Test" to initiate conversation with {data.agentName}.</p>
                      </div>
                    </div>
                  ) : (
                    testLog.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                            msg.sender === "user"
                              ? "bg-[#172033] text-white rounded-br-xs"
                              : "bg-[#E6F6F7] text-slate-900 rounded-bl-xs border border-[#087F8C]/20"
                          }`}
                        >
                          <span className="font-semibold block text-[10px] text-slate-400 mb-0.5">
                            {msg.sender === "user" ? "Caller" : data.agentName}
                          </span>
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {isTestSessionActive && (
                  <div className="flex gap-2 pt-1">
                    <Input
                      placeholder="Type a policy or claim test question (e.g. 'How do I file a cashless claim?')..."
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendTestMessage()}
                      className="text-xs bg-white border-slate-200"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={sendTestMessage}
                      className="bg-[#087F8C] text-white hover:bg-[#076C77] text-xs font-mono"
                    >
                      Send
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 8: REVIEW AND FINISH */}
          {data.step === 7 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900">Review & Finish Setup</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Verify your configuration before activating your insurance command center.
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-[#FAF9F6] p-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                      Organisation
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {data.organizationName || "My Insurance Agency"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {data.businessType} &bull; {data.linesOfInsurance.join(", ")}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => goToStep(1)}
                    className="text-xs text-[#087F8C]"
                  >
                    Edit
                  </Button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-[#FAF9F6] p-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                      AI Assistant
                    </div>
                    <div className="text-sm font-bold text-slate-900">{data.agentName}</div>
                    <div className="text-xs text-slate-500">
                      {data.voiceStyle} &bull; {data.supportedLanguages.join(", ")}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => goToStep(2)}
                    className="text-xs text-[#087F8C]"
                  >
                    Edit
                  </Button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-[#FAF9F6] p-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                      Authorized Workflows
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {data.supportedWorkflows.length} Workflows Enabled
                    </div>
                    <div className="text-xs text-slate-500">
                      FNOL intake, policy queries, and human adjuster escalation.
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => goToStep(3)}
                    className="text-xs text-[#087F8C]"
                  >
                    Edit
                  </Button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-[#FAF9F6] p-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                      Call Channel & Readiness
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      Browser WebRTC Active
                    </div>
                    <div className="text-xs text-slate-500">
                      Ready for browser calls and adjuster verification.
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => goToStep(5)}
                    className="text-xs text-[#087F8C]"
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Wizard Footer Controls */}
          <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between">
            {data.step > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                disabled={saveMutation.isPending}
                className="text-xs font-mono gap-1.5 border-slate-200"
              >
                <ChevronLeft className="size-4" /> Back
              </Button>
            ) : (
              <div />
            )}

            {data.step < STEPS.length - 1 ? (
              <Button
                size="sm"
                onClick={handleNext}
                disabled={saveMutation.isPending}
                className="bg-[#087F8C] hover:bg-[#076C77] text-white text-xs font-mono gap-1.5 px-5"
              >
                {saveMutation.isPending ? "Saving..." : "Continue"} <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleFinishSetup}
                disabled={saveMutation.isPending}
                className="bg-[#087F8C] hover:bg-[#076C77] text-white text-xs font-mono gap-1.5 px-6"
              >
                {saveMutation.isPending ? "Activating..." : "Finish Setup"} <Check className="size-4" />
              </Button>
            )}
          </div>
        </Card>
      </main>

      {/* Footer Branding */}
      <footer className="max-w-4xl mx-auto w-full pt-4 text-center text-xs text-slate-400 font-mono">
        InsurCall Enterprise AI Platform &bull; Multi-Tenant Database Isolation &bull; IRDAI Compliance Ready
      </footer>
    </div>
  );
}
