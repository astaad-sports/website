import "server-only";

import { and, count, desc, eq, gte, sql } from "drizzle-orm";

import { getDb } from "./index";
import { products, reviews, type NewReview, type Product, type Review, type ReviewStatus } from "./schema";

/** The product a review names, as a review needs it. */
export type ReviewProduct = Pick<Product, "id" | "name" | "slug" | "kind" | "category" | "availability">;

export type ReviewWithProduct = Review & { product: ReviewProduct | null };

const productColumns = {
  id: products.id,
  name: products.name,
  slug: products.slug,
  kind: products.kind,
  category: products.category,
  availability: products.availability,
};

/**
 * Whether the reviews table isn't there yet: code that reads it can reach a
 * server before `bun run db:migrate` has run against its database.
 */
export function isMissingReviewsTable(error: unknown): boolean {
  for (let current = error; current; current = (current as { cause?: unknown }).cause) {
    if ((current as { code?: string }).code === "42P01") return true;
  }
  return false;
}

function withProduct(rows: { review: Review; product: ReviewProduct | null }[]): ReviewWithProduct[] {
  return rows.map(({ review, product }) => ({ ...review, product }));
}

/** Published reviews, the latest published first. */
export async function listPublishedReviews(): Promise<ReviewWithProduct[]> {
  const rows = await getDb()
    .select({ review: reviews, product: productColumns })
    .from(reviews)
    .leftJoin(products, eq(products.id, reviews.productId))
    .where(eq(reviews.status, "published"))
    .orderBy(desc(reviews.publishedAt), desc(reviews.createdAt));
  return withProduct(rows);
}

/** Every review, the latest sent first. A store this size has a few dozen. */
export async function listReviewsForAdmin(): Promise<ReviewWithProduct[]> {
  const rows = await getDb()
    .select({ review: reviews, product: productColumns })
    .from(reviews)
    .leftJoin(products, eq(products.id, reviews.productId))
    .orderBy(desc(reviews.createdAt));
  return withProduct(rows);
}

/** How many reviews wait for the admin to look at them; 0 while the table doesn't exist yet. */
export async function countNewReviews(): Promise<number> {
  try {
    const [row] = await getDb().select({ count: count() }).from(reviews).where(eq(reviews.status, "new"));
    return row?.count ?? 0;
  } catch (error) {
    if (!isMissingReviewsTable(error)) throw error;
    console.error("The reviews table is missing: run `bun run db:migrate`.");
    return 0;
  }
}

export async function getReview(id: string): Promise<ReviewWithProduct | undefined> {
  const [row] = await getDb()
    .select({ review: reviews, product: productColumns })
    .from(reviews)
    .leftJoin(products, eq(products.id, reviews.productId))
    .where(eq(reviews.id, id))
    .limit(1);
  return row ? { ...row.review, product: row.product } : undefined;
}

export type ReviewInput = Omit<NewReview, "id" | "createdAt" | "updatedAt">;

export async function createReview(input: ReviewInput): Promise<Review> {
  const [review] = await getDb().insert(reviews).values(input).returning();
  return review;
}

/** The fields the admin's form changes. */
export type ReviewEdit = Pick<
  NewReview,
  "name" | "place" | "rating" | "body" | "productId" | "photoUrl" | "photoPathname" | "photoWidth" | "photoHeight" | "photoAlt"
>;

export async function updateReview(id: string, edit: ReviewEdit): Promise<Review | undefined> {
  const [review] = await getDb().update(reviews).set(edit).where(eq(reviews.id, id)).returning();
  return review;
}

/**
 * Publish or hide a review, or mark a new one as seen (hidden). Publishing
 * stamps the first publish time and never touches a private review, which
 * leaves it undefined.
 */
export async function setReviewStatus(id: string, status: ReviewStatus): Promise<Review | undefined> {
  const published = status === "published";
  const [review] = await getDb()
    .update(reviews)
    .set(published ? { status, publishedAt: sql`coalesce(${reviews.publishedAt}, now())` } : { status })
    .where(published ? and(eq(reviews.id, id), eq(reviews.isPrivate, false)) : eq(reviews.id, id))
    .returning();
  return review;
}

/** Delete a review; the caller removes its photo file with what comes back. */
export async function deleteReview(id: string): Promise<Review | undefined> {
  const [review] = await getDb().delete(reviews).where(eq(reviews.id, id)).returning();
  return review;
}

/** How many reviews one sender has sent since `since`. */
export async function countReviewsFrom(senderHash: string, since: Date): Promise<number> {
  const [row] = await getDb()
    .select({ count: count() })
    .from(reviews)
    .where(and(eq(reviews.senderHash, senderHash), gte(reviews.createdAt, since)));
  return row?.count ?? 0;
}
