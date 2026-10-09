"use server";

import { z } from "zod";

import { attachMagicRazorpayOrder, createMagicCheckout, getMagicCheckoutByRazorpayOrder } from "@/db/magic-checkouts";
import { getCurrentUser } from "@/lib/auth/session";
import { isTestAccount } from "@/lib/auth/test-account";
import { cartItemSchema, MAX_LINES, priceCart } from "@/lib/cart";
import { paymentResponseSchema } from "@/lib/checkout";
import { completeMagicCheckout } from "@/lib/orders/magic";
import { orderPath } from "@/lib/orders/path";
import { magicLineItems } from "@/lib/payments/magic";
import {
  createRazorpayOrder,
  razorpayConfigured,
  razorpayKeyId,
  verifyPaymentSignature,
} from "@/lib/payments/razorpay";
import { getFreshStoreCatalogue } from "@/lib/products/catalogue";
import { getStoreSettings } from "@/lib/settings/store";
import { siteUrl } from "@/lib/site";

/** What Razorpay's Magic Checkout window is opened with. */
export interface MagicCheckoutStart {
  keyId: string;
  razorpayOrderId: string;
  /** Settings' store name, shown in the window. */
  storeName: string;
  /** The signed-in customer's details, so Razorpay need not ask for them. */
  prefill: { name?: string; email?: string; contact?: string };
}

export type StartMagicCheckoutResult = { ok: true; checkout: MagicCheckoutStart } | { ok: false };

const startSchema = z.object({ items: z.array(cartItemSchema).min(1).max(MAX_LINES) });

/**
 * Start a Razorpay Magic Checkout for what "Buy now" chose: price it from the
 * database, keep it, and make the Razorpay order the window opens. Razorpay's
 * window then takes the mobile number, address, coupon and payment. No
 * account is needed. Whenever this cannot be done (the product is out of
 * stock, Razorpay turned the order down), the answer is a plain "no" and Buy
 * now opens the store's own checkout, which says what is wrong.
 */
export async function startMagicCheckout(input: unknown): Promise<StartMagicCheckoutResult> {
  if (!process.env.DATABASE_URL) return { ok: false };
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const user = await getCurrentUser();
  // A test account pays in Razorpay's test mode, as at the store's own checkout.
  const test = user ? isTestAccount(user) : false;
  if (!razorpayConfigured({ test })) return { ok: false };

  const [catalogue, settings] = await Promise.all([getFreshStoreCatalogue(), getStoreSettings()]);
  const cart = priceCart(parsed.data.items, catalogue);
  if (cart.invalid > 0 || cart.lines.length === 0 || cart.unavailable > 0) return { ok: false };

  try {
    const checkout = await createMagicCheckout({ userId: user?.id ?? null, test, items: parsed.data.items, cart });
    const razorpayOrder = await createRazorpayOrder({
      // The items alone: Razorpay adds the delivery charge and takes off a coupon in its window.
      amountPaise: cart.subtotalPaise,
      receipt: checkout.id,
      notes: { magic_checkout_id: checkout.id },
      test,
      lineItems: magicLineItems(cart, siteUrl()),
    });
    await attachMagicRazorpayOrder(checkout.id, razorpayOrder.id);
    return {
      ok: true,
      checkout: {
        keyId: razorpayKeyId({ test }),
        razorpayOrderId: razorpayOrder.id,
        storeName: settings.storeName,
        prefill: {
          name: user?.name ?? undefined,
          email: user?.email ?? undefined,
          contact: user?.phone ?? undefined,
        },
      },
    };
  } catch (error) {
    console.error("Magic Checkout could not be started", error);
    return { ok: false };
  }
}

export type ConfirmMagicPaymentResult =
  /** `orderPath` is where the customer opens the order; `couponCode` the coupon it was paid with, if any. */
  { ok: true; orderNumber: number; orderPath: string; couponCode: string | null } | { ok: false; error: string };

/**
 * Called with Razorpay's success response for a Magic Checkout. The signature
 * proves Razorpay issued the payment for this order; the order is then made
 * from the address the customer gave Razorpay (see completeMagicCheckout).
 * The order.paid webhook does the same if the customer never returns here.
 */
export async function confirmMagicPayment(input: unknown): Promise<ConfirmMagicPaymentResult> {
  const parsed = paymentResponseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "The payment response was incomplete." };
  const {
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: signature,
  } = parsed.data;
  const contactUs = `If money left your account, contact us with payment ID ${razorpayPaymentId}.`;

  const checkout = await getMagicCheckoutByRazorpayOrder(razorpayOrderId);
  if (
    !checkout ||
    !verifyPaymentSignature({ orderId: razorpayOrderId, paymentId: razorpayPaymentId, signature }, { test: checkout.isTest })
  ) {
    return { ok: false, error: `We could not confirm this payment. ${contactUs}` };
  }

  const completion = await completeMagicCheckout({ razorpayOrderId, razorpayPaymentId });
  if (completion.status !== "done") {
    return {
      ok: false,
      error: `Your payment went through, but we could not open your order yet. It will be confirmed shortly. ${contactUs}`,
    };
  }
  const { order } = completion;
  return { ok: true, orderNumber: order.number, orderPath: orderPath(order), couponCode: order.couponCode };
}
