import type { ReactNode } from "react";

import { mobileHref } from "@/lib/format";
import type { Settings } from "@/lib/settings/model";

import { Eyebrow } from "./eyebrow";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export interface LegalSection {
  /** The anchor, e.g. "returns" for /terms#returns. */
  id: string;
  title: string;
  body: ReactNode;
}

/**
 * The terms, privacy and returns pages: title, date and introduction, a
 * contents list (beside the text on desktop, above it on phones) and
 * numbered sections.
 */
export function LegalPage({
  eyebrow = "Legal",
  title,
  updated,
  intro,
  sections,
}: {
  eyebrow?: string;
  title: string;
  /** Shown as "Last updated 24 September 2026". */
  updated: string;
  intro: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-surface">
        <div className="site-shell grid gap-10 py-12 md:py-16 lg:grid-cols-[220px_minmax(0,720px)] lg:gap-16">
          <div className="flex flex-col gap-3 lg:col-start-2">
            <Eyebrow bar>{eyebrow}</Eyebrow>
            <h1 className="type-heading-xl">{title}</h1>
            <p className="type-body-sm text-ink-muted">Last updated {updated}</p>
            <div className="type-body-lg mt-3 flex flex-col gap-3 text-ink">{intro}</div>
          </div>

          <nav
            aria-label="Contents"
            className="flex flex-col gap-3 rounded-md border border-border p-5 lg:sticky lg:top-8 lg:row-span-2 lg:row-start-1 lg:self-start lg:border-0 lg:p-0"
          >
            <span className="type-eyebrow text-ink-muted">Contents</span>
            <ol className="flex flex-col gap-2">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="type-body-sm flex gap-2 text-ink-muted transition-colors hover:text-ink"
                  >
                    <span className="w-5 shrink-0 tabular-nums">{index + 1}.</span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex flex-col gap-10 lg:col-start-2">
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-6">
                <h2 id={`${section.id}-title`} className="type-heading-md mb-3 flex gap-2">
                  <span className="tabular-nums">{index + 1}.</span>
                  {section.title}
                </h2>
                <div className="type-body flex flex-col gap-3 text-ink [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-2 [&_ol]:pl-5 [&_strong]:font-semibold [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5">
                  {section.body}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

/** The store's name, address and contact details from Settings, for the "who we are" and contact sections. */
export function StoreDetails({ settings }: { settings: Settings }) {
  const rows = [
    { label: "Business", value: settings.storeName },
    settings.storeAddress && { label: "Address", value: settings.storeAddress },
    settings.supportPhone && {
      label: "Phone",
      value: <a href={mobileHref(settings.supportPhone)}>{settings.supportPhone}</a>,
    },
    settings.supportEmail && {
      label: "Email",
      value: <a href={`mailto:${settings.supportEmail}`}>{settings.supportEmail}</a>,
    },
    settings.gstin && { label: "GSTIN", value: settings.gstin },
  ].filter((row) => !!row);

  return (
    <dl className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-4 gap-y-2 rounded-md bg-surface-sunken p-5">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="text-ink-muted">{row.label}</dt>
          <dd className="break-words tabular-nums">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
