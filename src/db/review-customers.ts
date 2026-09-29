import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { isMissingTable } from "./errors";
import { getDb } from "./index";
import type { ReviewWithProduct } from "./reviews";
import {
  orderItems,
  orders,
  products,
  reviewCustomers,
  reviews,
  users,
  type OrderStatus,
  type ReviewLinkSource,
  type User,
} from "./schema";

/** An order counts as a purchase once it is paid for and while it is not cancelled. */
const BOUGHT: OrderStatus[] = ["paid", "confirmed", "packed", "shipped", "delivered"];

/** A link only the customer or the admin made: a contact that matched proves nothing (see REVIEW_LINK_SOURCES). */
const PROVEN: ReviewLinkSource[] = ["customer", "admin"];

function missing<T>(error: unknown, fallback: T): T {
  if (!isMissingTable(error)) throw error;
  console.error("The review_customers table is missing: run `bun run db:migrate`.");
  return fallback;
}

/** The customer behind a review, as the admin sees them. */
export interface ReviewCustomerLink {
  customer: Pick<User, "id" | "name" | "email" | "phone">;
  linkedBy: ReviewLinkSource;
}

/** Who wrote a review, when that is known. Unknown while the table doesn't exist yet. */
export async function getReviewCustomer(reviewId: string): Promise<ReviewCustomerLink | null> {
  try {
    const [row] = await getDb()
      .select({
        linkedBy: reviewCustomers.linkedBy,
        customer: { id: users.id, name: users.name, email: users.email, phone: users.phone },
      })
      .from(reviewCustomers)
      .innerJoin(users, eq(users.id, reviewCustomers.userId))
      .where(eq(reviewCustomers.reviewId, reviewId))
      .limit(1);
    return row ?? null;
  } catch (error) {
    return missing(error, null);
  }
}

/**
 * Say which customer wrote a review, replacing whoever it was before.
 * Throws while the table doesn't exist; callers decide what that means.
 */
export async function linkReview(reviewId: string, userId: string, linkedBy: ReviewLinkSource): Promise<void> {
  await getDb()
    .insert(reviewCustomers)
    .values({ reviewId, userId, linkedBy })
    .onConflictDoUpdate({ target: reviewCustomers.reviewId, set: { userId, linkedBy, createdAt: new Date() } });
}

/** Take the customer off a review. False when it had none. */
export async function unlinkReview(reviewId: string): Promise<boolean> {
  const gone = await getDb().delete(reviewCustomers).where(eq(reviewCustomers.reviewId, reviewId)).returning();
  return gone.length > 0;
}

/** A customer's review with how it came to be theirs. */
export type CustomerReview = ReviewWithProduct & { linkedBy: ReviewLinkSource };

/** Every review of one customer, the latest sent first; none while the table doesn't exist yet. */
export async function listReviewsOfCustomer(userId: string): Promise<CustomerReview[]> {
  try {
    const rows = await getDb()
      .select({
        review: reviews,
        linkedBy: reviewCustomers.linkedBy,
        product: {
          id: products.id,
          name: products.name,
          slug: products.slug,
          kind: products.kind,
          category: products.category,
          availability: products.availability,
        },
      })
      .from(reviewCustomers)
      .innerJoin(reviews, eq(reviews.id, reviewCustomers.reviewId))
      .leftJoin(products, eq(products.id, reviews.productId))
      .where(eq(reviewCustomers.userId, userId))
      .orderBy(desc(reviews.createdAt));
    return rows.map(({ review, product, linkedBy }) => ({ ...review, product, linkedBy }));
  } catch (error) {
    return missing(error, []);
  }
}

/** A product the customer has paid for: what it was, and the order it was in. */
export interface Purchase {
  productSlug: string;
  productName: string;
  orderNumber: number;
  status: OrderStatus;
  boughtAt: Date;
}

/** What the customer has bought, the latest first: a line for each product of each paid order, test orders left out. */
export async function listPurchases(userId: string): Promise<Purchase[]> {
  return getDb()
    .select({
      productSlug: orderItems.productSlug,
      productName: orderItems.productName,
      orderNumber: orders.number,
      status: orders.status,
      boughtAt: orders.createdAt,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(orders.userId, userId), inArray(orders.status, BOUGHT), eq(orders.isTest, false)))
    .orderBy(desc(orders.createdAt));
}

/**
 * The reviews written by a customer who bought the product they review: the
 * customer is proven (see PROVEN) and has a paid order with that product in
 * it. None while the table doesn't exist yet.
 */
export async function listVerifiedReviewIds(): Promise<Set<string>> {
  try {
    const rows = await getDb()
      .selectDistinct({ id: reviewCustomers.reviewId })
      .from(reviewCustomers)
      .innerJoin(reviews, eq(reviews.id, reviewCustomers.reviewId))
      .innerJoin(products, eq(products.id, reviews.productId))
      .innerJoin(orders, eq(orders.userId, reviewCustomers.userId))
      .innerJoin(orderItems, and(eq(orderItems.orderId, orders.id), eq(orderItems.productSlug, products.slug)))
      .where(and(inArray(reviewCustomers.linkedBy, PROVEN), inArray(orders.status, BOUGHT), eq(orders.isTest, false)));
    return new Set(rows.map((row) => row.id));
  } catch (error) {
    return missing(error, new Set<string>());
  }
}

/** How many reviews each of these customers has written; none while the table doesn't exist yet. */
export async function countReviewsByCustomer(userIds: string[]): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  try {
    const rows = await getDb()
      .select({ userId: reviewCustomers.userId, written: sql<number>`count(*)::int` })
      .from(reviewCustomers)
      .where(inArray(reviewCustomers.userId, userIds))
      .groupBy(reviewCustomers.userId);
    return new Map(rows.map((row) => [row.userId, row.written]));
  } catch (error) {
    return missing(error, new Map());
  }
}
