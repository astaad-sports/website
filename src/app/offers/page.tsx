import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CopyCode } from "@/components/storefront/copy-code";
import { Eyebrow } from "@/components/storefront/eyebrow";
import { FlipCountdown, OfferCountdown } from "@/components/storefront/offer-countdown";
import { OfferProducts } from "@/components/storefront/offer-products";
import { MobileTabBar } from "@/components/storefront/mobile-tab-bar";
import { SectionHeading } from "@/components/storefront/section-heading";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { PRODUCT_TRUST, TrustStrip } from "@/components/storefront/trust-strip";
import { getStoreCatalogue } from "@/lib/products/catalogue";
import { announcedProducts, batsByRange, type StoreAnnouncement, type StoreCatalogue } from "@/lib/products/model";
import { pageMetadata } from "@/lib/seo/metadata";

const DESCRIPTION =
  "Astaad Sports offers running now: cricket bats and gear at sale prices, and coupon codes, for a limited time.";

export async function generateMetadata(): Promise<Metadata> {
  const { announcements } = await getStoreCatalogue();
  const metadata = pageMetadata({ title: "Offers", description: DESCRIPTION, path: "/offers" });
  // Between sales the page is an empty shelf: keep it out of search.
  return announcements.length ? metadata : { ...metadata, robots: { index: false } };
}

/** Bats first, in their ranges, then gear, as the shop lists them. */
function coveredProducts(catalogue: StoreCatalogue, offer: StoreAnnouncement) {
  const { bats, gear } = announcedProducts(catalogue, offer);
  return [...batsByRange(catalogue).filter((bat) => bats.includes(bat)), ...gear];
}

/** The black stage for the biggest running offer: how much, until when, and its code. */
function OffersHero({ offer, count }: { offer: StoreAnnouncement; count: number }) {
  return (
    <section aria-labelledby="offers-title" className="relative overflow-hidden bg-surface-dark text-on-dark">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-40 size-[520px] rounded-full bg-[radial-gradient(circle,rgba(254,197,2,0.20)_0%,rgba(254,197,2,0)_66%)]"
      />
      <div className="site-shell relative flex flex-col gap-10 py-12 md:py-16 lg:flex-row lg:items-end lg:justify-between lg:gap-16 lg:py-20">
        <div className="flex max-w-[640px] flex-col gap-5">
          <Eyebrow bar className="text-on-dark-muted">
            <Link href="/" className="transition-colors hover:text-brand-yellow">
              Home
            </Link>
            <span aria-hidden="true">·</span>
            <span className="text-on-dark">Offers</span>
          </Eyebrow>
          <h1 id="offers-title" className="flex flex-col gap-3">
            <span className="type-display text-[64px] leading-[0.9] tracking-[-0.03em] text-brand-yellow md:text-[112px]">
              {offer.percentOff}% off
            </span>
            <span className="text-2xl leading-8 font-bold tracking-[-0.02em] md:text-[32px] md:leading-10">
              {offer.ownHeadline ?? `${offer.name} on ${offer.covers}`}
            </span>
          </h1>
          <p className="type-body text-on-dark-muted">
            {offer.code
              ? `Use code ${offer.code} in your cart before the clock runs out.`
              : "Prices are already lowered, no code needed."}
            {count > 1 && ` ${count - 1} more ${count === 2 ? "offer" : "offers"} below.`}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {offer.code && <CopyCode code={offer.code} tone="dark" size="lg" />}
            <Button
              render={<a href={`#offer-${offer.id}`} />}
              nativeButton={false}
              className="h-12 rounded-xs px-5 text-sm font-bold tracking-[0.04em] uppercase"
            >
              Shop the offer
              <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <span className="type-eyebrow text-on-dark-muted">Ends in</span>
          <FlipCountdown endsAt={offer.endsAt} />
        </div>
      </div>
    </section>
  );
}

/** Nothing on offer: say so, and point to the shop. */
function NoOffers() {
  return (
    <section aria-labelledby="offers-title" className="site-shell flex flex-col items-center gap-4 py-24 text-center">
      <Eyebrow bar>Offers</Eyebrow>
      <h1 id="offers-title" className="type-heading-xl">
        No offers running right now.
      </h1>
      <p className="type-body max-w-md text-ink-muted">
        Sales come round for festivals and the new season. Until the next one, the whole range is in the shop.
      </p>
      <Button render={<Link href="/shop" />} nativeButton={false} className="mt-2 h-12 rounded-xs px-6">
        Shop everything
      </Button>
    </section>
  );
}

/** One offer: its headline, time left, code, and the products it covers. */
function OfferSection({ offer, catalogue }: { offer: StoreAnnouncement; catalogue: StoreCatalogue }) {
  const products = coveredProducts(catalogue, offer);
  const titleId = `offer-${offer.id}-title`;
  return (
    <section
      id={`offer-${offer.id}`}
      aria-labelledby={titleId}
      className="site-shell flex scroll-mt-20 flex-col gap-8 py-14 md:py-20"
    >
      <SectionHeading
        id={titleId}
        eyebrow={offer.name}
        eyebrowBar
        title={offer.ownHeadline ?? `${offer.percentOff}% off ${offer.covers}`}
        compact
        aside={
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
            <OfferCountdown
              endsAt={offer.endsAt}
              className="rounded-xs bg-surface-dark px-3 py-1.5 text-brand-yellow"
            />
            {offer.code ? <CopyCode code={offer.code} /> : <span className="text-ink-muted">No code needed</span>}
          </div>
        }
      />
      {offer.code && (
        <p className="type-body-sm -mt-2 text-ink-muted">
          Prices here are before the code. Enter {offer.code} in your cart and {offer.percentOff}% comes off them, unless a
          bigger offer already has.
        </p>
      )}
      {products.length > 0 ? (
        <OfferProducts products={products} />
      ) : (
        <p className="type-body text-ink-muted">Everything this offer covers has sold out.</p>
      )}
    </section>
  );
}

/** Every announced offer running now, the biggest first, with the products each one covers. */
export default async function OffersPage() {
  const catalogue = await getStoreCatalogue();
  const offers = catalogue.announcements;

  return (
    <>
      <SiteHeader sticky activeHref="/offers" />
      <main className="flex-1">
        {offers.length === 0 ? (
          <NoOffers />
        ) : (
          <>
            <OffersHero offer={offers[0]} count={offers.length} />
            <div className="divide-y divide-border">
              {offers.map((offer) => (
                <OfferSection key={offer.id} offer={offer} catalogue={catalogue} />
              ))}
            </div>
          </>
        )}
        <TrustStrip items={PRODUCT_TRUST} tone="sunken" />
      </main>
      <SiteFooter />
      <MobileTabBar />
    </>
  );
}
