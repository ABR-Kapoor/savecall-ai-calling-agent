import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";

const sections: LegalSection[] = [
  {
    heading: "Roles",
    paragraphs: [
      "Where a business customer uses InsurCall to serve its own policyholders, InsurCall acts as a software processor or service provider and the business customer acts as data controller or fiduciary for those policyholders, as applicable.",
      "Within InsurCall's own pilot operations, account and staff data are processed by InsurCall on the basis of its legitimate interests and contractual necessity.",
    ],
  },
  {
    heading: "Processing purposes and categories",
    bullets: [
      "Support conversations: answering questions from approved knowledge and capturing claims-intake information.",
      "AI operations: local or explicitly permitted inference, embeddings, retrieval, response synthesis.",
      "Operations: authentication, tenancy isolation, messaging gateway, audit and security logging.",
      "Communications: WhatsApp messaging, templates, delivery events, escalation handoffs.",
    ],
  },
  {
    heading: "Lawful basis and consent",
    paragraphs: [
      "Personal data processing is carried out under the Digital Personal Data Protection Act, 2023 and related notified rules, with consent evidence captured where required and opt-outs enforced at the processing boundary.",
      "Processing that is not covered by an explicit consent or legal basis must not be performed.",
    ],
  },
  {
    heading: "Subprocessors and transfers",
    paragraphs: [
      "The current and potential subprocessors are listed on the Subprocessors page. International data transfers apply only where a processor or hosting region outside India processes data, and must be supported by appropriate safeguards.",
    ],
  },
  {
    heading: "Data subject rights and retention",
    paragraphs: [
      "Data subject rights requests, retention behaviour and deletion safeguards are handled through the Data Rights, Retention and Security pages respectively.",
    ],
  },
];

function DataProcessingPage() {
  return (
    <LegalPage
      title="Data Processing"
      eyebrow="Legal · Data"
      intro="How InsurCall describes processing purposes, roles and lawful bases for personal data during the pilot."
      updated="October 2026"
      sections={sections}
    >
      <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-[#475467]">
          Contact the InsurCall data-processing team at{" "}
          <a className="font-semibold text-[#087F8C] underline-offset-4 hover:underline" href="mailto:lightlanister@gmail.com">
            lightlanister@gmail.com
          </a>
          .
        </p>
      </div>
    </LegalPage>
  );
}

export const Route = createFileRoute("/data-processing")({
  head: () => ({
    meta: [
      { title: "Data Processing | InsurCall" },
      { name: "description", content: "InsurCall data processing description: roles, purposes, lawful bases and processor categories." },
    ],
  }),
  component: DataProcessingPage,
});
