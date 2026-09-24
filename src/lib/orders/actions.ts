"use server";

import { findOfferByCode } from "@/db/offers";
import { attachRazorpayOrder, createOrder, markOrderPaid } from "@/db/orders";
import { getCurrentUser } from "@/lib/auth/session";
import { lineProblemText, priceCart } from "@/lib/cart";
import { paymentResponseSchema, placeOrderSchema, type AddressField } from "@/lib/checkout";
import { formatOrderNumber } from "@/lib/format";
import { CODE_PATTERN, couponProblem, normaliseCode, toAppliedCoupon, type AppliedCoupon } from "@/lib/offers/model";
import { getFreshStoreCatalogue, productsChanged } from "@/lib/products/catalogue";
import {
  createRazorpayOrder,
  razorpayConfigured,
  razorpayKeyId,
  verifyPaymentSignature,
} from "@/lib/payments/razorpay";

export interface CheckoutPayment {
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  orderNumber: number;
  prefill: { name: string; email?: string; contact: string };
}

export type PlaceOrderResult =
  | { ok: true; payment: CheckoutPayment }
  | { ok: false; error: string; fieldErrors?: Partial<Record<AddressField, string>> };

const SIGNED_OUT = "Your session has ended. Sign in again to place your order.";

export type CheckCouponResult = { ok: true; coupon: AppliedCoupon } | { ok: false; error: string };

/** The coupon behind a code, if it can be used now, or why not. */
async function couponFor(raw: unknown): Promise<CheckCouponResult> {
  const code = normaliseCode(typeof raw === "string" ? raw : "");
  if (!code) return { ok: false, error: "Enter a coupon code." };
  const offer = CODE_PATTERN.test(code) && process.env.DATABASE_URL ? await findOfferByCode(code) : undefined;
  const problem = couponProblem(offer);
  return problem || !offer ? { ok: false, error: problem ?? "This code isn't valid." } : { ok: true, coupon: toAppliedCoupon(offer) };
}

/**
 * Check a coupon code the customer typed in the cart. The cart keeps what
 * comes back; placeOrder checks the code again.
 */
export async function checkCoupon(code: unknown): Promise<CheckCouponResult> {
  return couponFor(code);
}

/**
 * Turn the cart and address into an order and a Razorpay order to pay.
 * Every price is recomputed here from the catalogue; the browser only says
 * what was chosen.
 */
export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: SIGNED_OUT };

  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<AddressField, string>> = {};
    for (const issue of parsed.error.issues) {
      const [group, field] = issue.path;
      if (group === "address" && typeof field === "string" && !(field in fieldErrors)) {
        fieldErrors[field as AddressField] = issue.message;
      }
    }
    return Object.keys(fieldErrors).length
      ? { ok: false, error: "Check the highlighted details.", fieldErrors }
      : { ok: false, error: "Your cart could not be read. Refresh the page and try again." };
  }

  const { items, address, expectedTotalPaise, couponCode } = parsed.data;
  let coupon: AppliedCoupon | null = null;
  if (couponCode) {
    const checked = await couponFor(couponCode);
    if (!checked.ok) return { ok: false, error: `${checked.error} Remove it from your cart to continue.` };
    coupon = checked.coupon;
  }
  // Priced against the database, not the cached storefront, so stock and offers are current.
  const cart = priceCart(items, await getFreshStoreCatalogue(), coupon);
  if (cart.invalid > 0 || cart.lines.length === 0) {
    return {
      ok: false,
      error: "Some items in your cart are no longer available. Review your cart and try again.",
    };
  }
  const blocked = cart.lines.find((line) => line.problem);
  if (blocked) {
    return { ok: false, error: `${blocked.name}: ${lineProblemText(blocked)}` };
  }
  // The customer pays what the Pay button said, or is asked to look again.
  if (expectedTotalPaise !== undefined && expectedTotalPaise !== cart.totalPaise) {
    return { ok: false, error: "Prices changed since you opened this page. Check your order, then pay again." };
  }

  if (!razorpayConfigured()) {
    return { ok: false, error: "Online payment is not set up yet. Please try again later." };
  }

  const order = await createOrder({ userId: user.id, email: user.email, address, cart });

  let razorpayOrder;
  try {
    razorpayOrder = await createRazorpayOrder({
      amountPaise: order.totalPaise,
      receipt: formatOrderNumber(order.number),
      notes: { order_id: order.id, order_number: String(order.number) },
    });
  } catch (error) {
    console.error("Razorpay order creation failed", error);
    return { ok: false, error: "We could not start the payment. Please try again in a moment." };
  }
  await attachRazorpayOrder(order.id, razorpayOrder.id);

  return {
    ok: true,
    payment: {
      keyId: razorpayKeyId(),
      razorpayOrderId: razorpayOrder.id,
      amountPaise: order.totalPaise,
      orderNumber: order.number,
      prefill: { name: address.name, email: user.email ?? undefined, contact: address.phone },
    },
  };
}

export type ConfirmPaymentResult = { ok: true; orderNumber: number } | { ok: false; error: string };

/**
 * Called with Razorpay Checkout's success response. The signature proves
 * Razorpay issued this payment for this order; only then is it marked paid.
 * The order.paid webhook does the same if the customer never returns here.
 */
export async function confirmPayment(input: unknown): Promise<ConfirmPaymentResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: SIGNED_OUT };

  const parsed = paymentResponseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "The payment response was incomplete." };

  const {
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: signature,
  } = parsed.data;

  if (!verifyPaymentSignature({ orderId: razorpayOrderId, paymentId: razorpayPaymentId, signature })) {
    return {
      ok: false,
      error: `We could not confirm this payment. If money left your account, contact us with payment ID ${razorpayPaymentId}.`,
    };
  }

  const { order, stockChanged } = await markOrderPaid({ razorpayOrderId, razorpayPaymentId });
  if (stockChanged) productsChanged();
  if (!order || order.userId !== user.id) {
    return { ok: false, error: "We could not find the order for this payment. Contact us with your payment ID." };
  }
  return { ok: true, orderNumber: order.number };
}
