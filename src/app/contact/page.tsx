import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, ExternalLink, Mail, MapPin, Phone, type LucideIcon } from "lucide-react";

import { Eyebrow } from "@/components/storefront/eyebrow";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { mobileHref } from "@/lib/format";
import { getStoreSettings } from "@/lib/settings/store";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Call, email or visit Astaad Sports.",
};

const QUICK_LINKS = [
  { href: "/track-order", title: "Track your order", detail: "See where your parcel is" },
  { href: "/returns", title: "Returns and refunds", detail: "Send something back" },
  { href: "/size-guide", title: "Size guide", detail: "Bats, pads, gloves and helmets" },
  { href: "/terms", title: "Terms of service", detail: "Orders, delivery and payment" },
];

const ACTION = "type-body-sm inline-flex min-h-11 items-center gap-1.5 font-semibold underline underline-offset-4";

function ContactCard({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-surface-raised p-6 shadow-card">
      <span className="flex size-11 items-center justify-center rounded-full bg-surface-sunken">
        <Icon className="size-5" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <h2 className="type-heading-sm">{title}</h2>
      {children}
    </section>
  );
}

/**
 * The footer's "Contact Us": phone, shop address (with directions) and
 * email, from Settings, then links to the answers most people are after.
 */
export default async function ContactPage() {
  const settings = await getStoreSettings();
  const { supportPhone: phone, supportEmail: email, storeAddress: address } = settings;
  const directions = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-surface-sunken">
        <div className="site-shell flex flex-col gap-10 py-12 md:py-16">
          <div className="flex max-w-[640px] flex-col gap-3">
            <Eyebrow bar>Support</Eyebrow>
            <h1 className="type-heading-xl">Contact us</h1>
            <p className="type-body-lg text-ink-muted">
              Questions about an order, sizing or a custom bat? Talk to us. Please have your order number ready if
              you have one: it looks like AST-10019.
            </p>
          </div>

          {phone || email || address ? (
            <div className={cn("grid gap-4 md:grid-cols-2", phone && email && address && "xl:grid-cols-3")}>
              {phone && (
                <ContactCard icon={Phone} title="Call us">
                  <p className="type-heading-md tabular-nums">{phone}</p>
                  <a href={mobileHref(phone)} className={ACTION}>
                    Call now
                  </a>
                </ContactCard>
              )}
              {email && (
                <ContactCard icon={Mail} title="Email us">
                  <p className="type-body break-all">{email}</p>
                  <a href={`mailto:${email}`} className={ACTION}>
                    Write to us
                  </a>
                </ContactCard>
              )}
              {address && directions && (
                <ContactCard icon={MapPin} title="Visit the shop">
                  <address className="type-body not-italic">
                    {settings.storeName}
                    <br />
                    {address}
                  </address>
                  <a href={directions} target="_blank" rel="noopener noreferrer" className={ACTION}>
                    Get directions
                    <ExternalLink className="size-4" strokeWidth={1.5} aria-hidden="true" />
                    <span className="sr-only">(opens Google Maps in a new tab)</span>
                  </a>
                </ContactCard>
              )}
            </div>
          ) : (
            <p className="type-body text-ink-muted">Our contact details will be here soon.</p>
          )}

          <section aria-labelledby="quick-answers" className="flex flex-col gap-4">
            <h2 id="quick-answers" className="type-heading-md">
              Quick answers
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex h-full items-center justify-between gap-4 rounded-md border border-border bg-surface-raised px-5 py-4 transition-colors hover:border-border-strong"
                  >
                    <span className="flex flex-col gap-0.5">
                      <span className="type-heading-sm">{link.title}</span>
                      <span className="type-body-sm text-ink-muted">{link.detail}</span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {settings.gstin && (
            <p className="type-body-sm text-ink-muted tabular-nums">
              {settings.storeName} · GSTIN {settings.gstin}
            </p>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
