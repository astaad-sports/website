import "server-only";

import { and, asc, count, desc, eq, inArray, ne, sql } from "drizzle-orm";

import type { PricedCart } from "@/lib/cart";
import type { ShippingAddress } from "@/lib/checkout";

import { getDb } from "./index";
import { orderItems, orders, users, type Order, type OrderItem, type OrderStatus } from "./schema";

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

/**
 * Record a priced cart as a `pending_payment` order with its items, in one
 * transaction. Also keeps the checkout phone on the account if it has none.
 */
export async function createOrder(input: {
  userId: string;
  email: string | null;
  address: ShippingAddress;
  cart: PricedCart;
}): Promise<Order> {
  const { userId, email, address, cart } = input;
  return getDb().transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        userId,
        email,
        subtotalPaise: cart.subtotalPaise,
        shippingPaise: cart.shippingPaise,
        totalPaise: cart.totalPaise,
        shipName: address.name,
        shipPhone: address.phone,
        shipLine1: address.line1,
        shipLine2: address.line2 ?? null,
        shipCity: address.city,
        shipState: address.state,
        shipPincode: address.pincode,
      })
      .returning();

    await tx.insert(orderItems).values(
      cart.lines.map((line) => ({
        orderId: order.id,
        productKind: line.item.kind,
        productSlug: line.item.slug,
        productName: line.name,
        options: line.options,
        unitPricePaise: line.unitPricePaise,
        quantity: line.item.quantity,
        lineTotalPaise: line.lineTotalPaise,
      }))
    );

    await tx
      .update(users)
      .set({ phone: sql`coalesce(${users.phone}, ${address.phone})` })
      .where(eq(users.id, userId));

    return order;
  });
}

export async function attachRazorpayOrder(orderId: string, razorpayOrderId: string): Promise<void> {
  await getDb().update(orders).set({ razorpayOrderId }).where(eq(orders.id, orderId));
}

/**
 * Mark the order behind a Razorpay order as paid. Safe to call twice: the
 * checkout handler and the webhook may both report the same payment, and
 * only the first moves it out of `pending_payment`. Returns the order, or
 * undefined if no order matches.
 */
export async function markOrderPaid(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
}): Promise<Order | undefined> {
  const db = getDb();
  const [updated] = await db
    .update(orders)
    .set({ status: "paid", razorpayPaymentId: input.razorpayPaymentId, paidAt: new Date() })
    .where(and(eq(orders.razorpayOrderId, input.razorpayOrderId), eq(orders.status, "pending_payment")))
    .returning();
  if (updated) return updated;

  const [existing] = await db
    .select()
    .from(orders)
    .where(eq(orders.razorpayOrderId, input.razorpayOrderId))
    .limit(1);
  return existing;
}

async function withItems(rows: Order[]): Promise<OrderWithItems[]> {
  if (rows.length === 0) return [];
  const items = await getDb()
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        rows.map((row) => row.id)
      )
    );
  return rows.map((order) => ({ ...order, items: items.filter((item) => item.orderId === order.id) }));
}

/** The customer's orders, newest first. Unpaid checkouts stay hidden. */
export async function listOrdersForUser(userId: string, limit = 50): Promise<OrderWithItems[]> {
  const rows = await getDb()
    .select()
    .from(orders)
    .where(and(eq(orders.userId, userId), ne(orders.status, "pending_payment")))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
  return withItems(rows);
}

/** One of the customer's orders by its number, or undefined if it is not theirs. */
export async function getOrderForUser(userId: string, number: number): Promise<OrderWithItems | undefined> {
  const [order] = await getDb()
    .select()
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.number, number)))
    .limit(1);
  if (!order) return undefined;
  const [withLines] = await withItems([order]);
  return withLines;
}

/** The address from the customer's latest order, to prefill checkout. */
export async function getLastShippingAddress(userId: string): Promise<ShippingAddress | null> {
  const [order] = await getDb()
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(1);
  if (!order) return null;
  return {
    name: order.shipName,
    phone: order.shipPhone,
    line1: order.shipLine1,
    line2: order.shipLine2 ?? undefined,
    city: order.shipCity,
    state: order.shipState as ShippingAddress["state"],
    pincode: order.shipPincode,
  };
}

// ---------------------------------------------------------------------------
// Fulfilment (admin). Callers must check the admin first.

export type AdminOrderFilter = "to_ship" | "shipped" | "delivered" | "all";

const FILTER_STATUSES: Record<AdminOrderFilter, OrderStatus[]> = {
  to_ship: ["paid"],
  shipped: ["shipped"],
  delivered: ["delivered"],
  all: ["paid", "shipped", "delivered", "cancelled"],
};

/** Paid orders for fulfilment. "To ship" is oldest first, so orders go out in turn; the rest newest first. */
export async function listOrdersForAdmin(filter: AdminOrderFilter, limit = 100): Promise<OrderWithItems[]> {
  const rows = await getDb()
    .select()
    .from(orders)
    .where(inArray(orders.status, FILTER_STATUSES[filter]))
    .orderBy(filter === "to_ship" ? asc(orders.paidAt) : desc(orders.createdAt))
    .limit(limit);
  return withItems(rows);
}

/** How many orders are in each status, for the admin tabs. */
export async function countOrdersByStatus(): Promise<Partial<Record<OrderStatus, number>>> {
  const rows = await getDb()
    .select({ status: orders.status, count: count() })
    .from(orders)
    .groupBy(orders.status);
  return Object.fromEntries(rows.map((row) => [row.status, row.count]));
}

export interface AdminOrder extends OrderWithItems {
  customer: { name: string | null; email: string | null };
}

/** Any order by its number, with the customer's account name and email. */
export async function getOrderForAdmin(number: number): Promise<AdminOrder | undefined> {
  const [row] = await getDb()
    .select({ order: orders, name: users.name, email: users.email })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(eq(orders.number, number))
    .limit(1);
  if (!row) return undefined;
  const [withLines] = await withItems([row.order]);
  return { ...withLines, customer: { name: row.name, email: row.email } };
}

export type ShipmentUpdate =
  | { ok: true; order: Order }
  | { ok: false; reason: "not_found" | "wrong_status" }
  | { ok: false; reason: "duplicate_tracking"; otherOrderNumber?: number };

function isUniqueViolation(error: unknown): boolean {
  for (let current = error; current; current = (current as { cause?: unknown }).cause) {
    if ((current as { code?: string }).code === "23505") return true;
  }
  return false;
}

async function explainNoUpdate(orderId: string): Promise<ShipmentUpdate> {
  const [existing] = await getDb().select({ status: orders.status }).from(orders).where(eq(orders.id, orderId)).limit(1);
  return { ok: false, reason: existing ? "wrong_status" : "not_found" };
}

/**
 * Record the carrier and AWB and mark the order shipped. A shipped order can
 * be saved again to correct its AWB; the ship date stays the first one.
 */
export async function markOrderShipped(
  orderId: string,
  shipment: { carrier: string; trackingNumber: string }
): Promise<ShipmentUpdate> {
  const db = getDb();
  const [clash] = await db
    .select({ number: orders.number })
    .from(orders)
    .where(and(eq(orders.trackingNumber, shipment.trackingNumber), ne(orders.id, orderId)))
    .limit(1);
  if (clash) return { ok: false, reason: "duplicate_tracking", otherOrderNumber: clash.number };

  try {
    const [updated] = await db
      .update(orders)
      .set({
        status: "shipped",
        carrier: shipment.carrier,
        trackingNumber: shipment.trackingNumber,
        shippedAt: sql`coalesce(${orders.shippedAt}, now())`,
      })
      .where(and(eq(orders.id, orderId), inArray(orders.status, ["paid", "shipped"])))
      .returning();
    return updated ? { ok: true, order: updated } : explainNoUpdate(orderId);
  } catch (error) {
    // Two admins saving the same AWB at once: the unique constraint catches the second.
    if (isUniqueViolation(error)) return { ok: false, reason: "duplicate_tracking" };
    throw error;
  }
}

/** Mark a shipped order delivered. */
export async function markOrderDelivered(orderId: string): Promise<ShipmentUpdate> {
  const [updated] = await getDb()
    .update(orders)
    .set({ status: "delivered", deliveredAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.status, "shipped")))
    .returning();
  return updated ? { ok: true, order: updated } : explainNoUpdate(orderId);
}
