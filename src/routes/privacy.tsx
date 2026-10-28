import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { Link } from "@tanstack/react-router";

const sections: LegalSection[] = [
  {
    heading: "Who InsurCall is",
    paragraphs: [
      "InsurCall provides an AI customer-support platform used by insurance organisations. The platform connects an organisation's approved business knowledge to WhatsApp conversations handled on its behalf.",
      "InsurCall is being operated in a pilot stage. The repository does not yet confirm the company's legal entity name, registration number, registered office, or Data Protection Officer under Indian law. Those details require owner confirmation and must not be represented as verified without it.",
      "The supplied business name for this offering is InsurCall Agent and the supplied address is NIT RAIPUR, which is incomplete and must not be treated as a verified registered office.",
      "For privacy enquiries, contact: lightlanister@gmail.com.",
    ],
  },
  {
    heading: "The two roles in the service",
    bullets: [
      "Business customer: the organisation that owns the assistant, knowledge base, WhatsApp connection and staff workspace.",
      "Individual insurance customer: the policyholder or claimant interacting with that organisation's assistant, usually over WhatsApp.",
      "InsurCall's role as software provider is separate from a business customer's role as data controller or fiduciary for its own customers, where applicable.",
    ],
  },
  {
    heading: "Data categories handled",
    bullets: [
      "Account, organisation and staff identity data.",
      "WhatsApp conversation content, contact names and identifiers, timestamps, delivery and read status, and call metadata.",
      "Customer-submitted files, knowledge documents, extracted text and vector embeddings.",
      "AI prompts, responses and retrieval traces.",
      "Support requests, consent evidence and security or audit logs.",
      "Backups and disaster-recovery copies.",
    ],
  },
  {
    heading: "Purposes",
    bullets: [
      "Answering policy questions using approved organisational knowledge.",
      "Collecting structured information for claims intake and first notice of loss workflows.",
      "Escalating uncertain, conflicting or sensitive enquiries to authorised staff.",
      "Operating support, audit and security functions.",
      "Improving the product, subject to the stated safeguards on automated model training.",
    ],
  },
  {
    heading: "Legal basis, consent and AI processing",
    paragraphs: [
      "InsurCall processes personal data in line with the Digital Personal Data Protection Act, 2023 and the related rules notified by the Ministry of Electronics and Information Technology, subject to the phased commencement position that must be confirmed by the deploying compliance team.",
      "Consent is treated categorically: customer-initiated support, business-initiated messaging, opt-out handling, and recording or transcription where technically implemented and lawfully disclosed.",
      "AI inference is intended to run through local or self-hosted infrastructure by default; per-tenant configuration may allow an external model provider only where explicitly enabled.",
      "Audio recording or transcription, and any cloud fallback for AI, require technical verification before they can be described as active capabilities.",
    ],
  },
  {
    heading: "Sharing and subprocessors",
    paragraphs: [
      "Personal data is shared only with the service providers required for operation, or as otherwise disclosed in the Subprocessors page.",
    ],
  },
  {
    heading: "Retention, rights and security",
    paragraphs: [
      "Retention and deletion behaviour, individual data rights requests, and security safeguards are described separately in the Retention Policy, Data Rights page, Security page and Subprocessors page.",
    ],
  },
];

function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      eyebrow="Legal · Privacy"
      intro="How InsurCall handles personal data during its pilot programme, and how that fits with the insurance organisations that use it."
      updated="October 2026"
      sections={sections}
    >
      <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-[#475467]">
          Contact our privacy team at{" "}
          <a className="font-semibold text-[#087F8B] underline-offset-4 hover:underline" href="mailto:lightlanister@gmail.com">
            lightlanister@gmail.com
          </a>
          .
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/data-rights"
            className="inline-flex items-center justify-center rounded-xl bg-[#087F8C] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#076C77]"
          >
            Exercise a data right
          </Link>
          <Link
            to="/subprocessors"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-[#111827] transition-colors hover:bg-slate-50"
          >
            View subprocessors
          </Link>
        </div>
      </div>
    </LegalPage>
  );
}

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | InsurCall" },
      {
        name: "description",
        content:
          "InsurCall pilot privacy policy: data categories, purposes, AI processing, retention, rights and contact for privacy enquiries.",
      },
    ],
  }),
  component: PrivacyPage,
});
