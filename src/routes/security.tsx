import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";

const sections: LegalSection[] = [
  {
    heading: "Implemented safeguards",
    bullets: [
      "Cryptographic webhook signature verification for inbound messaging.",
      "Idempotency keys and deduplication for provider events and replies.",
      "Tenant isolation through server-resolved membership and row-level security.",
      "Outbound safety gates (automation, human takeover, allowlists, opt-out).",
      "Grounded retrieval and human-review escalation before consequential replies.",
      "Data minimisation: no card numbers, CVV, PINs or banking secrets stored.",
      "Demo fixtures segregated from live customer data.",
    ],
  },
  {
    heading: "Operational posture",
    paragraphs: [
      "InsurCall documents a pilot-stage security posture. Claims of certification, penetration testing, or compliance attestation must be based on actual evidence, not on the existence of these controls alone.",
    ],
  },
  {
    heading: "Reporting a vulnerability",
    paragraphs: [
      "Security reports should be sent to the InsurCall support address: lightlanister@gmail.com. Reports are handled through the existing support workflow pending a dedicated vulnerability channel.",
    ],
  },
];

function SecurityPage() {
  return (
    <LegalPage
      title="Security"
      eyebrow="Legal · Security"
      intro="The security safeguards implemented in the InsurCall pilot, and the limits of what can be claimed at this stage."
      updated="October 2026"
      sections={sections}
    >
      <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-[#475467]">
          Report security concerns to{" "}
          <a className="font-semibold text-[#087F8C] underline-offset-4 hover:underline" href="mailto:lightlanister@gmail.com">
            lightlanister@gmail.com
          </a>
          .
        </p>
      </div>
    </LegalPage>
  );
}

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security | InsurCall" },
      { name: "description", content: "InsurCall security safeguards and vulnerability reporting during the pilot." },
    ],
  }),
  component: SecurityPage,
});
