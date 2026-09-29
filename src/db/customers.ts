import "server-only";

import { count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

import { isMissingTable } from "./errors";
import { getDb } from "./index";
import { countReviewsByCustomer } from "./review-customers";
import { addresses, users, type User } from "./schema";

/** A customer in the admin's list: who they are, and how much they have with the store. */
export interface CustomerSummary extends Pick<User, "id" | "name" | "email" | "phone" | "createdAt"> {
  /** Paid orders, test orders left out. */
  orders: number;
  addresses: number;
  /** Reviews on their account, whatever their status. */
  reviews: number;
}

function likePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
}

/** Customers matching a search box: name, email or phone, on the account or on one of their saved addresses. */
function searchCondition(query: string): SQL {
  const pattern = likePattern(query);
  const conditions: (SQL | undefined)[] = [ilike(users.name, pattern), ilike(users.email, pattern)];
  // Phones are stored as 10 digits; "+91 98765", "98765 43210" and "+91 98765 43210" should find them.
  const digits = query.replace(/\D/g, "");
  const phone = /^\s*\+\s*91/.test(query) ? digits.slice(2) : digits.slice(-10);
  if (phone.length >= 4) conditions.push(ilike(users.phone, likePattern(phone)));
  return or(...conditions)!;
}

/** How many addresses each of these customers has saved; none while the table doesn't exist yet. */
async function addressCounts(userIds: string[]): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  try {
    const rows = await getDb()
      .select({ userId: addresses.userId, saved: count() })
      .from(addresses)
      .where(inArray(addresses.userId, userIds))
      .groupBy(addresses.userId);
    return new Map(rows.map((row) => [row.userId, row.saved]));
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    console.error("The addresses table is missing: run `bun run db:migrate`.");
    return new Map();
  }
}

/** Everyone with an account, the latest to join first. A store this size has a few hundred at most. */
export async function listCustomers({ query, limit = 200 }: { query?: string | null; limit?: number } = {}): Promise<CustomerSummary[]> {
  // Spelled out: in a one-table select Drizzle writes a column without its table, which here would read as the order's own.
  const paidOrders = sql<number>`(
    select count(*)::int from "orders"
    where "orders"."user_id" = "users"."id" and "orders"."status" <> 'pending_payment' and not "orders"."is_test"
  )`;
  const rows = await getDb()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      createdAt: users.createdAt,
      orders: paidOrders,
    })
    .from(users)
    .where(query ? searchCondition(query) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(limit);
  const ids = rows.map((row) => row.id);
  const [saved, written] = await Promise.all([addressCounts(ids), countReviewsByCustomer(ids)]);
  return rows.map((row) => ({ ...row, addresses: saved.get(row.id) ?? 0, reviews: written.get(row.id) ?? 0 }));
}

export async function countCustomers(): Promise<number> {
  const [row] = await getDb().select({ customers: count() }).from(users);
  return row?.customers ?? 0;
}

export async function getCustomer(id: string): Promise<User | undefined> {
  const [user] = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
  return user;
}
