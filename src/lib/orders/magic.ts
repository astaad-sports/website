import "server-only";

import { z } from "zod";

import {
  createMagicOrder,
  getMagicCheckout,
  getMagicCheckoutByRazorpayOrder,
  keepCouponCart,
} from "@/db/magic-checkouts";
import { markOrderPaid } from "@/db/orders";
import type { MagicCheckout, Order } from "@/db/schema";
import { priceCart, type PricedCart } from "@/lib/cart";
import { notifyLater, notifyOrderPaid } from "@/lib/email/notify";
import { couponFor } from "@/lib/orders/coupon";
import {
  customerFromMagicOrder,
  customerWithoutAddress,
  promotionCode,
  promotionFailure,
  promotionResponse,
  type MagicOrder,
  type PromotionResponse,
} from "@/lib/payments/magic";
import { fetchRazorpayOrder } from "@/lib/payments/razorpay";
import { getFreshStoreCatalogue, productsChanged } from "@/lib/products/catalogue";

/**
 * What Razorpay sends the store's Magic Checkout addresses, read leniently:
 * the documentation calls them GET requests with a JSON body, and Razorpay's
 * own plugins receive a POST. Never throws; an unreadable request is `{}`.
 */
export async function readMagicRequest(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.text();
    const parsed: unknown = body ? JSON.parse(body) : Object.fromEntries(new URL(request.url).searchParams);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * Razorpay's "apply this coupon" for a Magic Checkout (`order_id` is the
 * checkout's id, `code` what the customer typed): what the code takes off,
 * or why it cannot be used. A code that works is kept with the cart priced
 * with it, so the paid order records the same prices Razorpay charged.
 */
export async function applyMagicPromotion(request: Record<string, unknown>): Promise<PromotionResponse> {
  const id = z.uuid().safeParse(request.order_id);
  if (!id.success || typeof request.code !== "string" || !process.env.DATABASE_URL) {
    return promotionFailure("This code isn't valid.");
  }
  const checkout = await getMagicCheckout(id.data);
  if (!checkout || checkout.orderId) return promotionFailure("This order can no longer take a coupon.");

  const checked = await couponFor(request.code);
  if (!checked.ok) return promotionFailure(checked.error);

  const withCoupon = priceCart(checkout.items, await getFreshStoreCatalogue(), checked.coupon);
  const response = promotionResponse(checkout.cart, withCoupon, checked.coupon);
  if ("promotion" in response) await keepCouponCart(checkout.id, checked.coupon.code, withCoupon);
  return response;
}

/**
 * The cart a paid Magic Checkout is recorded with: priced with the coupon
 * Razorpay took money off with, if any, and with the delivery charge Razorpay
 * added. If Razorpay names a coupon the store kept no prices for, its value
 * comes off the order as a whole. A difference between what Razorpay charged
 * and what the store priced is logged for the owner; the order is still made.
 */
function paidCart(checkout: MagicCheckout, paid: MagicOrder): PricedCart {
  const code = promotionCode(paid);
  const kept = code ? checkout.couponCarts[code] : undefined;
  let cart = kept ?? checkout.cart;
  if (code && !kept) {
    const value = paid.promotions?.find((promotion) => promotion.code)?.value ?? 0;
    cart = {
      ...cart,
      subtotalPaise: cart.subtotalPaise - value,
      discountPaise: cart.discountPaise + value,
      coupon: { code, name: code, covered: true, applied: true },
    };
  }
  const shippingPaise = paid.shipping_fee ?? cart.shippingPaise;
  const totalPaise = cart.subtotalPaise + shippingPaise;
  const charged = paid.amount_paid || paid.amount;
  if (charged && charged !== totalPaise) {
    console.error(
      `Magic Checkout ${checkout.id}: Razorpay charged ${charged} paise and the store priced ${totalPaise} paise. Check order ${paid.id} in the Razorpay dashboard.`
    );
  }
  return { ...cart, shippingPaise, totalPaise };
}

export type MagicCompletion =
  /** The Razorpay order is not a Magic Checkout. */
  | { status: "none" }
  | { status: "done"; order: Order }
  /** Paid, but the order could not be made yet; trying again later may work. */
  | { status: "failed"; reason: string };

/**
 * Called once a Magic Checkout's payment is known to be real (the checkout
 * handler's signature, or Razorpay's signed webhook): reads the address and
 * email the customer gave Razorpay, makes the order, marks it paid, takes it
 * from stock and sends its emails. Safe to call twice; each step happens once.
 * If Razorpay has no address for the order, the checkout handler fails (the
 * webhook follows); the webhook, with `withoutAddress`, makes the order
 * anyway with a note in place of the address, so a payment never goes
 * without an order the owner can see.
 */
export async function completeMagicCheckout(
  input: { razorpayOrderId: string; razorpayPaymentId: string },
  options: { withoutAddress?: boolean } = {}
): Promise<MagicCompletion> {
  const checkout = await getMagicCheckoutByRazorpayOrder(input.razorpayOrderId);
  if (!checkout) return { status: "none" };

  if (!checkout.orderId) {
    let paid: MagicOrder;
    try {
      paid = await fetchRazorpayOrder(input.razorpayOrderId, { test: checkout.isTest });
    } catch (error) {
      console.error("Magic Checkout: the paid order could not be read from Razorpay", error);
      return { status: "failed", reason: "Razorpay could not be reached" };
    }
    let customer = customerFromMagicOrder(paid);
    if (!customer) {
      console.error(`Magic Checkout ${checkout.id}: Razorpay order ${paid.id} has no delivery address`);
      if (!options.withoutAddress) return { status: "failed", reason: "Razorpay has no delivery address for the order" };
      customer = customerWithoutAddress(paid);
    }
    await createMagicOrder(checkout.id, {
      ...customer,
      cart: paidCart(checkout, paid),
      razorpayOrderId: input.razorpayOrderId,
    });
  }

  const { order, stockChanged } = await markOrderPaid(input);
  if (stockChanged) productsChanged();
  if (!order) return { status: "failed", reason: "The order was not found after it was made" };
  // After the response. The handler and the webhook both ask; each email still goes once.
  if (order.status !== "pending_payment") notifyLater(() => notifyOrderPaid(order.id));
  return { status: "done", order };
}
