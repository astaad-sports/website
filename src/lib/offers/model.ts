// Offers as the store sees them: when one is running, what it covers, and
// what it takes off. Pure and client-safe; the database lives in
// src/db/offers.ts. Dates are whole days in India time.
import type { Offer, OfferScope } from "@/db/schema";
import { formatShortDate } from "@/lib/format";

export type OfferStatus = "upcoming" | "active" | "expired";

export const OFFER_STATUS_LABEL: Record<OfferStatus, string> = {
  active: "Active",
  upcoming: "Upcoming",
  expired: "Expired",
};

/** The fields that decide what an offer does. */
export type OfferTerms = Pick<Offer, "name" | "percentOff" | "startsAt" | "endsAt" | "scope" | "categories" | "productIds">;

export const MAX_PERCENT_OFF = 90;

// ---------------------------------------------------------------------------
// Days in India time

const IST_OFFSET_MINUTES = 5 * 60 + 30;
const DAY_MS = 86_400_000;

/** "2026-10-12" → midnight at the start of that day in India. */
export function startOfDayInIndia(day: string): Date {
  return new Date(`${day}T00:00:00.000+05:30`);
}

/** "2026-10-25" → the last millisecond of that day in India. */
export function endOfDayInIndia(day: string): Date {
  return new Date(startOfDayInIndia(day).getTime() + DAY_MS - 1);
}

/** The India date of a moment, as "2026-10-12" (what a date input holds). */
export function dayInIndia(date: Date): string {
  return new Date(date.getTime() + IST_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
}

/** Whether a date input value is a real calendar day. */
export function isDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && dayInIndia(startOfDayInIndia(value)) === value;
}

/** Whole India days from one moment's day to another's: today 0, tomorrow 1. */
function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDayInIndia(dayInIndia(to)).getTime() - startOfDayInIndia(dayInIndia(from)).getTime()) / DAY_MS);
}

// ---------------------------------------------------------------------------
// Status and wording

export function offerStatus(offer: Pick<Offer, "startsAt" | "endsAt">, now: Date = new Date()): OfferStatus {
  if (now < offer.startsAt) return "upcoming";
  if (now > offer.endsAt) return "expired";
  return "active";
}

/** "12 Oct", or "12 Oct 2027" outside the current year (India dates). */
const shortDay = formatShortDate;

/** "12 Oct – 25 Oct", or a single day "12 Oct". */
export function offerDates(offer: Pick<Offer, "startsAt" | "endsAt">, now: Date = new Date()): string {
  const start = shortDay(offer.startsAt, now);
  const end = shortDay(offer.endsAt, now);
  return start === end ? start : `${start} – ${end}`;
}

/** "Ends in 2 days", "Ends today", "Starts 30 Dec", "Ended 15 Aug". */
export function offerNote(offer: Pick<Offer, "startsAt" | "endsAt">, now: Date = new Date()): string {
  const status = offerStatus(offer, now);
  if (status === "upcoming") {
    const days = daysBetween(now, offer.startsAt);
    return days === 1 ? "Starts tomorrow" : `Starts ${shortDay(offer.startsAt, now)}`;
  }
  if (status === "expired") return `Ended ${shortDay(offer.endsAt, now)}`;
  const days = daysBetween(now, offer.endsAt);
  if (days <= 0) return "Ends today";
  if (days === 1) return "Ends tomorrow";
  return `Ends in ${days} days`;
}

/** Whole days until an active offer's last day: 0 on its last day. */
export function daysLeft(offer: Pick<Offer, "endsAt">, now: Date = new Date()): number {
  return Math.max(0, daysBetween(now, offer.endsAt));
}

/** "Entire store", "Batting Pads, Batting Gloves", "2 products". */
export function offerCovers(
  offer: Pick<Offer, "scope" | "categories" | "productIds">,
  categoryName: (slug: string) => string
): string {
  if (offer.scope === "store") return "Entire store";
  if (offer.scope === "categories") return offer.categories.map(categoryName).join(", ");
  const count = offer.productIds.length;
  return `${count} ${count === 1 ? "product" : "products"}`;
}

// ---------------------------------------------------------------------------
// Prices

/** A product as offers see it. */
export interface OfferTarget {
  id: string;
  /** The category slug: "bats", "helmets"… */
  category: string;
}

export function offerApplies(offer: Pick<Offer, "scope" | "categories" | "productIds">, product: OfferTarget): boolean {
  switch (offer.scope) {
    case "store":
      return true;
    case "categories":
      return offer.categories.includes(product.category);
    case "products":
      return offer.productIds.includes(product.id);
  }
}

/** A price in whole rupees with `percentOff` taken off, to the nearest rupee: ₹7,699 at 20% → ₹6,159. */
export function offerPrice(rupees: number, percentOff: number): number {
  return Math.round((rupees * (100 - percentOff)) / 100);
}

/**
 * The offer that takes the most off this product right now, among `offers`
 * (callers pass the ones that need no code). Offers never add up.
 */
export function bestOffer<T extends Pick<Offer, "scope" | "categories" | "productIds" | "percentOff" | "startsAt" | "endsAt">>(
  offers: T[],
  product: OfferTarget,
  now: Date = new Date()
): T | null {
  let best: T | null = null;
  for (const offer of offers) {
    if (offerStatus(offer, now) !== "active" || !offerApplies(offer, product)) continue;
    if (!best || offer.percentOff > best.percentOff) best = offer;
  }
  return best;
}

/**
 * A coupon the customer entered and the server checked, as the cart keeps
 * it. The server checks it again when the order is placed.
 */
export interface AppliedCoupon {
  code: string;
  name: string;
  percentOff: number;
  scope: OfferScope;
  categories: string[];
  productIds: string[];
  /** ISO times, so the coupon survives a round trip through localStorage. */
  startsAt: string;
  endsAt: string;
}

export function toAppliedCoupon(offer: Offer): AppliedCoupon {
  return {
    code: offer.code ?? "",
    name: offer.name,
    percentOff: offer.percentOff,
    scope: offer.scope,
    categories: offer.categories,
    productIds: offer.productIds,
    startsAt: offer.startsAt.toISOString(),
    endsAt: offer.endsAt.toISOString(),
  };
}

/** A stored coupon as offer terms, with real dates. */
export function couponTerms(coupon: AppliedCoupon): Pick<Offer, "scope" | "categories" | "productIds" | "percentOff" | "startsAt" | "endsAt"> {
  return {
    scope: coupon.scope,
    categories: coupon.categories,
    productIds: coupon.productIds,
    percentOff: coupon.percentOff,
    startsAt: new Date(coupon.startsAt),
    endsAt: new Date(coupon.endsAt),
  };
}

// ---------------------------------------------------------------------------
// Codes

/** Coupon codes are upper case letters and digits: "DIWALI20". */
export function normaliseCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export const CODE_PATTERN = /^[A-Z0-9]{3,20}$/;

/** Why a code can't be used, in the customer's words, or null when it can. */
export function couponProblem(offer: Pick<Offer, "startsAt" | "endsAt"> | undefined, now: Date = new Date()): string | null {
  if (!offer) return "This code isn't valid.";
  const status = offerStatus(offer, now);
  if (status === "upcoming") return `This code works from ${shortDay(offer.startsAt, now)}.`;
  if (status === "expired") return "This code has expired.";
  return null;
}
