import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";

const sections: LegalSection[] = [
  {
    heading: "Data categories and retention intent",
    bullets: [
      "Account and organisation records.",
      "WhatsApp conversations, messages and metadata.",
      "Knowledge documents, extracted text and embeddings.",
      "AI prompts and responses.",
      "Audio, transcripts and call metadata where features are enabled.",
      "Support requests, consent evidence, security and audit logs.",
      "Backups and disaster-recovery copies.",
    ],
  },
  {
    heading: "Configurable retention",
    paragraphs: [
      "The product owner intends to support configurable retention, but whether retention controls are exposed and enforced for every category at this stage requires owner confirmation and, where relevant, technical completion.",
      "Until such controls are confirmed and implemented, no specific retention period should be published as an active promise.",
    ],
  },
];

function RetentionPage() {
  return (
    <LegalPage
      title="Retention"
      eyebrow="Legal · Data"
      intro="Retention categories and the configurable-retention intent for InsurCall data."
      updated="October 2026"
      sections={sections}
    >
      <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-[#475467]">
          Retention preferences should be raised with the InsurCall support team at{" "}
          <a className="font-semibold text-[#087F8C] underline-offset-4 hover:underline" href="mailto:lightlanister@gmail.com">
            lightlanister@gmail.com
          </a>
          .
        </p>
      </div>
    </LegalPage>
  );
}

export const Route = createFileRoute("/retention")({
  head: () => ({
    meta: [
      { title: "Retention | InsurCall" },
      { name: "description", content: "InsurCall retention categories and configurable retention intent." },
    ],
  }),
  component: RetentionPage,
});
