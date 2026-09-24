import "server-only";

import { and, asc, count, desc, eq, exists, ilike, inArray, isNotNull, lt, ne, or, sql, type SQL } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";

import type { PricedCart } from "@/lib/cart";
import type { ShippingAddress } from "@/lib/checkout";
import { normaliseTrackingNumber } from "@/lib/shipping";
import {
  filterStatuses,
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
    // Tracking IDs are stored without spaces or dashes, however they were typed.
    ilike(orders.trackingNumber, likePattern(normaliseTrackingNumber(query))),
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

  // "10024", "AST-10024", "#10024" and "#AST-10024" all mean the same order.
  const number = query.replace(/^#?\s*(?:AST-?\s*)?/i, "");
  if (/^\d+$/.test(number)) conditions.push(sql`${orders.number}::text like ${likePattern(number)}`);

  // Phones are stored as 10 digits; "+91 98765", "98765 43210" and "+91 98765 43210" should find them.
  const digits = query.replace(/\D/g, "");
  const phone = /^\s*\+\s*91/.test(query) ? digits.slice(2) : digits.slice(-10);
  if (phone.length >= 4) conditions.push(ilike(orders.shipPhone, likePattern(phone)));

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

/** How many orders are in each status (matching a search, if given), for the filters and the Home summary. */
export async function countOrdersByStatus(query?: string | null): Promise<Partial<Record<OrderStatus, number>>> {
  const rows = await getDb()
    .select({ status: orders.status, count: count() })
    .from(orders)
    .where(query ? searchCondition(query) : undefined)
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
 * since, nothing changes. An order already at `to` is fine too, so a second
 * tap on the same step is not a conflict. Shipped and Delivered need a tracking ID.
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
        inArray(orders.status, [change.from, change.to]),
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
  if (existing.status !== change.from && existing.status !== change.to) return { ok: false, reason: "wrong_status" };
  return needsTracking(change.to) && !existing.trackingNumber
    ? { ok: false, reason: "needs_tracking" }
    : { ok: false, reason: "wrong_status" };
}

/**
 * Record the courier and tracking ID. An order that has not shipped yet is
 * marked shipped (a tracking ID means the parcel is booked); a shipped or
 * delivered order keeps its status, so this also corrects a wrong ID.
 * `from` is the status the admin saw, so another admin's change is never undone.
 */
export async function saveOrderTracking(
  orderId: string,
  shipment: { carrier: string; trackingNumber: string; from: FulfilmentStatus }
): Promise<FulfilmentUpdate> {
  const db = getDb();
  const [clash] = await db
    .select({ number: orders.number })
    .from(orders)
    .where(and(eq(orders.trackingNumber, shipment.trackingNumber), ne(orders.id, orderId)))
    .limit(1);
  if (clash) return { ok: false, reason: "duplicate_tracking", otherOrderNumber: clash.number };

  const ships = stepIndex(shipment.from) < stepIndex("shipped");
  try {
    const [updated] = await db
      .update(orders)
      .set({
        carrier: shipment.carrier,
        trackingNumber: shipment.trackingNumber,
        ...(ships ? { status: "shipped" as const, ...stepTimestamps("shipped") } : {}),
      })
      .where(and(eq(orders.id, orderId), eq(orders.status, shipment.from)))
      .returning();
    return updated ? { ok: true, order: updated } : explainMiss(orderId);
  } catch (error) {
    // Two admins saving the same tracking ID at once: the unique constraint catches the second.
    if (isUniqueViolation(error)) return { ok: false, reason: "duplicate_tracking" };
    throw error;
  }
}

/** Remove a wrong tracking ID from an order that has not shipped. A shipped order keeps its ID. */
export async function removeOrderTracking(orderId: string, from: FulfilmentStatus): Promise<FulfilmentUpdate> {
  if (stepIndex(from) >= stepIndex("shipped")) return { ok: false, reason: "wrong_status" };
  const [updated] = await getDb()
    .update(orders)
    .set({ carrier: null, trackingNumber: null })
    .where(and(eq(orders.id, orderId), eq(orders.status, from)))
    .returning();
  return updated ? { ok: true, order: updated } : explainMiss(orderId);
}

async function explainMiss(orderId: string): Promise<FulfilmentUpdate> {
  const [existing] = await getDb().select({ id: orders.id }).from(orders).where(eq(orders.id, orderId)).limit(1);
  return { ok: false, reason: existing ? "wrong_status" : "not_found" };
}
