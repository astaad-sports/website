// Reviews and the customers who wrote them: how a review of theirs reads on
// the customer's account, and what the admin is told about the two. Pure and
// client-safe; the rows live in src/db/review-customers.ts.
import type { OrderStatus, Review, ReviewLinkSource } from "@/db/schema";

/** Whether the customer or the admin put the two together; a contact that matched is only a guess. */
export function isProvenLink(linkedBy: ReviewLinkSource): boolean {
  return linkedBy !== "contact";
}

/** How the admin is told a review came to be a customer's. */
export const LINK_SOURCE_NOTE: Record<ReviewLinkSource, string> = {
  customer: "They were signed in when they sent it.",
  admin: "Chosen by an admin.",
  contact: "Their email or mobile number matches the one on the review. Confirm it is them to count it as theirs.",
};

/** Where a customer's own review stands, in their words rather than the admin's. */
export type OwnReviewStanding = "checking" | "on-site" | "private" | "off-site";

export function ownReviewStanding(review: Pick<Review, "status" | "isPrivate">): OwnReviewStanding {
  if (review.isPrivate) return "private";
  if (review.status === "published") return "on-site";
  return review.status === "new" ? "checking" : "off-site";
}

export const OWN_REVIEW_STANDING: Record<OwnReviewStanding, { label: string; tone: "good" | "waiting" | "quiet" }> = {
  checking: { label: "Being checked", tone: "waiting" },
  "on-site": { label: "On the site", tone: "good" },
  private: { label: "Private feedback", tone: "quiet" },
  "off-site": { label: "Not on the site", tone: "quiet" },
};

/** A purchase, as far as reviews care: which product, and whether it has arrived. */
export interface BoughtProduct {
  productSlug: string;
  status: OrderStatus;
}

/**
 * The products a customer can be asked to review: ones that have reached
 * them and that they have not reviewed yet, each once, the latest delivery
 * first. `purchases` come latest first.
 */
export function productsToReview<T extends BoughtProduct>(purchases: readonly T[], reviewedSlugs: readonly string[]): T[] {
  const skip = new Set(reviewedSlugs);
  const waiting: T[] = [];
  for (const purchase of purchases) {
    if (purchase.status !== "delivered" || skip.has(purchase.productSlug)) continue;
    skip.add(purchase.productSlug);
    waiting.push(purchase);
  }
  return waiting;
}
