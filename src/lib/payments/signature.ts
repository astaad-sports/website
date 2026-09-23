// Razorpay signature checks. Pure functions, kept apart from the API client
// so they can be unit tested without the server-only guard.
import { createHmac, timingSafeEqual } from "node:crypto";

function hmacHex(secret: string, message: string): string {
  return createHmac("sha256", secret).update(message).digest("hex");
}

function safeEqualHex(expected: string, received: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * The checkout handler's proof of payment: HMAC-SHA256 of
 * "<razorpay_order_id>|<razorpay_payment_id>" with the key secret.
 */
export function isValidPaymentSignature(
  { orderId, paymentId, signature }: { orderId: string; paymentId: string; signature: string },
  keySecret: string
): boolean {
  return safeEqualHex(hmacHex(keySecret, `${orderId}|${paymentId}`), signature);
}

/** A webhook's X-Razorpay-Signature: HMAC-SHA256 of the raw request body with the webhook secret. */
export function isValidWebhookSignature(rawBody: string, signature: string, webhookSecret: string): boolean {
  return safeEqualHex(hmacHex(webhookSecret, rawBody), signature);
}
