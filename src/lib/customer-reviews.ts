// Google Customer Reviews: once an order is paid, Google asks the customer
// whether it may email them a survey about the purchase. Pure: tests pass
// their own environment.
import type { Order } from "@/db/schema";
import { isLiveSite } from "@/lib/analytics";
import { formatOrderNumber } from "@/lib/format";

/** The store's Google Merchant Center account. Public: it is in the page that asks. */
export const MERCHANT_ID = 5864447654;

/**
 * Days from payment to the day we tell Google the parcel will have arrived:
 * up to 3 to dispatch, then the courier's 3 to 7. Google emails its survey
 * after that day, so this is the late end: a survey should not reach the
 * customer before the parcel does.
 */
export const DELIVERY_ESTIMATE_DAYS = 10;

const INDIA_OFFSET_MS = (5 * 60 + 30) * 60_000;
const DAY_MS = 24 * 60 * 60_000;

/** What Google's opt-in takes, in Google's own field names. */
export interface ReviewOptIn {
  merchant_id: number;
  /** The customer-facing number, "AST-10001". */
  order_id: string;
  email: string;
  /** The store delivers in India only. */
  delivery_country: "IN";
  /** "2026-10-15", an Indian calendar day. */
  estimated_delivery_date: string;
}

/** The day an order paid at `paidAt` should have arrived, as Google wants it: "YYYY-MM-DD", in Indian time. */
export function estimatedDeliveryDate(paidAt: Date): string {
  return new Date(paidAt.getTime() + INDIA_OFFSET_MS + DELIVERY_ESTIMATE_DAYS * DAY_MS).toISOString().slice(0, 10);
}

/**
 * What to ask Google's opt-in with for a paid order, or null when the customer
 * should not be asked: off the live site, for a test order (nothing ships),
 * or when the order has no email address for Google to write to.
 */
export function reviewOptIn(
  order: Pick<Order, "number" | "email" | "paidAt" | "isTest">,
  env: Record<string, string | undefined> = process.env
): ReviewOptIn | null {
  if (!isLiveSite(env) || order.isTest || !order.email || !order.paidAt) return null;
  return {
    merchant_id: MERCHANT_ID,
    order_id: formatOrderNumber(order.number),
    email: order.email,
    delivery_country: "IN",
    estimated_delivery_date: estimatedDeliveryDate(order.paidAt),
  };
}
