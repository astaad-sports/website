import "server-only";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

import { isMissingReviewsTable, listPublishedReviews, type ReviewWithProduct } from "@/db/reviews";
import { CUSTOMER_PHOTOS } from "@/lib/customer-photos";
import { productHref } from "@/lib/products/model";

import { photoAltText, type PublicReview } from "./model";

/** Everything cached from reviews carries this tag. */
export const REVIEWS_TAG = "reviews";

/** A backstop for changes made outside the admin; admin changes refresh at once (see reviewsChanged). */
const REVIEWS_REVALIDATE = 300;

/** A photo saved before its size was known is drawn at 4:5, the usual phone portrait crop. */
const DEFAULT_PHOTO = { width: 1120, height: 1400 };

export function toPublicReview(review: ReviewWithProduct): PublicReview {
  const product = review.product;
  return {
    id: review.id,
    name: review.name,
    place: review.place,
    rating: review.rating,
    body: review.body,
    // A hidden product keeps its name on the review, without a link to a page that is gone.
    product: product ? { name: product.name, href: product.availability === "hidden" ? null : productHref(product) } : null,
    photo: review.photoUrl
      ? {
          src: review.photoUrl,
          width: review.photoWidth ?? DEFAULT_PHOTO.width,
          height: review.photoHeight ?? DEFAULT_PHOTO.height,
          alt: photoAltText(review.photoAlt, review.name),
        }
      : null,
  };
}

/** The site's customer photos as reviews, for when there is no reviews table to read. */
function photoReviews(): PublicReview[] {
  return CUSTOMER_PHOTOS.map(({ alt, ...photo }) => ({
    id: photo.src,
    name: null,
    place: null,
    rating: null,
    body: null,
    product: null,
    photo: { ...photo, alt },
  }));
}

/**
 * Published reviews from the database. The site's customer photos stand in
 * while no database is configured (local development), and while the
 * reviews migration hasn't run, so the home page never breaks on it.
 */
async function loadPublished(): Promise<PublicReview[]> {
  if (!process.env.DATABASE_URL) return photoReviews();
  try {
    return (await listPublishedReviews()).map(toPublicReview);
  } catch (error) {
    if (!isMissingReviewsTable(error)) throw error;
    console.error("The reviews table is missing: run `bun run db:migrate`. Showing the site's customer photos meanwhile.");
    return photoReviews();
  }
}

const getCachedReviews = unstable_cache(loadPublished, ["published-reviews"], {
  tags: [REVIEWS_TAG],
  revalidate: REVIEWS_REVALIDATE,
});

/** Published reviews for the store, the latest published first. Cached until the admin changes one. */
export async function getPublishedReviews(): Promise<PublicReview[]> {
  return getCachedReviews();
}

/**
 * Call after a review is published, hidden, edited or deleted, from a Server
 * Action: the store shows the change at once, and the admin's New count too.
 */
export function reviewsChanged(): void {
  revalidateTag(REVIEWS_TAG, { expire: 0 });
  revalidatePath("/", "layout");
}
