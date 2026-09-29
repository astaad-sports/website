import Link from "next/link";
import { ChevronRight, PenLine } from "lucide-react";

import { writeReviewHref } from "@/components/storefront/product-reviews";
import { Stars } from "@/components/storefront/stars";
import { buttonVariants } from "@/components/ui/button";
import type { CustomerReview } from "@/db/review-customers";
import { formatOrderDate } from "@/lib/format";
import { OWN_REVIEW_STANDING, ownReviewStanding } from "@/lib/reviews/customers";
import { cn } from "@/lib/utils";

/** Something the customer has received and not reviewed yet. */
export interface ReviewPrompt {
  productId: string;
  productName: string;
}

const TONE = { good: "text-success", waiting: "text-foreground", quiet: "text-ink-muted" } as const;

/**
 * "Your reviews": what has arrived and waits for a review, then the reviews
 * the customer has sent, each with where it stands (being checked, on the
 * site, private, not on the site).
 */
export function ReviewsCard({ reviews, prompts }: { reviews: CustomerReview[]; prompts: ReviewPrompt[] }) {
  return (
    <section
      aria-labelledby="account-reviews"
      className="flex flex-col rounded-md border border-border bg-surface-raised shadow-card"
    >
      <div className="flex min-h-[60px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-6 py-2">
        <h2 id="account-reviews" className="type-heading-sm">
          Your reviews
        </h2>
        <Link href="/reviews/write" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          <PenLine strokeWidth={1.5} aria-hidden="true" />
          Write a review
        </Link>
      </div>

      {prompts.length > 0 && (
        <div className="flex flex-col border-b border-border bg-surface-sunken/60 last:border-b-0">
          <p className="px-6 pt-4 type-body-sm font-semibold">How is it playing? Tell other players.</p>
          <ul className="flex flex-col">
            {prompts.map((prompt) => (
              <li key={prompt.productId}>
                <Link
                  href={writeReviewHref(prompt.productId)}
                  className="flex min-h-12 items-center justify-between gap-4 px-6 py-2 transition-colors hover:bg-surface-sunken"
                >
                  <span className="type-body">{prompt.productName}</span>
                  <span className="inline-flex shrink-0 items-center gap-1 type-body-sm font-semibold underline underline-offset-4">
                    Review it
                    <ChevronRight className="size-4" strokeWidth={1.5} aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reviews.length === 0 ? (
        prompts.length === 0 && (
          <p className="px-6 py-6 type-body text-ink-muted">
            No reviews yet. Once your order arrives, tell other players how it plays.
          </p>
        )
      ) : (
        <ul className="flex flex-col">
          {reviews.map((review) => {
            const standing = OWN_REVIEW_STANDING[ownReviewStanding(review)];
            return (
              <li key={review.id} className="flex flex-col gap-1.5 border-b border-border px-6 py-4 last:border-b-0">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {review.rating ? <Stars rating={review.rating} size="sm" /> : null}
                    {review.product && <span className="type-body-sm font-semibold">{review.product.name}</span>}
                  </span>
                  <span className={cn("type-body-sm font-semibold", TONE[standing.tone])}>{standing.label}</span>
                </div>
                {review.body && <p className="line-clamp-2 type-body whitespace-pre-line">{review.body}</p>}
                <p className="type-body-sm text-ink-muted">Sent {formatOrderDate(review.createdAt)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
