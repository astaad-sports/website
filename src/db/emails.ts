import "server-only";

import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, gt, gte, inArray, isNotNull, lt, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { STALE_SENDING_MS } from "@/lib/email/kinds";

import { getDb } from "./index";
import { orderEmails, orders, type Order, type OrderEmail, type OrderEmailKind } from "./schema";

/** Resend's error messages are short; anything longer is cut to this. */
const MAX_ERROR_LENGTH = 500;

/** Before this, by the database clock, a `sending` row is stuck: its sender died. */
const staleSince = sql`now() - make_interval(secs => ${STALE_SENDING_MS / 1000})`;

/**
 * Claim an order email for sending: the row comes back when this caller
 * should send it, undefined when it is already sent or being sent.
 *
 * One statement, INSERT … ON CONFLICT (order_id, key) DO UPDATE … WHERE, so
 * it is race-free without a transaction or a lock of our own. The first
 * caller inserts the row. A caller that meets an existing row waits for any
 * other writer of that row to commit, locks it, then checks the WHERE against
 * the row as it now stands: only a failed row, or one stuck in `sending` for
 * ten minutes (the sender died), is taken back to `sending`. So of any number
 * of callers at once, exactly one gets the row; the rest see it `sending`
 * and get nothing. The recipients and tracking are the ones this attempt
 * will use, so a retry records what it actually sends.
 *
 * A new row gets a new idempotency key for Resend. A row taken back keeps
 * the one it has (set when the last try may have sent it anyway; see
 * markOrderEmailFailed), so Resend drops the retry if that try went. Taken
 * back with another courier or AWB (the shipping email after a correction),
 * it is a different email, so it gets a new key.
 */
export async function claimOrderEmail(input: {
  orderId: string;
  kind: OrderEmailKind;
  key: string;
  recipients: string[];
  tracking?: string | null;
}): Promise<OrderEmail | undefined> {
  const [claimed] = await getDb()
    .insert(orderEmails)
    .values({
      orderId: input.orderId,
      kind: input.kind,
      key: input.key,
      recipients: input.recipients.join(","),
      tracking: input.tracking ?? null,
      status: "sending",
      idempotencyKey: randomUUID(),
    })
    .onConflictDoUpdate({
      target: [orderEmails.orderId, orderEmails.key],
      set: {
        status: "sending",
        attempts: sql`${orderEmails.attempts} + 1`,
        recipients: sql`excluded.recipients`,
        tracking: sql`excluded.tracking`,
        idempotencyKey: sql`case when ${orderEmails.tracking} is not distinct from excluded.tracking
          then coalesce(${orderEmails.idempotencyKey}, excluded.idempotency_key)
          else excluded.idempotency_key end`,
        error: null,
        // The database clock, like the stale check below.
        updatedAt: sql`now()`,
      },
      setWhere: or(
        eq(orderEmails.status, "failed"),
        and(eq(orderEmails.status, "sending"), lt(orderEmails.updatedAt, staleSince))
      ),
    })
    .returning();
  return claimed;
}

/** Resend accepted the email. */
export async function markOrderEmailSent(id: string, resendId: string): Promise<void> {
  await getDb()
    .update(orderEmails)
    .set({ status: "sent", resendId, error: null, updatedAt: sql`now()` })
    .where(eq(orderEmails.id, id));
}

/**
 * The send failed, so the email can be claimed again. `error` is kept (cut to
 * 500 characters) for the order page. `keepKey` when the email may have gone
 * all the same (no answer, a 5xx): the next try reuses the idempotency key.
 * Otherwise the key is cleared and the next try gets a new one. A sent email
 * is never marked failed.
 */
export async function markOrderEmailFailed(id: string, error: string, { keepKey }: { keepKey: boolean }): Promise<void> {
  await getDb()
    .update(orderEmails)
    .set({
      status: "failed",
      error: error.slice(0, MAX_ERROR_LENGTH),
      ...(keepKey ? {} : { idempotencyKey: null }),
      updatedAt: sql`now()`,
    })
    .where(and(eq(orderEmails.id, id), ne(orderEmails.status, "sent")));
}

/** An order's emails, oldest first. */
export async function listOrderEmails(orderId: string): Promise<OrderEmail[]> {
  return getDb()
    .select()
    .from(orderEmails)
    .where(eq(orderEmails.orderId, orderId))
    .orderBy(asc(orderEmails.createdAt), asc(orderEmails.id));
}

/** One order email by its id, e.g. for Send again. */
export async function getOrderEmail(id: string): Promise<OrderEmail | undefined> {
  const [email] = await getDb().select().from(orderEmails).where(eq(orderEmails.id, id)).limit(1);
  return email;
}

/**
 * The customer's latest shipping or tracking email: its id and the courier
 * and AWB it gave (e.g. "trackon:AWB123"), or null when none has gone.
 * Counts emails sent or still being sent, but not one stuck in `sending`,
 * which may never have gone. Newest by when they were last claimed or sent,
 * so a tracking update retried after a later one counts as the latest.
 */
export async function lastEmailedTracking(orderId: string): Promise<{ id: string; tracking: string | null } | null> {
  const [row] = await getDb()
    .select({ id: orderEmails.id, tracking: orderEmails.tracking })
    .from(orderEmails)
    .where(
      and(
        eq(orderEmails.orderId, orderId),
        inArray(orderEmails.kind, ["shipped", "tracking_updated"]),
        or(
          eq(orderEmails.status, "sent"),
          and(eq(orderEmails.status, "sending"), gte(orderEmails.updatedAt, staleSince))
        )
      )
    )
    .orderBy(desc(orderEmails.updatedAt), desc(orderEmails.createdAt))
    .limit(1);
  return row ?? null;
}

/**
 * The newest tracking update since the email `afterId` that may have reached
 * the customer all the same (it failed with its idempotency key kept, or
 * never finished sending) and gave other tracking than `tracking`, or null.
 * lastEmailedTracking leaves these out, so that Send again on one still
 * follows the email before it and takes the row back, key and all.
 */
export async function unsureTrackingSince(
  orderId: string,
  afterId: string,
  tracking: string
): Promise<{ id: string } | null> {
  const db = getDb();
  const after = alias(orderEmails, "after");
  const [row] = await db
    .select({ id: orderEmails.id })
    .from(orderEmails)
    .where(
      and(
        eq(orderEmails.orderId, orderId),
        eq(orderEmails.kind, "tracking_updated"),
        or(
          and(eq(orderEmails.status, "failed"), isNotNull(orderEmails.idempotencyKey)),
          and(eq(orderEmails.status, "sending"), lt(orderEmails.updatedAt, staleSince))
        ),
        sql`${orderEmails.tracking} is distinct from ${tracking}`,
        gt(orderEmails.updatedAt, db.select({ at: after.updatedAt }).from(after).where(eq(after.id, afterId)))
      )
    )
    .orderBy(desc(orderEmails.updatedAt), desc(orderEmails.createdAt))
    .limit(1);
  return row ?? null;
}

/** An order with an email to send again, as Home's "Needs attention" shows it. */
export interface OrderWithUnsentEmails {
  order: Pick<Order, "id" | "number" | "status" | "carrier" | "trackingNumber">;
  /** All the order's emails, oldest first, so emailsToSendAgain can pick. */
  emails: OrderEmail[];
}

/**
 * The orders with an email that failed or is still `sending`, oldest order
 * first. The caller keeps the emails Send again would still send (see
 * emailsToSendAgain in src/lib/email/kinds.ts).
 */
export async function listOrdersWithUnsentEmails(): Promise<OrderWithUnsentEmails[]> {
  const db = getDb();
  const unsent = db
    .select({ orderId: orderEmails.orderId })
    .from(orderEmails)
    .where(inArray(orderEmails.status, ["failed", "sending"]));
  const rows = await db
    .select({
      email: orderEmails,
      order: {
        id: orders.id,
        number: orders.number,
        status: orders.status,
        carrier: orders.carrier,
        trackingNumber: orders.trackingNumber,
      },
    })
    .from(orderEmails)
    .innerJoin(orders, eq(orders.id, orderEmails.orderId))
    .where(inArray(orderEmails.orderId, unsent))
    .orderBy(asc(orders.number), asc(orderEmails.createdAt), asc(orderEmails.id));

  const byOrder = new Map<string, OrderWithUnsentEmails>();
  for (const { email, order } of rows) {
    const entry = byOrder.get(order.id) ?? { order, emails: [] };
    entry.emails.push(email);
    byOrder.set(order.id, entry);
  }
  return [...byOrder.values()];
}
