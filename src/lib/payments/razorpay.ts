import "server-only";

import { isValidPaymentSignature, isValidWebhookSignature } from "./signature";

const API = "https://api.razorpay.com/v1";

interface RazorpayKeys {
  keyId: string;
  keySecret: string;
}

function keys(): RazorpayKeys | null {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return keyId && keySecret ? { keyId, keySecret } : null;
}

/** True once RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set. */
export function razorpayConfigured(): boolean {
  return keys() !== null;
}

function requireKeys(): RazorpayKeys {
  const found = keys();
  if (!found) throw new Error("Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  return found;
}

export interface RazorpayStatus {
  /** Both keys are set, so customers can pay. */
  connected: boolean;
  /** From the key id: rzp_live_… takes real money, rzp_test_… does not. */
  mode: "live" | "test" | null;
  /** RAZORPAY_WEBHOOK_SECRET is set, so payments are confirmed even if the customer closes the page. */
  webhook: boolean;
}

/** For the admin's Settings page. Never exposes the keys themselves. */
export function razorpayStatus(): RazorpayStatus {
  const found = keys();
  const mode = found?.keyId.startsWith("rzp_live_") ? "live" : found?.keyId.startsWith("rzp_test_") ? "test" : null;
  return { connected: found !== null, mode, webhook: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET) };
}

/** The public key id, which Razorpay Checkout needs in the browser. */
export function razorpayKeyId(): string {
  return requireKeys().keyId;
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
 * cannot change what the customer pays.
 */
export async function createRazorpayOrder(input: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const { keyId, keySecret } = requireKeys();
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

/** Check the checkout handler's signature with the key secret. */
export function verifyPaymentSignature(payment: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  return isValidPaymentSignature(payment, requireKeys().keySecret);
}

/** Check a webhook's signature. False when RAZORPAY_WEBHOOK_SECRET is not set. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  return Boolean(secret) && isValidWebhookSignature(rawBody, signature, secret!);
}
