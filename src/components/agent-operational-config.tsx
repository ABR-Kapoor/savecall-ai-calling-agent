import React from "react";
import { ShieldAlert, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export const EMERGENCY_CONTACT_PRESETS = [
  { id: "cashless", label: "Cashless Hospital Desk", value: "+91 80000 12345 (24/7 Cashless Desk)" },
  { id: "medical", label: "Medical / Ambulance Emergency", value: "108" },
  { id: "national", label: "National Emergency", value: "112" },
];

export interface AgentOperationalConfigProps {
  emergencyHelpline: string;
  onEmergencyHelplineChange: (value: string) => void;
  customInstructions: string;
  onCustomInstructionsChange: (value: string) => void;
  canAnswerQuestions: boolean;
  onCanAnswerQuestionsChange: (value: boolean) => void;
  canIntakeClaims: boolean;
  onCanIntakeClaimsChange: (value: boolean) => void;
  canCaptureLeads: boolean;
  onCanCaptureLeadsChange: (value: boolean) => void;
  canTransfer: boolean;
  onCanTransferChange: (value: boolean) => void;
}

const FINE_TUNE_CAPABILITIES = [
  {
    key: "can_answer_questions",
    title: "Answer policy coverage questions",
    hint: "Answers caller questions strictly using approved, grounded knowledge.",
  },
  {
    key: "can_intake_claims",
    title: "Initiate accident First Notice of Loss (FNOL)",
    hint: "Captures policyholder, incident date, and loss details into a draft claim record.",
  },
  {
    key: "can_capture_leads",
    title: "Capture renewal & policyholder lead details",
    hint: "Records renewal enquiries and contact details for staff follow-up.",
  },
  {
    key: "can_transfer",
    title: "Escalate high-risk changes to staff adjusters",
    hint: "Routes ungrounded or high-risk inquiries to the human escalation queue.",
  },
] as const;

export function AgentOperationalConfig({
  emergencyHelpline,
  onEmergencyHelplineChange,
  customInstructions,
  onCustomInstructionsChange,
  canAnswerQuestions,
  onCanAnswerQuestionsChange,
  canIntakeClaims,
  onCanIntakeClaimsChange,
  canCaptureLeads,
  onCanCaptureLeadsChange,
  canTransfer,
  onCanTransferChange,
}: AgentOperationalConfigProps) {
  return (
    <div className="space-y-4">
      {/* Emergency 24x7 Helpline / Cashless Hospital Desk */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#E6F6F7] text-[#087F8C]">
            <ShieldAlert className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Emergency 24x7 Helpline / Cashless Hospital Desk</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Immediate emergency contact surfaced to callers during accident and hospitalization conversations.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agent-helpline" className="text-xs font-medium text-slate-700">
                Emergency Helpline
              </Label>
              <Input
                id="agent-helpline"
                value={emergencyHelpline}
                onChange={(e) => onEmergencyHelplineChange(e.target.value)}
                placeholder="+91 80000 12345 (24/7 Cashless Desk)"
                className="text-xs bg-white border-slate-200"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {EMERGENCY_CONTACT_PRESETS.map((preset) => {
                const isActive = emergencyHelpline === preset.value;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onEmergencyHelplineChange(preset.value)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                      isActive
                        ? "bg-[#087F8C] text-white border-[#087F8C]"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-400">
              Provide the 24/7 cashless hospital desk number so the agent can advise on network hospital options and
              emergency cashless procedures during calls.
            </p>
          </div>
        </div>
      </section>

      {/* Fine-Tuned Specific Rules & Guidance */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
            <Sparkles className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Fine-Tuned Specific Rules & Guidance</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tailor the assistant behavior with organisation-specific policy language and escalation boundaries.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agent-instructions" className="text-xs font-medium text-slate-700">
                Fine-Tuned Rules & Guidance
              </Label>
              <Textarea
                id="agent-instructions"
                rows={4}
                value={customInstructions}
                onChange={(e) => onCustomInstructionsChange(e.target.value)}
                placeholder="Prioritize cashless network hospitals in Bangalore; always ask policyholder ID before quoting coverage."
                className="text-xs bg-white border-slate-200 leading-relaxed"
              />
            </div>

            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-semibold text-slate-600 block">Authorized Capabilities</span>
              <div className="space-y-2">
                {FINE_TUNE_CAPABILITIES.map((capability) => {
                  const isChecked = capability.key === "can_answer_questions"
                    ? canAnswerQuestions
                    : capability.key === "can_intake_claims"
                      ? canIntakeClaims
                      : capability.key === "can_capture_leads"
                        ? canCaptureLeads
                        : canTransfer;
                  const handleChecked = capability.key === "can_answer_questions"
                    ? onCanAnswerQuestionsChange
                    : capability.key === "can_intake_claims"
                      ? onCanIntakeClaimsChange
                      : capability.key === "can_capture_leads"
                        ? onCanCaptureLeadsChange
                        : onCanTransferChange;
                  return (
                    <div key={capability.key} className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-slate-100 bg-[#FAF9F6]">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-900 block">{capability.title}</span>
                        <span className="text-[11px] text-slate-500">{capability.hint}</span>
                      </div>
                      <Switch checked={isChecked} onCheckedChange={handleChecked} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
