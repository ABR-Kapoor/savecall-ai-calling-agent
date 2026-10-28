import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";

const sections: LegalSection[] = [
  {
    heading: "Current processors",
    bullets: [
      "InsForge — database, storage and application platform for tenant data, conversations, documents and embeddings.",
      "Meta (WhatsApp Business Platform or authorised gateway integration) — messaging, delivery events and related session handling.",
      "Clerk — authentication and identity provider for business users.",
      "AI inference — local/self-hosted models and embeddings by default, with optional external model routing where tenant configuration permits.",
      "LiveKit or equivalent voice infrastructure — voice channel handling where configured.",
      "Resend or equivalent email provider — transactional and support communications where configured.",
    ],
  },
  {
    heading: "Processing boundaries",
    bullets: [
      "Customer conversations are processed for support and retrieval purposes.",
      "Knowledge documents are processed for retrieval and answer grounding.",
      "Audio, transcripts and derived data are processed only where a feature is actually enabled and disclosed.",
      "Logs and backups may contain personal data only as operationally necessary.",
    ],
  },
  {
    heading: "Unverified items",
    note: "The complete, current subprocessors list requires deployment-specific confirmation. Items such as specific AI inference regions, email providers and monitoring vendors must be confirmed before commercial disclosure.",
  },
];

function SubprocessorsPage() {
  return (
    <LegalPage
      title="Subprocessors"
      eyebrow="Legal · Data"
      intro="The service providers that process personal data on InsurCall's behalf, based on the currently inspected integration surface."
      updated="October 2026"
      sections={sections}
    >
      <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-[#475467]">
          Questions about a specific processor or data-processing agreement can be sent to{" "}
          <a className="font-semibold text-[#087F8C] underline-offset-4 hover:underline" href="mailto:lightlanister@gmail.com">
            lightlanister@gmail.com
          </a>
          .
        </p>
      </div>
    </LegalPage>
  );
}

export const Route = createFileRoute("/subprocessors")({
  head: () => ({
    meta: [
      { title: "Subprocessors | InsurCall" },
      { name: "description", content: "InsurCall subprocessors and data-sharing summary for the pilot." },
    ],
  }),
  component: SubprocessorsPage,
});
