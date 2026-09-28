// A product's own reviews: the rating beside its name, and the section under
// its details. Both read the product's published reviews, so a product with
// none shows no rating. No hooks, so server pages use them.
import Image from "next/image";
import Link from "next/link";
import { PenLine, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  formatAverage,
  ratingBreakdown,
  reviewByline,
  reviewCount,
  summariseReviews,
  type PublicReview,
} from "@/lib/reviews/model";

import { Eyebrow } from "./eyebrow";
import { Stars } from "./stars";

/** The review form, with this product already chosen. */
export function writeReviewHref(productId: string): string {
  return `/reviews/write?product=${encodeURIComponent(productId)}`;
}

/**
 * "★ 4.8 · 3 reviews" beside the stock status, linking down to the reviews.
 * Nothing while the product has none; without stars (reviews the admin added
 * without a rating) it is only the count.
 */
export function ProductRatingLink({ reviews }: { reviews: PublicReview[] }) {
  if (reviews.length === 0) return null;
  const { average } = summariseReviews(reviews);
  const count = reviewCount(reviews.length);
  return (
    <a
      href="#reviews"
      aria-label={average === null ? `${count}, read them` : `Rated ${formatAverage(average)} out of 5 from ${count}, read them`}
      className="inline-flex min-h-11 items-center gap-2 lg:min-h-0"
    >
      {average !== null && (
        <span className="inline-flex items-center gap-1.5 font-bold">
          <Star className="size-4 fill-rating stroke-rating" aria-hidden="true" />
          {formatAverage(average)}
        </span>
      )}
      <span className="text-ink-muted underline underline-offset-[3px]">{count}</span>
    </a>
  );
}

/** Five rows of "5 ★ ▇▇▇▇▇ 3": how the stars are spread. */
function Breakdown({ reviews }: { reviews: PublicReview[] }) {
  const rows = ratingBreakdown(reviews);
  const most = Math.max(1, ...rows.map((row) => row.count));
  return (
    <ul aria-label="Reviews by star rating" className="flex flex-col gap-1.5">
      {rows.map((row) => (
        <li key={row.stars} className="flex items-center gap-3 text-[13px] leading-[18px] tabular-nums">
          <span className="sr-only">
            {row.stars} {row.stars === 1 ? "star" : "stars"}: {reviewCount(row.count)}
          </span>
          <span aria-hidden="true" className="inline-flex w-7 shrink-0 items-center gap-1 font-semibold">
            {row.stars}
            <Star className="size-3 fill-rating stroke-rating" />
          </span>
          <span aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
            <span className="block h-full rounded-full bg-brand-yellow" style={{ width: `${(row.count / most) * 100}%` }} />
          </span>
          <span aria-hidden="true" className="w-5 shrink-0 text-right text-ink-muted">
            {row.count}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** One review: stars, the words, who wrote it, and their photo beside them. */
function ProductReviewItem({ review }: { review: PublicReview }) {
  const byline = reviewByline(review);
  const { photo } = review;
  return (
    <li className="border-t border-border py-6 first:border-t-0 first:pt-0">
      <figure className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          {review.rating ? <Stars rating={review.rating} /> : null}
          {review.body && <blockquote className="type-body whitespace-pre-line">{review.body}</blockquote>}
          {byline && <figcaption className="text-sm leading-5 font-semibold">{byline}</figcaption>}
        </div>
        {photo && (
          <Image
            src={photo.src}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            sizes="(min-width: 640px) 160px, 100vw"
            className="h-auto w-full rounded-xs bg-surface-dark sm:w-40 sm:shrink-0"
          />
        )}
      </figure>
    </li>
  );
}

/**
 * "What players say" under a product's details: the average, how the stars
 * are spread and a Write a review button on the left, the reviews on the
 * right, newest first. A product nobody has reviewed yet gets a short
 * invitation to be the first instead.
 */
export function ProductReviews({
  productId,
  productName,
  reviews,
}: {
  productId: string;
  productName: string;
  reviews: PublicReview[];
}) {
  const { average } = summariseReviews(reviews);
  const heading = (
    <div className="flex flex-col gap-3">
      <Eyebrow>Customer reviews</Eyebrow>
      <h2 id="reviews-title" className="text-[32px] leading-9 font-bold tracking-[-0.03em] md:text-[40px] md:leading-[44px]">
        What players say
      </h2>
    </div>
  );
  const write = (
    <Button
      render={<Link href={writeReviewHref(productId)} />}
      nativeButton={false}
      variant={reviews.length ? "secondary" : "default"}
      className="self-start px-6"
    >
      <PenLine strokeWidth={1.5} aria-hidden="true" />
      Write a review
    </Button>
  );

  if (reviews.length === 0) {
    return (
      <section
        id="reviews"
        aria-labelledby="reviews-title"
        className="site-shell flex scroll-mt-20 flex-col gap-5 py-12 md:py-16 lg:flex-row lg:items-end lg:justify-between lg:gap-16"
      >
        {heading}
        <div className="flex flex-col gap-4 lg:max-w-[480px] lg:flex-row lg:items-center lg:gap-6">
          <p className="text-[15px] leading-[22px] text-ink-muted">
            No reviews of the {productName} yet. Played with one? Tell other players how it went.
          </p>
          {write}
        </div>
      </section>
    );
  }

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-title"
      className="site-shell flex scroll-mt-20 flex-col gap-8 py-16 md:py-20 lg:flex-row lg:gap-16"
    >
      <div className="flex w-full flex-col gap-5 lg:sticky lg:top-24 lg:w-[340px] lg:shrink-0 lg:self-start">
        {heading}
        {average !== null && (
          <>
            <p className="flex items-center gap-3">
              <span className="sr-only">
                Rated {formatAverage(average)} out of 5 from {reviewCount(reviews.length)}
              </span>
              <span aria-hidden="true" className="text-[48px] leading-none font-bold tracking-[-0.03em] tabular-nums">
                {formatAverage(average)}
              </span>
              <span aria-hidden="true" className="flex flex-col gap-1">
                <Stars rating={average} />
                <span className="text-[13px] leading-[18px] text-ink-muted tabular-nums">{reviewCount(reviews.length)}</span>
              </span>
            </p>
            <Breakdown reviews={reviews} />
          </>
        )}
        {write}
      </div>
      <ul aria-label={`Reviews of the ${productName}`} className="flex min-w-0 flex-1 flex-col">
        {reviews.map((review) => (
          <ProductReviewItem key={review.id} review={review} />
        ))}
      </ul>
    </section>
  );
}
