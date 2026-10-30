import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Search,
  Clock,
  Sparkles,
  UserCheck,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CapabilitySlide {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  image: string;
  category: string;
  icon: any;
}

const CAPABILITY_SLIDES: CapabilitySlide[] = [
  {
    id: "fnol",
    badge: "Claims Intake Specialist",
    category: "Claims Intake (FNOL)",
    title: "First Notice of Loss: Instant Structured Intake",
    subtitle: "When incidents occur, AI captures location, timestamps, vehicle damages, and sends document upload links within seconds.",
    image: "/insurance_fnol_workflow.jpg",
    icon: FileText,
  },
  {
    id: "policy",
    badge: "Grounded Truth",
    category: "Policy Advisor",
    title: "Verified Policy Enquiry & Clause Citation",
    subtitle: "Answers cite exact wording from authorized schedules and policy master wordings with zero hallucinations.",
    image: "/insurance_service_desk.jpg",
    icon: Search,
  },
  {
    id: "status",
    badge: "Transparent Tracking",
    category: "Claim Status",
    title: "Real-Time 6-Stage Claims Lifecycle Milestones",
    subtitle: "Callers get factual status stages from initial intake and surveyor assignment to final cashless hospital discharge.",
    image: "/insurance_workstreams.jpg",
    icon: Clock,
  },
  {
    id: "renewal",
    badge: "Policy Servicing",
    category: "Renewals & Servicing",
    title: "Instant Policy Renewals & NCB Servicing",
    subtitle: "Calculates No Claim Bonus discounts, explains coverage riders, and dispatches instant verified payment links via WhatsApp.",
    image: "/usecase_insurance.jpg",
    icon: Sparkles,
  },
  {
    id: "escalation",
    badge: "Supervisor Oversight",
    category: "Human Review",
    title: "Seamless Human Adjuster Handoff with Live Context",
    subtitle: "Disputed claims transfer immediately to licensed adjusters with pre-populated notes so callers never repeat themselves.",
    image: "/insurance_human_review.jpg",
    icon: UserCheck,
  },
];

export function InsuranceCapabilities() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? CAPABILITY_SLIDES.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === CAPABILITY_SLIDES.length - 1 ? 0 : prev + 1));
  };

  const activeSlide = CAPABILITY_SLIDES[currentIndex] ?? CAPABILITY_SLIDES[0]!;
  const Icon = activeSlide.icon;

  return (
    <section id="capabilities" className="py-20 sm:py-24 bg-[#FAF9F6]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-8 sm:mb-12">
          <Badge
            variant="outline"
            className="border-[#087F8C]/30 bg-[#E6F6F7] text-[#087F8C] text-[11px] font-mono tracking-wider uppercase mb-3 font-semibold"
          >
            Visual Capabilities Carousel
          </Badge>
          <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-[#111827]">
            Workflows designed for real insurance operations.
          </h2>
          <p className="mt-2.5 sm:mt-3 text-sm sm:text-base text-[#475467] leading-relaxed">
            Explore how InsurCall manages claims intake, policy limit inspections, and human escalation through image-guided workflows.
          </p>
        </div>

        {/* Carousel Pill Strip Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-4 mb-4">
          {CAPABILITY_SLIDES.map((slide, idx) => {
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
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
                }`}
              >
                <SlideIcon className={`size-3.5 ${isActive ? "text-white" : "text-[#087F8C]"}`} />
                <span>{slide.category}</span>
              </button>
            );
          })}
        </div>

        {/* Main Cinematic Visual Carousel Card */}
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

            {/* Top Right Slide Counter */}
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 rounded-full bg-black/50 backdrop-blur-md border border-white/15 px-3 py-1 font-mono text-xs font-semibold text-white">
              <span className="text-[#10A6AE]">0{currentIndex + 1}</span>
              <span className="text-white/40">/</span>
              <span className="text-white/70">0{CAPABILITY_SLIDES.length}</span>
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
              aria-label="Previous capability"
              className="grid size-10 sm:size-12 place-items-center rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-md border border-white/30 transition-all active:scale-95 cursor-pointer shadow-lg"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next capability"
              className="grid size-10 sm:size-12 place-items-center rounded-full bg-[#087F8C] hover:bg-[#076C77] text-white backdrop-blur-md border border-white/30 transition-all active:scale-95 cursor-pointer shadow-lg"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>

        {/* Indicator Dots */}
        <div className="mt-4 flex items-center justify-center gap-2">
          {CAPABILITY_SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
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
