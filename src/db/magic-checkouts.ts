import "server-only";

import { eq, sql } from "drizzle-orm";

import type { CartItem, PricedCart } from "@/lib/cart";
import type { ShippingAddress } from "@/lib/checkout";

import { getDb } from "./index";
import { createOrder } from "./orders";
import { magicCheckouts, orders, type MagicCheckout, type Order } from "./schema";

/** Record what a Magic Checkout is for, before Razorpay's window opens. */
export async function createMagicCheckout(input: {
  userId: string | null;
  test: boolean;
  items: CartItem[];
  cart: PricedCart;
}): Promise<MagicCheckout> {
  const [checkout] = await getDb()
    .insert(magicCheckouts)
    .values({ userId: input.userId, isTest: input.test, items: input.items, cart: input.cart })
    .returning();
  return checkout;
}

export async function attachMagicRazorpayOrder(id: string, razorpayOrderId: string): Promise<void> {
  await getDb().update(magicCheckouts).set({ razorpayOrderId }).where(eq(magicCheckouts.id, id));
}

/** A Magic Checkout by its id, which is its Razorpay order's receipt. */
export async function getMagicCheckout(id: string): Promise<MagicCheckout | undefined> {
  const [checkout] = await getDb().select().from(magicCheckouts).where(eq(magicCheckouts.id, id)).limit(1);
  return checkout;
}

export async function getMagicCheckoutByRazorpayOrder(razorpayOrderId: string): Promise<MagicCheckout | undefined> {
  const [checkout] = await getDb()
    .select()
    .from(magicCheckouts)
    .where(eq(magicCheckouts.razorpayOrderId, razorpayOrderId))
    .limit(1);
  return checkout;
}

/** Keep the cart as priced with a coupon Razorpay asked about, for when the order is paid with it. */
export async function keepCouponCart(id: string, code: string, cart: PricedCart): Promise<void> {
  await getDb()
    .update(magicCheckouts)
    .set({ couponCarts: sql`${magicCheckouts.couponCarts} || ${JSON.stringify({ [code]: cart })}::jsonb` })
    .where(eq(magicCheckouts.id, id));
}

/**
 * Turn a paid Magic Checkout into its order, once. The checkout handler and
 * the webhook may both report the payment at the same moment: the row is
 * locked, so the second one finds the order the first one made. The order
 * starts as `pending_payment` with its Razorpay order attached, for
 * markOrderPaid to pay and take from stock as it does for any order.
 */
export async function createMagicOrder(
  id: string,
  input: { email: string | null; address: ShippingAddress; cart: PricedCart; razorpayOrderId: string }
): Promise<Order> {
  return getDb().transaction(async (tx) => {
    const [checkout] = await tx.select().from(magicCheckouts).where(eq(magicCheckouts.id, id)).for("update");
    if (!checkout) throw new Error(`Magic Checkout ${id} does not exist`);
    if (checkout.orderId) {
      const [existing] = await tx.select().from(orders).where(eq(orders.id, checkout.orderId)).limit(1);
      if (existing) return existing;
    }
    const order = await createOrder(
      { userId: checkout.userId, email: input.email, address: input.address, cart: input.cart, test: checkout.isTest },
      tx
    );
    const [attached] = await tx
      .update(orders)
      .set({ razorpayOrderId: input.razorpayOrderId })
      .where(eq(orders.id, order.id))
      .returning();
    await tx.update(magicCheckouts).set({ orderId: order.id }).where(eq(magicCheckouts.id, id));
    return attached;
  });
}
