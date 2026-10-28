import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";

const sections: LegalSection[] = [
  {
    heading: "How to submit a data-rights request",
    paragraphs: [
      "Individuals and business customers may submit questions or requests about personal data through the InsurCall support channel: lightlanister@gmail.com.",
      "Support teams may collect an identity or authority reference to locate relevant records, and will not disclose one organisation's data to another requester without appropriate authorisation.",
    ],
  },
  {
    heading: "What a request may cover",
    bullets: [
      "Access, correction, or deletion of personal data held about an individual.",
      "Export or portability of data associated with a customer conversation, where technically supported.",
      "Withdrawal of consent or objection to processing.",
      "Objection to or restriction of processing, where applicable.",
      "Information about retention periods and automated decision logic.",
    ],
  },
  {
    heading: "Automated handling",
    paragraphs: [
      "Where an automated request or ticket workflow exists, it must not claim success before durable persistence. Deletion of vectors, documents and derived data should be coordinated with retention and security policies.",
    ],
  },
  {
    heading: "Response expectations",
    paragraphs: [
      "Response times, formats and fulfilment methods may depend on the applicable legal framework, the nature of the request and the deployment. Expected timelines require legal review and must not be overstated.",
    ],
  },
];

function DataRightsPage() {
  return (
    <LegalPage
      title="Data Rights"
      eyebrow="Legal · Data"
      intro="How individuals and business customers can ask about or exercise personal data rights through InsurCall."
      updated="October 2026"
      sections={sections}
    >
      <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-[#475467]">To submit a request, write to</p>
        <a className="mt-1 block font-semibold text-[#087F8C] underline-offset-4 hover:underline" href="mailto:lightlanister@gmail.com">
          lightlanister@gmail.com
        </a>
      </div>
    </LegalPage>
  );
}

export const Route = createFileRoute("/data-rights")({
  head: () => ({
    meta: [
      { title: "Data Rights | InsurCall" },
      { name: "description", content: "InsurCall data rights request process and scope." },
    ],
  }),
  component: DataRightsPage,
});
