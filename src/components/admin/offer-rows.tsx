// An offer as the admin lists it: the "20% OFF" tag, the status word, and one
// row that reads as the phone row in a narrow column and as a table row in a
// wide one (a container query, so the list beside the offer form fits too).
// No hooks, so server pages use it.
import Link from "next/link";
import { Megaphone } from "lucide-react";

import type { Offer } from "@/db/schema";
import { OFFER_STATUS_LABEL, offerCovers, offerDates, offerNote, offerState, type OfferState } from "@/lib/offers/model";
import { categoryName } from "@/lib/products/model";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<OfferState, { dot: string; text: string }> = {
  active: { dot: "bg-brand-yellow ring-1 ring-brand-yellow-hover", text: "text-foreground" },
  upcoming: { dot: "bg-ink-muted", text: "text-foreground" },
  paused: { dot: "bg-transparent ring-1 ring-ink-muted", text: "text-ink-muted" },
  expired: { dot: "bg-ink-subtle", text: "text-ink-muted" },
};

/** A small dot and an uppercase word: "ACTIVE", "UPCOMING", "PAUSED", "EXPIRED". The word carries the meaning. */
export function OfferStatusLabel({ status, className }: { status: OfferState; className?: string }) {
  const tone = STATUS_TONE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] leading-[14px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase",
        tone.text,
        className
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", tone.dot)} />
      {OFFER_STATUS_LABEL[status]}
    </span>
  );
}

/** "20% OFF": yellow while the offer is running or to come, grey once it has ended. */
export function OfferPercentTag({ percentOff, expired }: { percentOff: number; expired: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-xs px-1.5 text-[11px] leading-5 font-bold tracking-[0.04em] whitespace-nowrap",
        expired ? "bg-surface-sunken text-ink-muted" : "bg-brand-yellow text-on-yellow"
      )}
    >
      {percentOff}% OFF
    </span>
  );
}

/** "On site": the offer shows in the offer bar and on /offers while it runs. */
function OnSiteMark() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-xs leading-4 font-semibold text-ink-muted">
      <Megaphone className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
      On site
    </span>
  );
}

/** Where an offer's row opens. */
export function offerHref(offer: Pick<Offer, "id">): string {
  return `/admin/offers/${offer.id}`;
}

/** The column layout the header and every wide row share. */
const COLUMNS = "@2xl:grid-cols-[minmax(0,1.15fr)_88px_124px_minmax(0,1fr)_108px_112px] @2xl:gap-x-4 @2xl:px-3";

const HEAD = "text-xs leading-4 font-semibold tracking-[0.08em] text-ink-muted uppercase";

/** The column names over the wide rows. Each row reads out in full, so screen readers skip these. */
export function OfferColumns() {
  return (
    <div aria-hidden="true" className={cn("hidden h-10 items-center bg-surface-sunken @2xl:grid", COLUMNS)}>
      <span className={HEAD}>Offer</span>
      <span className={HEAD}>Discount</span>
      <span className={HEAD}>Dates</span>
      <span className={HEAD}>Applies to</span>
      <span className={HEAD}>Coupon</span>
      <span className={HEAD}>Status</span>
    </div>
  );
}

/**
 * One offer: name and "20% OFF", "12 Oct – 25 Oct · Batting Pads", the status
 * with "Ends in 2 days", and its code when it has one. The whole row opens the
 * offer; `current` marks the one open beside the list.
 */
export function OfferRow({ offer, now, current }: { offer: Offer; now: Date; current?: boolean }) {
  const status = offerState(offer, now);
  const expired = status === "expired";
  // Shown in the offer bar and on /offers: announced, and not paused or over.
  const onSite = offer.announce && (status === "active" || status === "upcoming");
  const dates = offerDates(offer, now);
  const covers = offerCovers(offer, categoryName);
  // Expired rows follow the board: the dates already say when it ended.
  const note = expired ? null : offerNote(offer, now);
  const name = cn("min-w-0 font-semibold break-words", expired ? "text-ink-muted" : "text-foreground");

  return (
    <li className="border-b border-border">
      <Link
        href={offerHref(offer)}
        aria-current={current ? "page" : undefined}
        className={cn(
          "block transition-colors hover:bg-surface-sunken/60",
          current && "bg-surface-sunken hover:bg-surface-sunken"
        )}
      >
        {/* Narrow: three lines, as on the phone board. Inset on desktop, where the list beside the form marks the open offer. */}
        <span className="flex min-h-18 flex-col justify-center gap-1 py-3 lg:px-3 @2xl:hidden">
          <span className="flex items-start justify-between gap-3">
            <span className={cn(name, "flex flex-wrap items-center gap-x-2 text-[15px] leading-[22px]")}>
              {offer.name}
              {onSite && <OnSiteMark />}
            </span>
            <span className="pt-px">
              <OfferPercentTag percentOff={offer.percentOff} expired={expired} />
            </span>
          </span>
          <span className="truncate text-[13px] leading-[18px] text-ink-muted tabular-nums">
            {dates} · {covers}
          </span>
          <span className="flex min-h-5 items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <OfferStatusLabel status={status} />
              {note && <span className="truncate text-[13px] leading-[18px] text-ink-muted">{note}</span>}
            </span>
            {offer.code && (
              <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-surface-sunken px-2 text-xs leading-4 text-ink-muted">
                Code
                <span className="font-semibold tracking-[0.04em] text-foreground">{offer.code}</span>
              </span>
            )}
          </span>
        </span>

        {/* Wide: one table row. */}
        <span className={cn("hidden min-h-14 items-center py-2 text-sm leading-5 @2xl:grid", COLUMNS)}>
          <span className={cn(name, "flex flex-col gap-0.5")}>
            {offer.name}
            {onSite && <OnSiteMark />}
          </span>
          <span>
            <OfferPercentTag percentOff={offer.percentOff} expired={expired} />
          </span>
          {/* Wraps when a date carries its year (an offer from last year). */}
          <span className="tabular-nums">{dates}</span>
          <span className="min-w-0 break-words">{covers}</span>
          <span className="min-w-0 break-words">
            <span className="sr-only">Coupon code </span>
            {offer.code ? (
              <span className="text-[13px] font-semibold tracking-[0.04em]">{offer.code}</span>
            ) : (
              <span className="text-ink-muted">None</span>
            )}
          </span>
          <span className="flex flex-col gap-0.5">
            <OfferStatusLabel status={status} />
            {note && <span className="text-[13px] leading-[18px] whitespace-nowrap text-ink-muted">{note}</span>}
          </span>
        </span>
      </Link>
    </li>
  );
}
