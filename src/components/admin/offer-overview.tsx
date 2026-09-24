// The Offers list as a whole (heading, tabs, rows, empty states) and the
// desktop workspace that shows it beside the offer form. Server only.
import type { ReactNode } from "react";
import Link from "next/link";
import { BadgePercent, Plus } from "lucide-react";

import { listOffers } from "@/db/offers";
import { listProductsWithImages } from "@/db/products";
import type { Offer } from "@/db/schema";
import { OFFER_STATUS_LABEL, offerStatus, type OfferStatus } from "@/lib/offers/model";
import { cn } from "@/lib/utils";

import type { OfferProductOption } from "./offer-form";
import { OfferColumns, OfferRow } from "./offer-rows";
import { byStoreOrder } from "./product-row";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, CHIP, CHIP_OFF, CHIP_ON } from "./styles";

const TABS: OfferStatus[] = ["active", "upcoming", "expired"];

/** Each tab from what comes next: the soonest to end, the next to start (as on the board), the latest to end. */
const TAB_ORDER: Record<OfferStatus, (a: Offer, b: Offer) => number> = {
  active: (a, b) => a.endsAt.getTime() - b.endsAt.getTime(),
  upcoming: (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
  expired: (a, b) => b.endsAt.getTime() - a.endsAt.getTime(),
};

/** The tab in `?tab=`, or `fallback` (Active on the list). */
export function parseOfferTab(value: unknown, fallback: OfferStatus = "active"): OfferStatus {
  return TABS.find((tab) => tab === value) ?? fallback;
}

/** "/admin/offers?tab=upcoming". The tab is always spelled out, since the edit page's default is the offer's own. */
export function offersHref(tab: OfferStatus, path = "/admin/offers"): string {
  return `${path}?tab=${tab}`;
}

const EMPTY: Record<OfferStatus, { title: string; detail: string }> = {
  active: { title: "No active offers", detail: "Create one for the next festival sale." },
  upcoming: { title: "No upcoming offers", detail: "Offers that start later show up here." },
  expired: { title: "No expired offers", detail: "Offers show up here once they end." },
};

function EmptyState({ tab, canCreate }: { tab: OfferStatus; canCreate: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center lg:py-16">
      <BadgePercent className="size-10 text-ink-subtle" strokeWidth={1.5} aria-hidden="true" />
      <p className="text-base leading-[22px] font-semibold">{EMPTY[tab].title}</p>
      <p className="text-[13px] leading-[18px] text-ink-muted">{EMPTY[tab].detail}</p>
      {tab === "active" && canCreate && (
        <Link href="/admin/offers/new" className={cn(BUTTON_SECONDARY, "mt-2")}>
          Create offer
        </Link>
      )}
    </div>
  );
}

export const OFFERS_HEADING = "offers-title";

/**
 * Every offer on one tab: Active, Upcoming or Expired, each with its count.
 * `path` is the page the tabs stay on (the list, or the form beside it),
 * `current` the offer open beside the list ("new" while creating one), and
 * `heading` the level of the "Offers" title: the page's own, or the list's
 * beside the form.
 */
export function OffersOverview({
  offers,
  tab,
  now,
  path = "/admin/offers",
  current = null,
  heading: Heading = "h1",
}: {
  offers: Offer[];
  tab: OfferStatus;
  now: Date;
  path?: string;
  current?: string | null;
  heading?: "h1" | "h2";
}) {
  const byStatus = Object.fromEntries(TABS.map((status) => [status, [] as Offer[]])) as Record<OfferStatus, Offer[]>;
  for (const offer of offers) byStatus[offerStatus(offer, now)].push(offer);
  const rows = byStatus[tab].sort(TAB_ORDER[tab]);
  const creating = current === "new";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <Heading id={OFFERS_HEADING} className="type-heading-lg">
            Offers
          </Heading>
          <p className="hidden text-[13px] leading-[18px] text-ink-muted tabular-nums lg:block">
            {byStatus.active.length} active · {byStatus.upcoming.length} upcoming
          </p>
        </div>
        {!creating && (
          <Link href="/admin/offers/new" className={BUTTON_PRIMARY}>
            <Plus strokeWidth={2} aria-hidden="true" />
            Create offer
          </Link>
        )}
      </header>

      <div className="flex flex-col gap-4">
        <nav
          aria-label="Offer status"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {TABS.map((status) => {
            const on = status === tab;
            return (
              <Link
                key={status}
                href={offersHref(status, path)}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={cn(CHIP, "px-4", on ? CHIP_ON : CHIP_OFF)}
              >
                {OFFER_STATUS_LABEL[status]}
                <span className={cn("font-medium tabular-nums", on ? "text-on-yellow" : "text-ink-muted")}>
                  {byStatus[status].length}
                </span>
              </Link>
            );
          })}
        </nav>

        {rows.length === 0 ? (
          <EmptyState tab={tab} canCreate={!creating} />
        ) : (
          <div className="@container">
            <OfferColumns />
            <ul aria-label={`${OFFER_STATUS_LABEL[tab]} offers`} className="flex flex-col border-t border-border @2xl:border-t-0">
              {rows.map((offer) => (
                <OfferRow key={offer.id} offer={offer} now={now} current={offer.id === current} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Create and edit: on phones only the form; on desktop the offer list on the
 * left and the form as a panel on the right that scrolls on its own, as on
 * the desktop board.
 */
export function OfferWorkspace({ list, children }: { list: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside
        aria-labelledby={OFFERS_HEADING}
        className="hidden min-w-0 flex-1 flex-col px-10 pt-8 pb-12 lg:flex"
      >
        {list}
      </aside>
      <main className="flex flex-1 flex-col lg:sticky lg:top-0 lg:h-dvh lg:w-105 lg:flex-none lg:overflow-y-auto lg:border-l lg:border-border lg:bg-surface-raised">
        {children}
      </main>
    </div>
  );
}

/**
 * What Create offer and an offer's own page both need: every offer for the
 * list beside the form, and every product (hidden ones too, in store order)
 * for its checklist.
 */
export async function loadOfferWorkspace(): Promise<{ offers: Offer[]; products: OfferProductOption[] }> {
  const [offers, products] = await Promise.all([listOffers(), listProductsWithImages()]);
  return {
    offers,
    products: products
      .sort(byStoreOrder)
      .map((product) => ({ id: product.id, name: product.name, hidden: product.availability === "hidden" })),
  };
}
