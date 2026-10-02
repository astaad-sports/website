// What a Razorpay refund webhook says. Pure, kept apart from the route so it
// can be unit tested; the route checks the signature first.

/** A refund Razorpay has made, as its `refund.processed` webhook reports it. */
export interface ProcessedRefund {
  /** Razorpay's id for the refund, e.g. "rfnd_Q1a2b3c4d5". */
  refundId: string;
  /** What went back to the customer, in paise. */
  amountPaise: number;
  /** The payment it returns. */
  paymentId: string;
  /** That payment's Razorpay order, when the webhook carries it. */
  razorpayOrderId: string | null;
}

interface RefundWebhook {
  event?: unknown;
  payload?: {
    refund?: { entity?: { id?: unknown; amount?: unknown; payment_id?: unknown } };
    payment?: { entity?: { id?: unknown; order_id?: unknown } };
  };
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * The refund in a `refund.processed` webhook, or null for any other event or
 * one missing the refund's id, a whole positive amount or its payment.
 * `refund.created` is left alone: it comes before the money is on its way,
 * and a refund that then fails would have told the customer otherwise.
 */
export function processedRefund(event: unknown): ProcessedRefund | null {
  if (typeof event !== "object" || event === null) return null;
  const { event: name, payload } = event as RefundWebhook;
  if (name !== "refund.processed") return null;
  const refund = payload?.refund?.entity;
  const payment = payload?.payment?.entity;
  const refundId = text(refund?.id);
  const paymentId = text(refund?.payment_id) ?? text(payment?.id);
  const amount = refund?.amount;
  // The id goes into the email's key (see refundEmailKey), so only Razorpay's own alphabet.
  if (!refundId || !/^[A-Za-z0-9_]+$/.test(refundId) || !paymentId) return null;
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) return null;
  return { refundId, amountPaise: amount, paymentId, razorpayOrderId: text(payment?.order_id) };
}
