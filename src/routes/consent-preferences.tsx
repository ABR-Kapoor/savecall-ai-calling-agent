import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/legal/legal-page";

const sections: LegalSection[] = [
  {
    heading: "Consent categories",
    bullets: [
      "Customer-initiated support — responding to inbound enquiries made by the customer.",
      "Business-initiated messaging — proactive or campaign messaging after explicit opt-in.",
      "Opt-out handling — STOP / UNSUBSCRIBE and suppression of subsequent automated sends.",
      "Recording or transcription — where audio features are enabled and disclosed.",
    ],
  },
  {
    heading: "How preferences are handled",
    paragraphs: [
      "Where implemented, consent state and opt-out status are enforced at the messaging boundary before automated replies or outbound messages are dispatched.",
      "Historical conversations or imported contacts must never be treated as consent for future marketing or proactive outreach.",
      "A recording or voice-call consent control is only meaningful where the underlying feature is actually available and configured.",
    ],
  },
  {
    heading: "Current status",
    paragraphs: [
      "The pilot includes operational consent enforcement for automated support replies, outbound gating and opt-out suppression. A self-service marketing preference centre is not yet exposed as a separate customer-facing surface.",
      "Customers can raise preference or consent questions through the support channel.",
    ],
  },
];

function ConsentPreferencesPage() {
  return (
    <LegalPage
      title="Consent & Preferences"
      eyebrow="Legal · Consent"
      intro="How InsurCall handles consent categories and communication preferences during the pilot."
      updated="October 2026"
      sections={sections}
    >
      <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-[#475467]">
          To raise a consent or preference concern, contact the InsurCall team at{" "}
          <a className="font-semibold text-[#087F8C] underline-offset-4 hover:underline" href="mailto:lightlanister@gmail.com">
            lightlanister@gmail.com
          </a>
          .
        </p>
      </div>
    </LegalPage>
  );
}

export const Route = createFileRoute("/consent-preferences")({
  head: () => ({
    meta: [
      { title: "Consent & Preferences | InsurCall" },
      { name: "description", content: "InsurCall consent categories and communication preference handling." },
    ],
  }),
  component: ConsentPreferencesPage,
});
