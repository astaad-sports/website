import "server-only";

import { and, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";

import type { CartItem } from "@/lib/cart";

import { isMissingTable } from "./errors";
import { getDb } from "./index";
import { cartReminders, emailOptOuts, orderItems, orders, savedCarts, users, type OrderItem } from "./schema";

/** A day after the cart last changed (or the checkout stopped), and no later than this, a reminder may go. */
export const CART_REMINDER_MAX_DAYS = 7;

/** No address gets a second cart reminder within this many days, whichever way the first came. */
const REMINDER_GAP_DAYS = 7;

function missingTables(error: unknown): boolean {
  if (!isMissingTable(error)) return false;
  console.error("The saved carts tables are missing: run `bun run db:migrate`.");
  return true;
}

/**
 * Keep a signed-in customer's cart as their browser has it; an empty cart
 * deletes it. `changedAt` moves only when the items do, so opening the cart
 * again never puts the reminder off, and a cart already reminded about stays so.
 */
export async function saveCartFor(userId: string, items: CartItem[]): Promise<void> {
  try {
    if (items.length === 0) {
      await getDb().delete(savedCarts).where(eq(savedCarts.userId, userId));
      return;
    }
    await getDb()
      .insert(savedCarts)
      .values({ userId, items })
      .onConflictDoUpdate({
        target: savedCarts.userId,
        set: {
          items: sql`excluded.items`,
          changedAt: sql`case when ${savedCarts.items} = excluded.items then ${savedCarts.changedAt} else now() end`,
        },
      });
  } catch (error) {
    if (!missingTables(error)) throw error;
  }
}

/** The customer's saved cart, or none. */
export async function savedCartFor(userId: string): Promise<CartItem[]> {
  try {
    const [row] = await getDb().select({ items: savedCarts.items }).from(savedCarts).where(eq(savedCarts.userId, userId)).limit(1);
    return row?.items ?? [];
  } catch (error) {
    if (missingTables(error)) return [];
    throw error;
  }
}

// Spelled out: inside `sql`, a column of a one-table select is written without its table.
const notOptedOut = (email: SQL) =>
  sql`not exists (select 1 from email_opt_outs opt where opt.email = lower(${email}))`;
const noRecentReminder = (email: SQL) =>
  sql`not exists (select 1 from cart_reminders recent where lower(recent.email) = lower(${email}) and recent.created_at > now() - make_interval(days => ${REMINDER_GAP_DAYS}))`;

/** A signed-in customer's cart that is due its reminder. */
export interface CartToRemind {
  userId: string;
  email: string;
  items: CartItem[];
}

/**
 * Saved carts due their one reminder: unchanged for a day (and for no more
 * than CART_REMINDER_MAX_DAYS), not reminded about yet, from a customer with
 * an email who hasn't paid for an order since, hasn't unsubscribed, and
 * wasn't sent a cart reminder in the last week. Test accounts get them too,
 * so the owner can try one.
 */
export async function listCartsToRemind(): Promise<CartToRemind[]> {
  try {
    return await getDb()
      .select({ userId: savedCarts.userId, email: sql<string>`${users.email}`, items: savedCarts.items })
      .from(savedCarts)
      .innerJoin(users, eq(users.id, savedCarts.userId))
      .where(
        and(
          isNull(savedCarts.remindedAt),
          sql`${users.email} is not null`,
          sql`${savedCarts.changedAt} < now() - interval '1 day'`,
          sql`${savedCarts.changedAt} > now() - make_interval(days => ${CART_REMINDER_MAX_DAYS})`,
          sql`not exists (select 1 from orders paid where paid.user_id = ${savedCarts.userId} and paid.status <> 'pending_payment' and paid.created_at > ${savedCarts.changedAt})`,
          notOptedOut(sql`${users.email}`),
          noRecentReminder(sql`${users.email}`)
        )
      );
  } catch (error) {
    if (missingTables(error)) return [];
    throw error;
  }
}

/** A guest's checkout that stopped at payment and is due its reminder. */
export interface CheckoutToRemind {
  orderId: string;
  number: number;
  email: string;
  createdAt: Date;
  items: OrderItem[];
}

/**
 * Guests' checkouts that stopped at payment, a day to three days ago, due
 * their one reminder: real orders still unpaid, the guest's last try (each
 * press of Pay makes an order), with nothing paid from that email since, no
 * reminder for the order yet, no unsubscribe, and no cart reminder to that
 * email in the last week. Signed-in customers' carts are reminded about from
 * `saved_carts` instead.
 */
export async function listCheckoutsToRemind(): Promise<CheckoutToRemind[]> {
  let rows: Omit<CheckoutToRemind, "items">[];
  try {
    rows = await getDb()
      .select({ orderId: orders.id, number: orders.number, email: sql<string>`${orders.email}`, createdAt: orders.createdAt })
      .from(orders)
      .where(
        and(
          eq(orders.status, "pending_payment"),
          eq(orders.isTest, false),
          isNull(orders.userId),
          sql`${orders.email} is not null`,
          sql`${orders.createdAt} < now() - interval '1 day'`,
          sql`${orders.createdAt} > now() - interval '3 days'`,
          sql`not exists (select 1 from orders later where later.created_at > "orders"."created_at" and lower(later.email) = lower("orders"."email"))`,
          sql`not exists (select 1 from cart_reminders sent where sent.order_id = "orders"."id")`,
          notOptedOut(sql`"orders"."email"`),
          noRecentReminder(sql`"orders"."email"`)
        )
      );
  } catch (error) {
    if (missingTables(error)) return [];
    throw error;
  }
  if (rows.length === 0) return [];
  const items = await getDb()
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        rows.map((row) => row.orderId)
      )
    );
  return rows.map((row) => ({ ...row, items: items.filter((item) => item.orderId === row.orderId) }));
}

/**
 * Take a saved cart's reminder for sending: marks the cart reminded and
 * records the reminder, in one go, only while it has none. Returns the
 * reminder's id (for the unsubscribe link), or null when it is already taken.
 */
export async function claimCartReminder(cart: CartToRemind): Promise<string | null> {
  return getDb().transaction(async (tx) => {
    const [taken] = await tx
      .update(savedCarts)
      .set({ remindedAt: new Date() })
      .where(and(eq(savedCarts.userId, cart.userId), isNull(savedCarts.remindedAt)))
      .returning({ userId: savedCarts.userId });
    if (!taken) return null;
    const [reminder] = await tx
      .insert(cartReminders)
      .values({ email: cart.email, userId: cart.userId })
      .returning({ id: cartReminders.id });
    return reminder.id;
  });
}

/** Take a guest checkout's reminder for sending: once per order. Null when it is already taken. */
export async function claimCheckoutReminder(checkout: CheckoutToRemind): Promise<string | null> {
  const [reminder] = await getDb()
    .insert(cartReminders)
    .values({ email: checkout.email, orderId: checkout.orderId })
    .onConflictDoNothing()
    .returning({ id: cartReminders.id });
  return reminder?.id ?? null;
}

/** A reminder Resend refused: let tomorrow's run try again. */
export async function releaseReminder(reminderId: string, userId: string | null): Promise<void> {
  await getDb().transaction(async (tx) => {
    await tx.delete(cartReminders).where(eq(cartReminders.id, reminderId));
    if (userId) await tx.update(savedCarts).set({ remindedAt: null }).where(eq(savedCarts.userId, userId));
  });
}

/** The address a reminder went to, from its unsubscribe link's id; null for an unknown id. */
export async function reminderEmail(reminderId: string): Promise<string | null> {
  try {
    const [row] = await getDb()
      .select({ email: cartReminders.email })
      .from(cartReminders)
      .where(eq(cartReminders.id, reminderId))
      .limit(1);
    return row?.email ?? null;
  } catch (error) {
    if (missingTables(error)) return null;
    throw error;
  }
}

/** No more cart reminders to this address. Saying so twice is fine. */
export async function optOut(email: string): Promise<void> {
  await getDb()
    .insert(emailOptOuts)
    .values({ email: email.trim().toLowerCase() })
    .onConflictDoNothing();
}
