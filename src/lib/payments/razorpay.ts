import "server-only";

import { razorpayKeys, type RazorpayKeys } from "./keys";
import { siteUrl } from "@/lib/site";

import type { MagicLineItem, MagicOrder } from "./magic";
import { isValidPaymentSignature, isValidWebhookSignature } from "./signature";

const API = "https://api.razorpay.com/v1";

/** `test` picks test-mode keys, for a test account's orders (see keys.ts). */
interface Mode {
  test?: boolean;
}

function keys(mode: Mode = {}): RazorpayKeys | null {
  return razorpayKeys(process.env, mode);
}

/**
 * True once RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set; for a test
 * account, once there are test-mode keys.
 */
export function razorpayConfigured(mode: Mode = {}): boolean {
  return keys(mode) !== null;
}

function requireKeys(mode: Mode = {}): RazorpayKeys {
  const found = keys(mode);
  if (found) return found;
  throw new Error(
    mode.test
      ? "Razorpay has no test keys. Set RAZORPAY_TEST_KEY_ID and RAZORPAY_TEST_KEY_SECRET."
      : "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
  );
}

export interface RazorpayStatus {
  /** Both keys are set, so customers can pay. */
  connected: boolean;
  /** From the key id: rzp_live_… takes real money, rzp_test_… does not. */
  mode: "live" | "test" | null;
  /** RAZORPAY_WEBHOOK_SECRET is set, so payments are confirmed even if the customer closes the page. */
  webhook: boolean;
  /** Magic Checkout: the store's addresses Razorpay's dashboard asks for. */
  magic: { shippingInfoUrl: string; getPromotionsUrl: string; applyPromotionsUrl: string };
}

/** For the admin's Settings page. Never exposes the keys themselves. */
export function razorpayStatus(): RazorpayStatus {
  const found = keys();
  const mode = found?.keyId.startsWith("rzp_live_") ? "live" : found?.keyId.startsWith("rzp_test_") ? "test" : null;
  const base = `${siteUrl()}/api/magic-checkout`;
  return {
    connected: found !== null,
    mode,
    webhook: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
    magic: {
      shippingInfoUrl: `${base}/shipping-info`,
      getPromotionsUrl: `${base}/promotions`,
      applyPromotionsUrl: `${base}/apply-promotion`,
    },
  };
}

/** The public key id, which Razorpay Checkout needs in the browser. */
export function razorpayKeyId(mode: Mode = {}): string {
  return requireKeys(mode).keyId;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

/**
 * Create a Razorpay order: it locks the amount server-side so the browser
 * cannot change what the customer pays. With `lineItems` it is a Magic
 * Checkout order: `amountPaise` is then the items' total, and Razorpay adds
 * the delivery charge and takes off a coupon itself (see magic.ts).
 */
export async function createRazorpayOrder(input: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
  test?: boolean;
  lineItems?: MagicLineItem[];
}): Promise<RazorpayOrder> {
  const { keyId, keySecret } = requireKeys({ test: input.test });
  const response = await fetch(`${API}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes,
      ...(input.lineItems ? { line_items_total: input.amountPaise, line_items: input.lineItems } : {}),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Razorpay order creation failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  return (await response.json()) as RazorpayOrder;
}

/**
 * A Magic Checkout order as Razorpay has it once paid: who bought it, where
 * it ships, the delivery charge and any coupon. Read with the keys the order
 * was made with.
 */
export async function fetchRazorpayOrder(id: string, mode: Mode = {}): Promise<MagicOrder> {
  const { keyId, keySecret } = requireKeys(mode);
  const response = await fetch(`${API}/orders/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Razorpay order ${id} could not be read (${response.status}): ${detail.slice(0, 300)}`);
  }
  return (await response.json()) as MagicOrder;
}

/**
 * Check the checkout handler's signature with the key secret of the mode the
 * order was placed in, so a test payment can never pay for a real order.
 */
export function verifyPaymentSignature(
  payment: { orderId: string; paymentId: string; signature: string },
  mode: Mode = {}
): boolean {
  return isValidPaymentSignature(payment, requireKeys(mode).keySecret);
}

/** Check a webhook's signature. False when RAZORPAY_WEBHOOK_SECRET is not set. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  return Boolean(secret) && isValidWebhookSignature(rawBody, signature, secret!);
}
