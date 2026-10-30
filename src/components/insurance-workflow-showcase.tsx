import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  PhoneIncoming,
  ShieldCheck,
  Brain,
  Database,
  CheckCircle2,
  UserCheck,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WorkflowSlide {
  id: string;
  stepNumber: string;
  badge: string;
  tabLabel: string;
  title: string;
  subtitle: string;
  image: string;
  icon: any;
}

const WORKFLOW_SLIDES: WorkflowSlide[] = [
  {
    id: "step-1",
    stepNumber: "01",
    tabLabel: "01 Call Gateway",
    badge: "Carrier Telephony Trunk",
    title: "Instant Inbound Call Answering",
    subtitle: "Inbound customer telephone line or WebRTC connection receives calls with sub-second latency in natural English, Hindi, or Hinglish.",
    image: "/campaign_indian_business.jpg",
    icon: PhoneIncoming,
  },
  {
    id: "step-2",
    stepNumber: "02",
    tabLabel: "02 Identity OTP",
    badge: "Cryptographic 2FA",
    title: "Cryptographic OTP Identity Verification",
    subtitle: "Verifies policyholder identity via phone lookup and 6-digit SMS OTP with strict rate-limiting before accessing sensitive records.",
    image: "/insurance_service_desk.jpg",
    icon: ShieldCheck,
  },
  {
    id: "step-3",
    stepNumber: "03",
    tabLabel: "03 Intent NLP",
    badge: "InsurTech AI Engine",
    title: "Conversational Intent & Entity Extraction",
    subtitle: "Listens with polite turn-taking, classifies caller queries into insurance taxonomy, and extracts critical entities.",
    image: "/insurance_workstreams.jpg",
    icon: Brain,
  },
  {
    id: "step-4",
    stepNumber: "04",
    tabLabel: "04 Grounded RAG",
    badge: "Isolated Tenant RLS",
    title: "Approved Policy & Active Claim Retrieval",
    subtitle: "Retrieves ground-truth coverage terms and active claim history with multi-tenant row-level security and zero cross-tenant leakage.",
    image: "/usecase_insurance.jpg",
    icon: Database,
  },
  {
    id: "step-5",
    stepNumber: "05",
    tabLabel: "05 Validated Action",
    badge: "Schema Enforced",
    title: "Validated Next Action & Claims Intake",
    subtitle: "Structures First Notice of Loss incident details with Zod validation or dispatches official claim status summaries via SMS.",
    image: "/insurance_fnol_workflow.jpg",
    icon: CheckCircle2,
  },
  {
    id: "step-6",
    stepNumber: "06",
    tabLabel: "06 Human Review",
    badge: "Supervisor Dual-Control",
    title: "Seamless Human Supervisor Review",
    subtitle: "Prepares executive summaries and transfers high-consequence disputes or large claims to licensed adjusters without losing context.",
    image: "/insurance_human_review.jpg",
    icon: UserCheck,
  },
  {
    id: "step-7",
    stepNumber: "07",
    tabLabel: "07 Audit Trail",
    badge: "Regulatory Compliance",
    title: "Immutable Audio & Transcript Archival",
    subtitle: "Stores complete turn-by-turn verbatim transcripts, audio recordings, latency logs, and triggers webhooks to carrier CRM.",
    image: "/insurance_hero_campaign.jpg",
    icon: Lock,
  },
];

export function InsuranceWorkflowShowcase() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? WORKFLOW_SLIDES.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === WORKFLOW_SLIDES.length - 1 ? 0 : prev + 1));
  };

  const activeSlide = WORKFLOW_SLIDES[currentIndex] ?? WORKFLOW_SLIDES[0]!;
  const Icon = activeSlide.icon;

  return (
    <section id="claims-workflow" className="py-20 sm:py-24 bg-white border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-8 sm:mb-12">
          <Badge
            variant="outline"
            className="border-[#087F8C]/30 bg-[#E6F6F7] text-[#087F8C] text-[11px] font-mono tracking-wider uppercase mb-3 font-semibold"
          >
            End-to-End Governance Carousel
          </Badge>
          <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-[#111827]">
            From a conversation to a traceable insurance workflow.
          </h2>
          <p className="mt-2.5 sm:mt-3 text-sm sm:text-base text-[#475467] leading-relaxed">
            Every customer call moves through an auditable, step-by-step pipeline. Tap through the phases to explore the workflow.
          </p>
        </div>

        {/* Phase Pill Strip Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-4 mb-4">
          {WORKFLOW_SLIDES.map((slide, idx) => {
            const SlideIcon = slide.icon;
            const isActive = idx === currentIndex;
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#087F8C] text-white shadow-sm ring-2 ring-[#087F8C]/20"
                    : "bg-[#FAF9F6] border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs"
                }`}
              >
                <SlideIcon className={`size-3.5 ${isActive ? "text-white" : "text-[#087F8C]"}`} />
                <span>{slide.tabLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Main Cinematic Workflow Carousel Card */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-[32px] border border-slate-800/80 bg-slate-950 shadow-2xl group">
          {/* Main Image */}
          <div className="relative h-[360px] sm:h-[500px] w-full overflow-hidden">
            <img
              src={activeSlide.image}
              alt={activeSlide.title}
              className="size-full object-cover transition-all duration-700 transform group-hover:scale-[1.02]"
            />

            {/* Gradient Dark Backdrop for Text Legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10 pointer-events-none" />

            {/* Top Right Phase Step Badge */}
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 rounded-full bg-black/50 backdrop-blur-md border border-white/15 px-3 py-1 font-mono text-xs font-semibold text-white">
              <span className="text-[#10A6AE]">PHASE {activeSlide.stepNumber}</span>
              <span className="text-white/40">/</span>
              <span className="text-white/70">0{WORKFLOW_SLIDES.length}</span>
            </div>

            {/* Bottom Content: Badge, Title, Subtitle */}
            <div className="absolute bottom-0 inset-x-0 p-5 sm:p-10 space-y-2 sm:space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#087F8C]/90 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-white border border-white/20">
                <Icon className="size-3.5" />
                <span>{activeSlide.badge}</span>
              </div>

              <h3 className="font-display text-xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight">
                {activeSlide.title}
              </h3>

              <p className="text-xs sm:text-base text-slate-200 leading-relaxed max-w-2xl">
                {activeSlide.subtitle}
              </p>
            </div>
          </div>

          {/* Previous / Next Arrow Controls */}
          <div className="absolute bottom-5 right-5 sm:bottom-8 sm:right-8 flex items-center gap-2">
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Previous phase"
              className="grid size-10 sm:size-12 place-items-center rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-md border border-white/30 transition-all active:scale-95 cursor-pointer shadow-lg"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next phase"
              className="grid size-10 sm:size-12 place-items-center rounded-full bg-[#087F8C] hover:bg-[#076C77] text-white backdrop-blur-md border border-white/30 transition-all active:scale-95 cursor-pointer shadow-lg"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>

        {/* Indicator Dots */}
        <div className="mt-4 flex items-center justify-center gap-2">
          {WORKFLOW_SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to phase ${idx + 1}`}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === currentIndex ? "w-8 bg-[#087F8C]" : "w-2 bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
