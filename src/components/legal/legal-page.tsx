import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  note?: string;
}

interface LegalPageProps {
  title: string;
  eyebrow: string;
  intro: string;
  updated?: string;
  sections: LegalSection[];
  children?: ReactNode;
}

/**
 * Shared InsurCall legal / compliance page layout.
 * Plain-English, light, readable, mobile-first. Content sections are supplied by
 * each route so the legal pages stay reviewable and consistent.
 */
export function LegalPage({
  title,
  eyebrow,
  intro,
  updated,
  sections,
  children,
}: LegalPageProps) {
  return (
    <div className="relative min-h-screen bg-[#FAF9F6]">
      <div className="pointer-events-none absolute inset-0 bg-radial from-primary/5 via-background to-background" />
      <div className="relative z-10 mx-auto w-full max-w-3xl px-6 py-14 sm:py-20 lg:py-24">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to InsurCall
        </Link>

        <Badge variant="outline" className="border-[#087F8B]/30 bg-[#E6F6F7] text-[11px] font-mono tracking-wider text-[#087F8B] uppercase font-semibold">
          {eyebrow}
        </Badge>

        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-[#111827] sm:text-4xl lg:text-5xl">
          {title}
        </h1>

        <p className="mt-5 text-base font-medium leading-relaxed text-[#172033] sm:text-lg">{intro}</p>

        {updated ? (
          <p className="mt-3 font-mono text-[11px] font-bold tracking-wider text-[#087F8B] uppercase">
            Effective date: {updated}
          </p>
        ) : null}

        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <section key={section.heading} className="space-y-3">
              <h2 className="font-display text-xl font-bold tracking-tight text-[#111827] sm:text-2xl">
                {section.heading}
              </h2>

              {section.paragraphs?.map((paragraph, index) => (
                <p key={index} className="text-sm leading-relaxed text-[#344054] sm:text-base">
                  {paragraph}
                </p>
              ))}

              {section.bullets && section.bullets.length > 0 ? (
                <ul className="list-disc space-y-2 pl-5">
                  {section.bullets.map((bullet, index) => (
                    <li key={index} className="text-sm leading-relaxed text-[#344054] sm:text-base">
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}

              {section.note ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900 sm:text-sm">
                  {section.note}
                </div>
              ) : null}
            </section>
          ))}
        </div>

        {children}
      </div>
    </div>
  );
}
