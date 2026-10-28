import React, { useState } from "react";
import {
  PhoneIncoming,
  ShieldCheck,
  Brain,
  Database,
  CheckCircle2,
  UserCheck,
  FileText,
  Lock,
  ArrowRight,
  Info,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface StepDetail {
  id: string;
  stepNumber: string;
  name: string;
  shortDesc: string;
  agentRole: string;
  requiredData: string;
  sourceSystem: string;
  validationRule: string;
  humanApproval: string;
  persistedRecord: string;
}

const WORKFLOW_STEPS: StepDetail[] = [
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
    persistedRecord: "Initial call session row in call_sessions table with room ID and start timestamp.",
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
    persistedRecord: "otp_verified_until timestamp updated in call_sessions and risk_state evaluated.",
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
    persistedRecord: "Structured metadata updated in call_sessions.metadata.",
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
    persistedRecord: "Audit row inserted into agent_actions with parameters and verified outcome.",
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
    persistedRecord: "New claim intake row created in claims table with status 'submitted'.",
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
    persistedRecord: "Human escalation row with urgency, reason, and assigned team member.",
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
    persistedRecord: "Final ended_at timestamp, duration_sec, and full JSON transcript array persisted.",
  },
];

export function InsuranceWorkflowShowcase() {
  const [selectedStep, setSelectedStep] = useState<StepDetail | null>(null);

  return (
    <section id="claims-workflow" className="py-24 bg-white border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <Badge
            variant="outline"
            className="border-[#087F8C]/30 bg-[#E6F6F7] text-[#087F8C] text-[11px] font-mono tracking-wider uppercase mb-3 font-semibold"
          >
            End-to-End Governance
          </Badge>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111827]">
            From a conversation to a traceable insurance workflow.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#344054] leading-relaxed">
            Every customer call moves through an auditable, step-by-step pipeline. Click any phase below to inspect the data requirements, validation checks, and compliance rules applied.
          </p>
        </div>

        {/* Illustrated Workflow Horizontal Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
          {WORKFLOW_STEPS.map((step) => {
            const isSelected = selectedStep?.id === step.id;
            return (
              <div
                key={step.id}
                onClick={() => setSelectedStep(step)}
                className={`group relative rounded-2xl border p-5 cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? "bg-[#E6F5F6] border-[#087E8B]/50 text-[#111827] shadow-lg scale-[1.02]"
                    : "bg-[#FAF9F6] border-slate-200/90 text-slate-800 hover:border-[#087F8C]/50 hover:bg-white hover:shadow-md"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-[#087E8B]">
                      {step.stepNumber}
                    </span>
                    <Info
                      className={`size-3.5 transition-opacity ${
                        isSelected ? "text-[#087E8B] opacity-80" : "text-slate-400 opacity-60 group-hover:opacity-100"
                      }`}
                    />
                  </div>
                  <h3 className="font-display text-sm font-bold leading-tight text-[#111827]">
                    {step.name}
                  </h3>
                  <p
                    className={`mt-2 text-[11px] leading-relaxed line-clamp-3 ${
                      isSelected ? "text-slate-600" : "text-[#667085]"
                    }`}
                  >
                    {step.shortDesc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-1 font-mono text-[10px]">
                  <span className="text-[#087E8B]">Inspect Details</span>
                  <ArrowRight className="size-2.5 text-[#087E8B]" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Step Detail Panel */}
        {selectedStep && (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold bg-[#087F8C] text-white px-2.5 py-1 rounded-lg">
                  PHASE {selectedStep.stepNumber}
                </span>
                <h4 className="font-display text-xl font-bold text-[#111827]">
                  {selectedStep.name} Detail Specification
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStep(null)}
                className="size-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-black hover:bg-slate-100"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
              <div className="space-y-1">
                <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider block">
                  Agent Operational Role
                </span>
                <p className="text-slate-800 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                  {selectedStep.agentRole}
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider block">
                  Required Input Data
                </span>
                <p className="text-slate-800 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                  {selectedStep.requiredData}
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider block">
                  Authorised System Source
                </span>
                <p className="text-slate-800 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                  {selectedStep.sourceSystem}
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider block">
                  Validation & Risk Rule
                </span>
                <p className="text-slate-800 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                  {selectedStep.validationRule}
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider block">
                  Human Approval Required?
                </span>
                <p className="text-slate-800 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                  {selectedStep.humanApproval}
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider block">
                  Persisted Database Record
                </span>
                <p className="text-slate-800 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                  {selectedStep.persistedRecord}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
