import "server-only";

import { and, asc, count, desc, eq, exists, ilike, inArray, isNotNull, lt, ne, or, sql, type SQL } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";

import type { PricedCart } from "@/lib/cart";
import type { ShippingAddress } from "@/lib/checkout";
import {
  filterStatuses,
  isFulfilmentStatus,
  likePattern,
  needsTracking,
  stepIndex,
  timestampPlan,
  type FulfilmentStatus,
  type OrderFilter,
} from "@/lib/orders/fulfilment";

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

/**
 * Orders matching a search box: the order number (whole or part), the
 * customer's name, phone or email, a product name, or the tracking ID.
 */
function searchCondition(query: string): SQL {
  const pattern = likePattern(query);
  const conditions: (SQL | undefined)[] = [
    ilike(orders.shipName, pattern),
    ilike(orders.email, pattern),
    ilike(orders.trackingNumber, pattern),
    exists(
      getDb()
        .select({ one: sql`1` })
        .from(orderItems)
        .where(and(eq(orderItems.orderId, orders.id), ilike(orderItems.productName, pattern)))
    ),
    exists(
      getDb()
        .select({ one: sql`1` })
        .from(users)
        .where(and(eq(users.id, orders.userId), or(ilike(users.name, pattern), ilike(users.email, pattern))))
    ),
  ];

  const number = query.replace(/^#?\s*AST-?\s*/i, "");
  if (/^\d+$/.test(number)) conditions.push(sql`${orders.number}::text like ${likePattern(number)}`);

  // Phones are stored as 10 digits; "+91 98765 43210" should still find them.
  const digits = query.replace(/\D/g, "");
  if (digits.length >= 4) conditions.push(ilike(orders.shipPhone, likePattern(digits.slice(-10))));

  return or(...conditions)!;
}

/**
 * Paid orders for the admin list. Pending is oldest first, so orders go out
 * in turn; everything else is newest first.
 */
export async function listOrdersForAdmin(
  options: { filter?: OrderFilter; query?: string | null; limit?: number } = {}
): Promise<OrderWithItems[]> {
  const { filter = "all", query, limit = 100 } = options;
  const rows = await getDb()
    .select()
    .from(orders)
    .where(and(inArray(orders.status, filterStatuses(filter)), query ? searchCondition(query) : undefined))
    .orderBy(filter === "pending" ? asc(orders.paidAt) : desc(orders.createdAt))
    .limit(limit);
  return withItems(rows);
}

/** Orders shipped more than `days` ago and still not marked delivered, oldest first. */
export async function listStaleShipments(days = 7): Promise<Order[]> {
  return getDb()
    .select()
    .from(orders)
    .where(and(eq(orders.status, "shipped"), lt(orders.shippedAt, sql`now() - make_interval(days => ${days})`)))
    .orderBy(asc(orders.shippedAt));
}

/** How many orders are in each status, for the admin filters and the Home summary. */
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

export type FulfilmentUpdate =
  | { ok: true; order: Order }
  | { ok: false; reason: "not_found" | "wrong_status" | "needs_tracking" }
  | { ok: false; reason: "duplicate_tracking"; otherOrderNumber?: number };

function isUniqueViolation(error: unknown): boolean {
  for (let current = error; current; current = (current as { cause?: unknown }).cause) {
    if ((current as { code?: string }).code === "23505") return true;
  }
  return false;
}

/** Stamp the steps up to `target` that have no time yet and clear the ones after it. */
function stepTimestamps(target: FulfilmentStatus): PgUpdateSetSource<typeof orders> {
  const { stamp, clear } = timestampPlan(target);
  const set: PgUpdateSetSource<typeof orders> = {};
  for (const column of stamp) set[column] = sql`coalesce(${orders[column]}, now())`;
  for (const column of clear) set[column] = null;
  return set;
}

/**
 * Move a paid order to any fulfilment step, forwards or back (to undo a
 * mis-tap). `from` is the status the admin saw: if the order has moved on
 * since, nothing changes. Shipped and Delivered need a tracking ID.
 */
export async function setOrderStatus(
  orderId: string,
  change: { from: FulfilmentStatus; to: FulfilmentStatus }
): Promise<FulfilmentUpdate> {
  const db = getDb();
  const [updated] = await db
    .update(orders)
    .set({ status: change.to, ...stepTimestamps(change.to) })
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.status, change.from),
        needsTracking(change.to) ? isNotNull(orders.trackingNumber) : undefined
      )
    )
    .returning();
  if (updated) return { ok: true, order: updated };

  const [existing] = await db
    .select({ status: orders.status, trackingNumber: orders.trackingNumber })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!existing) return { ok: false, reason: "not_found" };
  if (existing.status !== change.from) return { ok: false, reason: "wrong_status" };
  return { ok: false, reason: "needs_tracking" };
}

/**
 * Record the courier and tracking ID. An order that has not shipped yet is
 * marked shipped (a tracking ID means the parcel is booked); a shipped or
 * delivered order keeps its status, so this also corrects a wrong ID.
 */
export async function saveOrderTracking(
  orderId: string,
  shipment: { carrier: string; trackingNumber: string }
): Promise<FulfilmentUpdate> {
  const db = getDb();
  const [clash] = await db
    .select({ number: orders.number })
    .from(orders)
    .where(and(eq(orders.trackingNumber, shipment.trackingNumber), ne(orders.id, orderId)))
    .limit(1);
  if (clash) return { ok: false, reason: "duplicate_tracking", otherOrderNumber: clash.number };

  const [current] = await db.select({ status: orders.status }).from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!current) return { ok: false, reason: "not_found" };
  if (!isFulfilmentStatus(current.status)) return { ok: false, reason: "wrong_status" };
  const ships = stepIndex(current.status) < stepIndex("shipped");

  try {
    const [updated] = await db
      .update(orders)
      .set({
        carrier: shipment.carrier,
        trackingNumber: shipment.trackingNumber,
        ...(ships ? { status: "shipped" as const, ...stepTimestamps("shipped") } : {}),
      })
      // Only if nobody changed the status in between; otherwise the admin should look again.
      .where(and(eq(orders.id, orderId), eq(orders.status, current.status)))
      .returning();
    return updated ? { ok: true, order: updated } : { ok: false, reason: "wrong_status" };
  } catch (error) {
    // Two admins saving the same tracking ID at once: the unique constraint catches the second.
    if (isUniqueViolation(error)) return { ok: false, reason: "duplicate_tracking" };
    throw error;
  }
}
