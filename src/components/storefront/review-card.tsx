// Reviews as the store shows them: the cards in the home page's row, the
// tiles on /reviews, and the average rating. No hooks, so server pages use them.
import Image from "next/image";
import Link from "next/link";
import { Quote } from "lucide-react";

import { formatAverage, reviewByline, type PublicReview, type ReviewSummary } from "@/lib/reviews/model";
import { cn } from "@/lib/utils";

import { Stars } from "./stars";

/** The home row's card height: 300px on phones, 440px from md. Widths follow each photo's shape. */
export const ROW_CARD = "relative h-[300px] shrink-0 snap-start overflow-hidden rounded-xs md:h-[440px]";

/** "Bought the Run Machine", linked while the product is on the store. */
function ProductLine({ product, tone }: { product: NonNullable<PublicReview["product"]>; tone: "light" | "dark" }) {
  const muted = tone === "dark" ? "text-on-dark-muted" : "text-ink-muted";
  return (
    <span className={cn("text-[13px] leading-[18px]", muted)}>
      Bought{" "}
      {product.href ? (
        <Link
          href={product.href}
          className={cn("font-semibold underline underline-offset-4", tone === "dark" ? "text-on-dark" : "text-foreground")}
        >
          {product.name}
        </Link>
      ) : (
        <span className="font-semibold">{product.name}</span>
      )}
    </span>
  );
}

/** The name and team, then what they bought. Nothing when the review has neither. */
function Byline({ review, tone }: { review: PublicReview; tone: "light" | "dark" }) {
  const byline = reviewByline(review);
  if (!byline && !review.product) return null;
  return (
    <figcaption className="flex flex-col gap-0.5">
      {byline && (
        <span className={cn("text-sm leading-5 font-semibold", tone === "dark" ? "text-on-dark" : "text-foreground")}>{byline}</span>
      )}
      {review.product && <ProductLine product={review.product} tone={tone} />}
    </figcaption>
  );
}

/** Whether a review has anything to read beside its photo. */
function hasWords(review: PublicReview): boolean {
  return Boolean(review.rating || review.body || review.name || review.place || review.product);
}

/**
 * One review in the home page's row. A photo fills the card at its own shape,
 * with the stars, the words (up to three lines) and the name over a shade at
 * its foot; a review without a photo is a quote card of its own.
 */
export function ReviewRowCard({ review }: { review: PublicReview }) {
  const { photo } = review;
  if (!photo) {
    return (
      <li className={cn(ROW_CARD, "w-[280px] border border-border bg-surface-raised md:w-[360px]")}>
        <figure className="flex h-full flex-col gap-3 p-5 md:gap-4 md:p-6">
          <Quote className="size-8 shrink-0 fill-brand-yellow stroke-brand-yellow" aria-hidden="true" />
          {review.rating ? <Stars rating={review.rating} /> : null}
          {review.body && (
            <blockquote className="line-clamp-5 text-[15px] leading-[22px] whitespace-pre-line md:line-clamp-8 md:text-[17px] md:leading-[26px]">
              {review.body}
            </blockquote>
          )}
          <div className="mt-auto">
            <Byline review={review} tone="light" />
          </div>
        </figure>
      </li>
    );
  }

  return (
    <li className={cn(ROW_CARD, "bg-surface-dark")} style={{ aspectRatio: `${photo.width} / ${photo.height}` }}>
      <figure className="relative size-full">
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={`(min-width: 768px) ${Math.round((440 * photo.width) / photo.height)}px, ${Math.round((300 * photo.width) / photo.height)}px`}
          className="object-cover"
        />
        {hasWords(review) && (
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-linear-to-t from-surface-dark/90 via-surface-dark/70 to-transparent px-4 pt-16 pb-4 text-on-dark">
            {review.rating ? <Stars rating={review.rating} size="sm" tone="dark" /> : null}
            {review.body && <blockquote className="line-clamp-3 text-sm leading-5 whitespace-pre-line">{review.body}</blockquote>}
            <Byline review={review} tone="dark" />
          </div>
        )}
      </figure>
    </li>
  );
}

/**
 * One review on /reviews: its photo at full width and shape, then the stars,
 * all its words and who wrote it. Tiles sit in columns, so each keeps its
 * height. `eager` loads the photo at once, for the tiles in the first screen.
 */
export function ReviewTile({ review, eager }: { review: PublicReview; eager?: boolean }) {
  const { photo } = review;
  return (
    <li className="mb-4 break-inside-avoid">
      <figure className="overflow-hidden rounded-md border border-border bg-surface-raised shadow-card">
        {photo && (
          <Image
            src={photo.src}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            loading={eager ? "eager" : undefined}
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="h-auto w-full bg-surface-dark"
          />
        )}
        {hasWords(review) && (
          <div className="flex flex-col gap-3 p-5">
            {review.rating ? <Stars rating={review.rating} /> : null}
            {review.body && <blockquote className="type-body whitespace-pre-line">{review.body}</blockquote>}
            <Byline review={review} tone="light" />
          </div>
        )}
      </figure>
    </li>
  );
}

/** "4.9 ★★★★★ 12 reviews". Nothing until a review has stars. Read out as one sentence. */
export function RatingSummary({ summary, className }: { summary: ReviewSummary; className?: string }) {
  if (summary.average === null) return null;
  const average = formatAverage(summary.average);
  const count = `${summary.rated} ${summary.rated === 1 ? "review" : "reviews"}`;
  return (
    <p className={cn("flex items-center gap-3", className)}>
      <span className="sr-only">
        Rated {average} out of 5 from {count}
      </span>
      <span aria-hidden="true" className="text-[40px] leading-none font-bold tracking-[-0.03em] tabular-nums">
        {average}
      </span>
      <span aria-hidden="true" className="flex flex-col gap-1">
        <Stars rating={Math.round(summary.average)} />
        <span className="text-[13px] leading-[18px] text-ink-muted tabular-nums">{count}</span>
      </span>
    </p>
  );
}
