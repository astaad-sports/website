import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { TrackOrderForm } from "@/components/orders/track-order-form";
import { Eyebrow } from "@/components/storefront/eyebrow";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { CARRIERS } from "@/lib/shipping";

export const metadata: Metadata = {
  title: "Track your order",
  description: "See where your Astaad Sports order is with your order number and mobile number.",
};

const CARD = "flex flex-col gap-3 rounded-md border border-border bg-surface-raised p-6 shadow-card";
const LINK = "type-body-sm inline-flex min-h-11 items-center gap-1.5 font-semibold underline underline-offset-4";

/**
 * The footer's "Track Order": look an order up by its number and mobile
 * number without signing in. Signed-in customers also find every order,
 * with its tracking, in their account.
 */
export default function TrackOrderPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-surface-sunken">
        <div className="site-shell flex flex-col gap-8 py-12 md:py-16">
          <div className="flex max-w-[640px] flex-col gap-3">
            <Eyebrow bar>Support</Eyebrow>
            <h1 className="type-heading-xl">Track your order</h1>
            <p className="type-body-lg text-ink-muted">
              Enter your order number and the mobile number on the delivery address to see where your order is.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <TrackOrderForm />

            <aside aria-label="More ways to track" className="flex flex-col gap-4">
              <section aria-labelledby="track-account" className={CARD}>
                <h2 id="track-account" className="type-heading-sm">
                  Signed in?
                </h2>
                <p className="type-body text-ink-muted">Your account lists every order with its tracking.</p>
                <Link href="/account" className={LINK}>
                  Go to your account
                </Link>
              </section>
              <section aria-labelledby="track-courier" className={CARD}>
                <h2 id="track-courier" className="type-heading-sm">
                  Have the AWB number?
                </h2>
                <p className="type-body text-ink-muted">
                  Once your order ships, you can also track the parcel on the courier’s website.
                </p>
                <ul className="flex flex-col">
                  {Object.values(CARRIERS).map((carrier) => (
                    <li key={carrier.name}>
                      <a href={carrier.trackingUrl} target="_blank" rel="noopener noreferrer" className={LINK}>
                        {carrier.name}
                        <ExternalLink className="size-4" strokeWidth={1.5} aria-hidden="true" />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
              <p className="type-body-sm px-1 text-ink-muted">
                Can’t find your order?{" "}
                <Link href="/contact" className="font-semibold text-ink underline underline-offset-4">
                  Contact us
                </Link>
                .
              </p>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
