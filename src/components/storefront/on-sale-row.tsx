import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import type { StoreAnnouncement } from "@/lib/products/model";

import { KitCard, KitMiniCard } from "./kit-card";
import type { KitTile } from "./kit-tiles";
import { OfferCountdown } from "./offer-countdown";
import { SectionHeading } from "./section-heading";

/**
 * "On sale now": the products an offer is taking money off, biggest saving
 * first, with the time left on the announced offer and a link to /offers.
 * The home page leaves it out while nothing is on sale.
 */
export function OnSaleRow({ items, offer }: { items: KitTile[]; offer?: StoreAnnouncement }) {
  return (
    <section aria-labelledby="sale-title" className="site-shell flex flex-col gap-5 py-8 md:gap-8 md:py-16">
      <SectionHeading
        id="sale-title"
        compact
        eyebrow={
          <>
            On sale now
            {offer && (
              <OfferCountdown
                endsAt={offer.endsAt}
                prefix="· ends in "
                className="text-foreground"
              />
            )}
          </>
        }
        eyebrowBar
        title={offer ? (offer.ownHeadline ?? `${offer.name}: ${offer.percentOff}% off ${offer.covers}`) : "Offer prices, for now."}
        aside={
          <Link
            href="/offers"
            className="group inline-flex min-h-11 items-center gap-2 text-sm font-bold tracking-[0.04em] uppercase underline-offset-4 hover:underline"
          >
            See all offers
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} aria-hidden="true" />
          </Link>
        }
      />
      <Reveal>
        <ul
          aria-label="On sale"
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 md:hidden"
        >
          {items.map((item) => (
            <li key={item.slug} data-reveal className="relative shrink-0 snap-start">
              <KitMiniCard {...item} />
            </li>
          ))}
        </ul>
        {/* Wide screens show one row of four; the row scrolls through them all on tablets. */}
        <ul className="no-scrollbar -mx-8 hidden snap-x snap-mandatory gap-6 overflow-x-auto px-8 md:flex xl:mx-0 xl:grid xl:grid-cols-4 xl:overflow-visible xl:px-0 xl:[&>li:nth-child(n+5)]:hidden">
          {items.map((item) => (
            <li key={item.slug} data-reveal className="relative w-[320px] shrink-0 snap-start xl:w-auto">
              <KitCard {...item} />
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
