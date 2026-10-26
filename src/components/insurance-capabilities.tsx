import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  FileText,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  Search,
  UserCheck,
  ChevronRight,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const CLAIM_LIFECYCLE_STAGES = [
  { label: "Received", status: "completed", date: "14 Oct, 09:30 AM", note: "FNOL Call Captured" },
  { label: "Info Required", status: "completed", date: "14 Oct, 10:15 AM", note: "Repair Estimate Uploaded" },
  { label: "Under Review", status: "active", date: "Current Stage", note: "Surveyor Inspection Active" },
  { label: "Awaiting Action", status: "pending", date: "Estimated 22 Oct", note: "Carrier Sign-off" },
  { label: "Updated", status: "pending", date: "Pending", note: "Settlement Notice" },
  { label: "Closed", status: "pending", date: "Pending", note: "Claim Discharged" },
];

export function InsuranceCapabilities() {
  const [activeTab, setActiveTab] = useState<"fnol" | "policy" | "status" | "renewal" | "escalation">("fnol");

  return (
    <section id="capabilities" className="py-24 bg-[#FAF9F6]">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <Badge
            variant="outline"
            className="border-[#087F8C]/30 bg-[#E6F6F7] text-[#087F8C] text-[11px] font-mono tracking-wider uppercase mb-3 font-semibold"
          >
            Purpose-Built InsurTech
          </Badge>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111827]">
            Workflows designed for real insurance operations.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#344054] leading-relaxed">
            InsurCall is not a generic conversation bot. Explore how the platform structures claims intake, verifies policy limits, and manages human escalation.
          </p>
        </div>

        {/* Tab Navigation Pill Strip */}
        <div className="flex flex-wrap gap-2 pb-8 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("fnol")}
            className={`px-4 py-2 rounded-xl text-xs font-mono tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === "fnol"
                ? "bg-[#111827] text-white shadow-xs font-bold"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            A : First Notice of Loss
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("policy")}
            className={`px-4 py-2 rounded-xl text-xs font-mono tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === "policy"
                ? "bg-[#111827] text-white shadow-xs font-bold"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            B : Policy Enquiry Assistant
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("status")}
            className={`px-4 py-2 rounded-xl text-xs font-mono tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === "status"
                ? "bg-[#111827] text-white shadow-xs font-bold"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            C : Claim-Status Lifecycle
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("renewal")}
            className={`px-4 py-2 rounded-xl text-xs font-mono tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === "renewal"
                ? "bg-[#111827] text-white shadow-xs font-bold"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            D : Renewal & Servicing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("escalation")}
            className={`px-4 py-2 rounded-xl text-xs font-mono tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === "escalation"
                ? "bg-[#111827] text-white shadow-xs font-bold"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            E : Human Escalation Queue
          </button>
        </div>

        {/* Dynamic Capability Body */}
        <div className="pt-8">
          {/* TAB A: FIRST NOTICE OF LOSS */}
          {activeTab === "fnol" && (
            <div className="grid lg:grid-cols-12 gap-8 items-center bg-white p-8 sm:p-12 rounded-[32px] border border-slate-200/90 shadow-sm animate-in fade-in duration-200">
              <div className="lg:col-span-5 space-y-5">
                <Badge variant="outline" className="text-[10px] font-mono uppercase bg-[#E6F6F7] text-[#087F8C] border-[#087F8C]/30">
                  Claims Intake Specialist
                </Badge>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#111827]">
                  First Notice of Loss: Structured Intake
                </h3>
                <p className="text-sm leading-relaxed text-[#475467]">
                  When a policyholder calls in distress after an incident, Anya gathers mandatory details patiently without missing critical regulatory fields.
                </p>
                <ul className="space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-[#087F8C] shrink-0" />
                    <span>Captures exact incident timestamp, location, and vehicle/property details</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-[#087F8C] shrink-0" />
                    <span>Identifies missing photos or third-party FIR requirements</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-[#087F8C] shrink-0" />
                    <span>Dispatches immediate SMS confirmation with document upload link</span>
                  </li>
                </ul>
                <div className="pt-2">
                  <Button asChild size="sm" className="bg-[#087F8C] hover:bg-[#076C77] text-white text-xs font-mono rounded-xl">
                    <Link to="/claims">OPEN CLAIMS INTAKE CONSOLE</Link>
                  </Button>
                </div>
              </div>

              {/* FNOL Interactive Panel Preview */}
              <div className="lg:col-span-7">
                <div className="rounded-2xl border border-slate-200 bg-[#FAF9F6] p-6 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      Draft FNOL Report #FNOL-2026-0418
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono text-amber-800 bg-amber-50 border-amber-300 font-semibold">
                      Awaiting Surveyor Assignment
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-mono text-slate-400 block uppercase">Policy Number</span>
                      <span className="font-mono font-bold text-slate-900">POL-MOT-2024-8842</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-mono text-slate-400 block uppercase">Incident Timestamp</span>
                      <span className="font-mono text-slate-800">18 Oct, 08:45 AM IST</span>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 block uppercase">Reported Damage Specifics</span>
                    <p className="text-slate-800 leading-relaxed text-[11.5px]">
                      "Front bumper and right headlight assembly damaged after vehicle scraped barricade on Western Express Highway. No third-party injury reported."
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-mono text-slate-400 block uppercase">Required Documents</span>
                      <span className="text-slate-700 text-[11px] block mt-0.5">DL, RC Copy, Photos (4 required)</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-mono text-slate-400 block uppercase">Follow-up Action</span>
                      <span className="text-emerald-700 font-semibold text-[11px] block mt-0.5">SMS upload link sent</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB B: POLICY ENQUIRY ASSISTANT */}
          {activeTab === "policy" && (
            <div className="grid lg:grid-cols-12 gap-8 items-center bg-white p-8 sm:p-12 rounded-[32px] border border-slate-200/90 shadow-sm animate-in fade-in duration-200">
              <div className="lg:col-span-5 space-y-5">
                <Badge variant="outline" className="text-[10px] font-mono uppercase bg-[#E6F6F7] text-[#087F8C] border-[#087F8C]/30">
                  Grounded Truth
                </Badge>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#111827]">
                  Policy Enquiry with Source Inspection
                </h3>
                <p className="text-sm leading-relaxed text-[#475467]">
                  Never hallucinate coverage clauses. Answers cite exact document sections from your authorized policy schedule and terms wording.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>If a source cannot be verified with certainty, the answer is flagged as unverified and routed for staff review.</span>
                </div>
                <div className="pt-2">
                  <Button asChild size="sm" variant="outline" className="border-slate-300 text-xs font-mono rounded-xl">
                    <Link to="/policies">EXPLORE POLICY PORTFOLIO</Link>
                  </Button>
                </div>
              </div>

              {/* Source Inspection Panel */}
              <div className="lg:col-span-7">
                <div className="rounded-2xl border border-slate-200 bg-[#FAF9F6] p-6 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className="font-mono text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Database className="size-3.5 text-[#087F8C]" /> Verified Source Inspection
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border-emerald-300">
                      Grounded Citation
                    </Badge>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                    <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider block">
                      Policyholder Query
                    </span>
                    <p className="text-slate-900 font-semibold text-[12px]">
                      "Does my family health policy cover robotic surgery procedures?"
                    </p>
                  </div>

                  <div className="bg-[#E6F6F7]/60 p-4 rounded-xl border border-[#087F8C]/20 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-[#087F8C] uppercase tracking-wider font-bold">
                        Authorised Document Citation: Section 4.2.B
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">Health Master Wording v2024</span>
                    </div>
                    <p className="text-slate-800 text-[11.5px] leading-relaxed italic">
                      "Robotic surgery is covered up to 50% of the sum insured, subject to prior pre-authorization and network hospital admission."
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                    <span className="text-slate-600 font-medium text-[11px]">Assistant Response:</span>
                    <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Exact terms conveyed to caller
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB C: CLAIM-STATUS LIFECYCLE */}
          {activeTab === "status" && (
            <div className="bg-white p-8 sm:p-12 rounded-[32px] border border-slate-200/90 shadow-sm animate-in fade-in duration-200 space-y-8">
              <div className="max-w-2xl">
                <Badge variant="outline" className="text-[10px] font-mono uppercase bg-[#E6F6F7] text-[#087F8C] border-[#087F8C]/30 mb-2">
                  Transparent Progress Tracking
                </Badge>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#111827]">
                  The 6-Stage Claims Lifecycle
                </h3>
                <p className="text-sm text-[#475467] mt-2">
                  Policyholders get real status milestones. The system never gives vague "in-process" answers when specific workflow stages exist.
                </p>
              </div>

              {/* Visual 6-Stage Timeline */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {CLAIM_LIFECYCLE_STAGES.map((s, idx) => (
                  <div
                    key={s.label}
                    className={`rounded-2xl border p-4 text-xs flex flex-col justify-between ${
                      s.status === "completed"
                        ? "bg-emerald-50/60 border-emerald-200 text-emerald-950"
                        : s.status === "active"
                        ? "bg-[#172033] text-white border-[#10A6AE] shadow-md"
                        : "bg-slate-50 border-slate-200 text-slate-500 opacity-60"
                    }`}
                  >
                    <div>
                      <span className="font-mono text-[10px] font-bold block mb-1">
                        STAGE 0{idx + 1}
                      </span>
                      <h4 className="font-display font-bold text-sm leading-tight">{s.label}</h4>
                      <p className="text-[11px] mt-1.5 leading-snug">{s.note}</p>
                    </div>
                    <span className="font-mono text-[10px] mt-4 block opacity-80">{s.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB D: RENEWAL & SERVICING */}
          {activeTab === "renewal" && (
            <div className="grid lg:grid-cols-12 gap-8 items-center bg-white p-8 sm:p-12 rounded-[32px] border border-slate-200/90 shadow-sm animate-in fade-in duration-200">
              <div className="lg:col-span-5 space-y-5">
                <Badge variant="outline" className="text-[10px] font-mono uppercase bg-[#E6F6F7] text-[#087F8C] border-[#087F8C]/30">
                  Policy Servicing
                </Badge>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#111827]">
                  Renewals & Servicing Without Unauthorized Binding
                </h3>
                <p className="text-sm leading-relaxed text-[#475467]">
                  The assistant handles renewal quote queries, explains NCB (No Claim Bonus) tiers, and collects endorsement requests without unauthorized policy modifications.
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  High-consequence modifications (such as changing nominees, reducing deductibles, or updating insured address) are queued for licensed agent review.
                </p>
                <div className="pt-2">
                  <Button asChild size="sm" className="bg-[#111827] text-white text-xs font-mono rounded-xl">
                    <Link to="/change-requests">VIEW CHANGE REQUEST QUEUE</Link>
                  </Button>
                </div>
              </div>

              {/* Renewal Task Card */}
              <div className="lg:col-span-7">
                <div className="rounded-2xl border border-slate-200 bg-[#FAF9F6] p-6 space-y-3 shadow-xs text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <span className="font-mono font-bold text-slate-900">Renewal Notice: POL-CAR-7719</span>
                    <Badge variant="outline" className="text-[10px] font-mono text-[#087F8C] bg-[#E6F6F7]">
                      Expiring in 14 Days
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-mono text-slate-400 block uppercase">Existing Sum Insured</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">₹8,50,000</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-mono text-slate-400 block uppercase">Applicable NCB</span>
                      <span className="font-mono font-bold text-emerald-700 text-sm">35% Zero Claims</span>
                    </div>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-mono text-slate-400 block uppercase mb-1">Captured Customer Intent</span>
                    <p className="text-slate-800 text-[11px] leading-relaxed">
                      Policyholder requested renewal payment link with zero-dep rider retained. Instant payment link dispatched via verified WhatsApp & SMS.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB E: HUMAN ESCALATION QUEUE */}
          {activeTab === "escalation" && (
            <div className="grid lg:grid-cols-12 gap-8 items-center bg-white p-8 sm:p-12 rounded-[32px] border border-slate-200/90 shadow-sm animate-in fade-in duration-200">
              <div className="lg:col-span-5 space-y-5">
                <Badge variant="outline" className="text-[10px] font-mono uppercase bg-amber-50 text-amber-800 border-amber-300">
                  Supervisor Oversight
                </Badge>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#111827]">
                  Seamless Human Adjuster Handoff
                </h3>
                <p className="text-sm leading-relaxed text-[#475467]">
                  When a caller is distressed or a dispute arises, the call transfers immediately to a human claims specialist with full context pre-populated.
                </p>
                <p className="text-xs text-slate-600">
                  The human adjuster never needs to ask the customer to repeat their name, policy number, or story.
                </p>
                <div className="pt-2">
                  <Button asChild size="sm" className="bg-[#087F8C] hover:bg-[#076C77] text-white text-xs font-mono rounded-xl">
                    <Link to="/change-requests">OPEN COMPLIANCE WORKSPACE</Link>
                  </Button>
                </div>
              </div>

              {/* Handoff Packet Preview */}
              <div className="lg:col-span-7">
                <div className="rounded-2xl border border-slate-200 bg-[#FAF9F6] p-6 space-y-3 shadow-xs text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <span className="font-mono font-bold text-slate-900">
                      Live Handoff Packet #ESC-901
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono text-rose-800 bg-rose-50 border-rose-200 font-bold">
                      HIGH URGENCY
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-mono text-slate-400 block uppercase">Policyholder</span>
                      <span className="font-bold text-slate-900">Sunita Mukherjee</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-mono text-slate-400 block uppercase">Policy Reference</span>
                      <span className="font-mono text-slate-800">POL-HLT-2023-4109</span>
                    </div>
                  </div>

                  <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 text-xs">
                    <span className="font-mono text-[10px] text-amber-800 uppercase tracking-wider block font-bold mb-1">
                      Reason for Escalation
                    </span>
                    <p className="text-amber-950 text-[11.5px] leading-relaxed">
                      Hospital denial of cashless admission at network facility. Caller requires emergency intervention from Senior TPA Specialist.
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
                    <span>Assigned Adjuster: <strong className="text-slate-900">Ravi Shankar (TPA Desk)</strong></span>
                    <span className="text-emerald-700 font-semibold">Live Call Active</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
