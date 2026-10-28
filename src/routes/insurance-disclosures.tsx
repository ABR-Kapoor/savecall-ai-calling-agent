import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";

const sections: LegalSection[] = [
  {
    heading: "What InsurCall provides",
    paragraphs: [
      "InsurCall builds software for insurance customer support workflows, including AI-assisted answering over WhatsApp and voice, structured claims-intake capture, and human review escalation.",
      "The product is a software provider for organisations that already handle insurance relationships, not a general insurance company selling policies to end customers directly.",
    ],
  },
  {
    heading: "What InsurCall does not do",
    bullets: [
      "It does not itself issue policies, set premiums, or bind coverage without a verified underwriting workflow.",
      "It does not independently approve or deny claims unless a specifically authorised and verified human decision workflow exists for the customer.",
      "It does not guarantee claim outcomes, coverage amounts, or settlement timelines.",
      "It does not act as an insurer, broker, corporate agent, or IRDAI-authorised intermediary unless documentary evidence and legal review establish that status.",
    ],
  },
  {
    heading: "Customer responsibility",
    paragraphs: [
      "The insurance organisation whose assistant, knowledge base or staff handle a customer remains responsible for its policies, coverage decisions, claim decisions, authorised advice, and compliance with applicable insurance and consumer-protection law.",
      "AI-generated guidance must not be presented to customers as independent legal, medical or underwriting advice without human review where appropriate.",
    ],
  },
  {
    heading: "Current status",
    paragraphs: [
      "Pilot-stage feature classification. Additional insurance-specific disclosures must be completed before any product feature moves beyond the pilot into commercial use.",
    ],
    note: "OWNER CONFIRMATION REQUIRED: Whether the deploying organisations are themselves licensed insurers, intermediaries, or another regulated party, and whether any insurance-specific disclosures apply to them. This page must not be read as a substitute for legal advice or regulator authorisation.",
  },
];

function InsuranceDisclosuresPage() {
  return (
    <LegalPage
      title="Insurance Disclosures"
      eyebrow="Legal · Insurance"
      intro="What InsurCall's software does and does not do in insurance conversations, and where responsibility sits for binding decisions."
      updated="October 2026"
      sections={sections}
    >
      <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-[#475467]">
          For insurance-specific questions, contact the InsurCall support team at{" "}
          <a className="font-semibold text-[#087F8C] underline-offset-4 hover:underline" href="mailto:lightlanister@gmail.com">
            lightlanister@gmail.com
          </a>
          .
        </p>
      </div>
    </LegalPage>
  );
}

export const Route = createFileRoute("/insurance-disclosures")({
  head: () => ({
    meta: [
      { title: "Insurance Disclosures | InsurCall" },
      { name: "description", content: "InsurCall insurance disclosures: software role, AI limits and human decision responsibility." },
    ],
  }),
  component: InsuranceDisclosuresPage,
});
