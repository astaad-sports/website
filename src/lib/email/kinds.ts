// The emails the store sends about an order, the keys that make each one
// go at most once (see orderEmails in src/db/schema.ts), and when each one
// is due. Pure and client-safe.
import type { Order, OrderEmail, OrderEmailKind, OrderStatus } from "@/db/schema";
import { isFulfilmentStatus, stepIndex } from "@/lib/orders/fulfilment";
import { normaliseTrackingNumber } from "@/lib/shipping";

/** Every kind of order email, in the order an order meets them. Matches orderEmails.kind. */
export const ORDER_EMAIL_KINDS = [
  "order_confirmation",
  "new_order_alert",
  "packed",
  "shipped",
  "tracking_updated",
  "delivered",
  "cancelled",
  "refunded",
  "unpaid_order_alert",
] as const satisfies readonly OrderEmailKind[];

/** How the admin names each email, e.g. on the order page. */
export const ORDER_EMAIL_LABEL: Record<OrderEmailKind, string> = {
  order_confirmation: "Order confirmation",
  new_order_alert: "New order alert",
  packed: "Packed update",
  shipped: "Shipping update",
  tracking_updated: "Tracking update",
  delivered: "Delivery confirmation",
  cancelled: "Cancellation",
  refunded: "Refund confirmation",
  unpaid_order_alert: "Unpaid order alert",
};

/** Whether an email of this kind goes to the admins (ADMIN_EMAILS) rather than the customer. */
export function isAdminAlert(kind: OrderEmailKind): boolean {
  return kind === "new_order_alert" || kind === "unpaid_order_alert";
}

/**
 * The courier and AWB an email gave, as one value: ("trackon", "AWB123") →
 * "trackon:AWB123". The AWB is normalised the way orders store it, so the same
 * parcel always gives the same value.
 */
export function trackingRef(carrier: string, trackingNumber: string): string {
  return `${carrier.trim().toLowerCase()}:${normaliseTrackingNumber(trackingNumber.trim())}`;
}

/**
 * The key of a tracking update: the courier and AWB it gives, and the id of
 * the latest shipping or tracking email it follows ("trackon:AWB123",
 * "5d0c…" → "tracking:trackon:AWB123:after:5d0c…"). Two calls about the same
 * correction make the same key, so it goes once; a later move back to an AWB
 * already emailed follows a different email, so it goes too.
 */
export function trackingEmailKey(ref: string, afterId: string): string {
  return `tracking:${ref}:after:${afterId}`;
}

/**
 * The key of a refund confirmation: Razorpay's refund id and the amount in
 * paise ("rfnd_Abc123", 150000 → "refund:rfnd_Abc123:150000"). One email per
 * refund, so an order refunded in two parts gets two; and the key alone
 * says what Send again has to write.
 */
export function refundEmailKey(refundId: string, amountPaise: number): string {
  return `refund:${refundId}:${amountPaise}`;
}

/** The refund a refundEmailKey names, or null for any other key. */
export function refundFromEmailKey(key: string): { id: string; amountPaise: number } | null {
  const match = /^refund:([A-Za-z0-9_]+):([1-9]\d*)$/.exec(key);
  return match ? { id: match[1], amountPaise: Number(match[2]) } : null;
}

/**
 * Whether an order is at the step an email of this kind is about: paid,
 * confirmed or packed for the confirmation and the alert, packed for the
 * packed update, shipped for the shipping and tracking emails, delivered for
 * the delivery email, cancelled for the cancellation; any step once paid for
 * a refund (an order is refunded cancelled or after a return), and only
 * before payment for the unpaid order alert. The notifiers send nothing
 * otherwise, so a late or repeated call never writes about a step the order
 * has left.
 */
export function orderAtEmailStep(kind: OrderEmailKind, status: OrderStatus): boolean {
  switch (kind) {
    case "order_confirmation":
    case "new_order_alert":
      return isFulfilmentStatus(status) && stepIndex(status) < stepIndex("shipped");
    case "packed":
      return status === "packed";
    case "shipped":
    case "tracking_updated":
      return status === "shipped";
    case "delivered":
      return status === "delivered";
    case "cancelled":
      return status === "cancelled";
    case "refunded":
      return status !== "pending_payment";
    case "unpaid_order_alert":
      return status === "pending_payment";
  }
}

/**
 * A send still `sending` after this long never finished (its sender died),
 * so it can be claimed again. In step with claimOrderEmail in src/db/emails.ts.
 */
export const STALE_SENDING_MS = 10 * 60 * 1000;

/** Whether an email has been `sending` for longer than STALE_SENDING_MS. */
export function sendingIsStale(email: Pick<OrderEmail, "status" | "updatedAt">, now: Date = new Date()): boolean {
  return email.status === "sending" && now.getTime() - email.updatedAt.getTime() > STALE_SENDING_MS;
}

/**
 * The courier and AWB of the customer's latest sent shipping or tracking
 * email (e.g. "trackon:AWB123"), newest by when it was last claimed or sent.
 * Null when none has gone, or when a later tracking update that failed but
 * may have gone all the same (its idempotency key kept, or it never
 * finished) gave other tracking, so the customer may hold that instead.
 * notifyShipment in ./notify writes again in the same case.
 */
export function lastSentTracking(
  emails: Pick<OrderEmail, "kind" | "status" | "tracking" | "idempotencyKey" | "createdAt" | "updatedAt">[],
  now: Date = new Date()
): string | null {
  const newestFirst = emails
    .filter((email) => email.kind === "shipped" || email.kind === "tracking_updated")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime() || b.createdAt.getTime() - a.createdAt.getTime());
  const latest = newestFirst.findIndex((email) => email.status === "sent");
  if (latest === -1) return null;
  const { tracking } = newestFirst[latest];
  const unsure = newestFirst
    .slice(0, latest)
    .some(
      (email) =>
        email.kind === "tracking_updated" &&
        email.tracking !== tracking &&
        ((email.status === "failed" && email.idempotencyKey !== null) || sendingIsStale(email, now))
    );
  return unsure ? null : tracking;
}

/**
 * Whether Send again would still send this email: it failed or never
 * finished sending, and the order is still at its step. A shipping or
 * tracking email goes again only while the order has a courier and tracking
 * ID that the customer's latest shipping email (`lastSent`, from
 * lastSentTracking) does not already give, and a tracking update only when
 * it is about them. The order page offers only these, so a failed email
 * about a step the order has left, or one a later email made redundant,
 * does not sit there for good.
 */
export function canSendAgain(
  email: Pick<OrderEmail, "kind" | "status" | "tracking" | "updatedAt">,
  order: Pick<Order, "status" | "carrier" | "trackingNumber">,
  lastSent: string | null,
  now: Date = new Date()
): boolean {
  if (email.status !== "failed" && !sendingIsStale(email, now)) return false;
  if (!orderAtEmailStep(email.kind, order.status)) return false;
  if (email.kind !== "shipped" && email.kind !== "tracking_updated") return true;
  const { carrier, trackingNumber } = order;
  if (carrier === null || trackingNumber === null) return false;
  const current = trackingRef(carrier, trackingNumber);
  if (lastSent === current) return false;
  // Sent again, a shipping email gives the tracking the order has now; a tracking update, its own.
  return email.kind === "shipped" || email.tracking === current;
}

/** An order's emails that Send again would still send (see canSendAgain), in the order given. */
export function emailsToSendAgain<
  E extends Pick<OrderEmail, "kind" | "status" | "tracking" | "idempotencyKey" | "createdAt" | "updatedAt">,
>(emails: E[], order: Pick<Order, "status" | "carrier" | "trackingNumber">, now: Date = new Date()): E[] {
  const lastSent = lastSentTracking(emails, now);
  return emails.filter((email) => canSendAgain(email, order, lastSent, now));
}
