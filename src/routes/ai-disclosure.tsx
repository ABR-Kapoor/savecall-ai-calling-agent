import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";

const sections: LegalSection[] = [
  {
    heading: "What you are interacting with",
    paragraphs: [
      "InsurCall operates automated AI assistants that speak with customers over WhatsApp and, where configured, voice channels. The assistant is software, not a human support agent, unless a human takeover is explicitly active in the relevant conversation.",
      "The assistant represents the insurance organisation that owns the InsurCall workspace, not InsurCall as a general insurer or intermediary.",
    ],
  },
  {
    heading: "What the assistant can do",
    bullets: [
      "Explain terms, coverage wording and exclusions supported by approved organisational knowledge.",
      "Explain claims-intake steps and first-notice-of-loss procedures.",
      "Escalate uncertain, conflicting or sensitive enquiries for human review.",
    ],
  },
  {
    heading: "What the assistant cannot do",
    bullets: [
      "Guarantee coverage, payout amounts or settlement outcomes.",
      "Approve or deny a claim, endorse a policy, or make an underwriting decision.",
      "Invent facts or present unverified policy details as confirmed.",
      "Perform actions outside the authorised human-review workflows.",
    ],
  },
  {
    heading: "Human escalation",
    paragraphs: [
      "When an answer is ungrounded, conflicting or requires consequential action, the assistant should hand the conversation to authorised staff. A human takeover must stop further automated replies for that conversation.",
    ],
  },
  {
    heading: "Sensitive information",
    paragraphs: [
      "Policyholders should avoid sending sensitive identifiers, financial data or unnecessary personal information unless the relevant support workflow genuinely requires it.",
      "The platform is designed to minimise collection of payment credentials, card numbers, CVVs and banking secrets.",
    ],
  },
  {
    heading: "Binding decisions",
    paragraphs: [
      "Binding insurance decisions remain with the relevant insurer, broker, corporate agent, TPA or authorised staff, subject to applicable law and internal controls.",
    ],
  },
];

function AiDisclosurePage() {
  return (
    <LegalPage
      title="AI Assistant Disclosure"
      eyebrow="Legal · AI"
      intro="What an InsurCall AI assistant is, what it can do, what it cannot do, and how human review fits in."
      updated="October 2026"
      sections={sections}
    >
      <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-[#475467]">
          Questions about AI behaviour or escalation can be sent to the InsurCall support team at{" "}
          <a className="font-semibold text-[#087F8B] underline-offset-4 hover:underline" href="mailto:lightlanister@gmail.com">
            lightlanister@gmail.com
          </a>
          .
        </p>
      </div>
    </LegalPage>
  );
}

export const Route = createFileRoute("/ai-disclosure")({
  head: () => ({
    meta: [
      { title: "AI Assistant Disclosure | InsurCall" },
      { name: "description", content: "How InsurCall's AI assistant should disclose its capabilities, limits and human escalation behaviour." },
    ],
  }),
  component: AiDisclosurePage,
});
