import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";

const sections: LegalSection[] = [
  {
    heading: "Support and privacy contact",
    paragraphs: [
      "The support and privacy contact for InsurCall is: lightlanister@gmail.com.",
      "This address is supplied for the pilot and should be confirmed as the appropriate published contact before broader customer use.",
    ],
  },
  {
    heading: "Grievance redressal context",
    paragraphs: [
      "Insurance-sector grievance obligations may apply to the deploying insurer or intermediary, separate from general support enquiries to InsurCall.",
      "The presence of an automated assistant does not remove the underlying insurer's or broker's grievance responsibility where it holds the relevant legal role.",
    ],
  },
  {
    heading: "Escalation within InsurCall",
    paragraphs: [
      "Uncertainty, complaints and adverse events can be routed through the escalation and human takeover workflows that InsurCall implements for business customers.",
      "Escalation records should preserve conversation context, source references and required actions without duplicating placeholder records.",
    ],
  },
  {
    heading: "Owner confirmation required",
    note: "The exact statutory grievance officer designation, response timelines, and contact details must be confirmed by the deploying insurer or legal counsel before publication as a final compliance position.",
  },
];

function GrievancePage() {
  return (
    <LegalPage
      title="Grievance"
      eyebrow="Legal · Grievance"
      intro="How InsurCall handles support, privacy and grievance-related enquiries during the pilot."
      updated="October 2026"
      sections={sections}
    >
      <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-[#475467]">Write to the InsurCall grievance and support contact:</p>
        <a className="mt-1 block font-semibold text-[#087F8C] underline-offset-4 hover:underline" href="mailto:lightlanister@gmail.com">
          lightlanister@gmail.com
        </a>
      </div>
    </LegalPage>
  );
}

export const Route = createFileRoute("/grievance")({
  head: () => ({
    meta: [
      { title: "Grievance | InsurCall" },
      { name: "description", content: "InsurCall grievance, support and escalation contact process." },
    ],
  }),
  component: GrievancePage,
});
