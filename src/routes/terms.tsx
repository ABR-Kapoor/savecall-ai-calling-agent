import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";
import { Link } from "@tanstack/react-router";

const sections: LegalSection[] = [
  {
    heading: "The service",
    paragraphs: [
      "InsurCall provides software that supports insurance customer conversations, including AI-assisted answers grounded in approved organisational knowledge, structured claims-intake information, and human escalation workflows.",
      "The service is being operated in a pilot stage. Features, channels, integrations and availability may change, and some capabilities may be unavailable during the pilot.",
    ],
  },
  {
    heading: "Accounts and authorised use",
    paragraphs: [
      "Access is provided to invited business customers and their staff through the InsurCall console. The organisation that owns a workspace is responsible for determining who may access it and for the activity that occurs under its account.",
    ],
  },
  {
    heading: "Acceptable use",
    paragraphs: [
      "The service must be used only for lawful customer-support and operations purposes. Submitting content that is unlawful, misleading, or intended to harm others, or using the service to generate unsolicited commercial communications without appropriate consent, is not permitted.",
    ],
  },
  {
    heading: "WhatsApp and third-party services",
    paragraphs: [
      "The initial channel is WhatsApp messaging through a configured WhatsApp Business Platform or authorised gateway integration. WhatsApp messaging depends on third-party terms, permissions and platform policies that the deploying business customer must accept.",
      "InsurCall does not guarantee uninterrupted service, delivery, or availability because WhatsApp infrastructure, connectivity or provider behaviour may be outside InsurCall's control.",
    ],
  },
  {
    heading: "AI and human review",
    paragraphs: [
      "AI-generated answers are grounded where technically possible and may be incomplete or incorrect. The service does not, by itself, issue binding insurance policy decisions, guarantee coverage, approve or deny claims, or make underwriting decisions.",
      "Consequential actions remain subject to authorised human review and approval workflows where implemented.",
    ],
  },
  {
    heading: "Availability, changes, suspension and termination",
    paragraphs: [
      "The service may be modified, suspended or discontinued, in whole or in part, during the pilot. Termination of a customer's use remains subject to the commercial terms agreed between the business customer and InsurCall, once those terms exist.",
    ],
  },
  {
    heading: "Liability, indemnity and legal review",
    paragraphs: [
      "Liability, indemnity and dispute-resolution provisions must be completed and reviewed by qualified legal counsel before commercial use. Nothing in this page should be read as a substitute for legally advised agreements.",
    ],
  },
];

function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      eyebrow="Legal · Terms"
      intro="The terms under which a business customer may use InsurCall during its pilot programme."
      updated="October 2026"
      sections={sections}
    >
      <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-[#475467]">
          For terms and contracting questions, contact the InsurCall team at{" "}
          <a className="font-semibold text-[#087F8B] underline-offset-4 hover:underline" href="mailto:lightlanister@gmail.com">
            lightlanister@gmail.com
          </a>
          .
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/privacy"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-[#111827] transition-colors hover:bg-slate-50"
          >
            Read the Privacy Policy
          </Link>
          <Link
            to="/ai-disclosure"
            className="inline-flex items-center justify-center rounded-xl bg-[#087F8C] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#076C77]"
          >
            Read the AI Disclosure
          </Link>
        </div>
      </div>
    </LegalPage>
  );
}

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service | InsurCall" },
      { name: "description", content: "InsurCall pilot terms covering service scope, acceptable use, AI limits, WhatsApp dependency and termination." },
    ],
  }),
  component: TermsPage,
});
