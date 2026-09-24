// Reviews as the admin lists them: the status word, one row per review, and
// the list with its New / Published / Hidden tabs. No hooks, so server pages use them.
import Image from "next/image";
import Link from "next/link";
import { Lock, MessageSquareQuote, Plus, Quote } from "lucide-react";

import { Stars } from "@/components/storefront/stars";
import type { ReviewWithProduct } from "@/db/reviews";
import type { ReviewStatus } from "@/db/schema";
import { formatShortDate } from "@/lib/format";
import { REVIEW_STATUS_LABEL, REVIEW_STATUSES, reviewByline } from "@/lib/reviews/model";
import { cn } from "@/lib/utils";

import { BUTTON_PRIMARY, CHIP, CHIP_OFF, CHIP_ON } from "./styles";

const STATUS_TONE: Record<ReviewStatus, { dot: string; text: string }> = {
  new: { dot: "bg-brand-yellow ring-1 ring-brand-yellow-hover", text: "text-foreground" },
  published: { dot: "bg-success", text: "text-foreground" },
  hidden: { dot: "bg-ink-subtle", text: "text-ink-muted" },
};

/** A small dot and an uppercase word: "NEW", "PUBLISHED", "HIDDEN". The word carries the meaning. */
export function ReviewStatusLabel({ status, className }: { status: ReviewStatus; className?: string }) {
  const tone = STATUS_TONE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] leading-[14px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase",
        tone.text,
        className
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", tone.dot)} />
      {REVIEW_STATUS_LABEL[status]}
    </span>
  );
}

/** "Private": the customer asked for it to stay with the store. */
export function PrivateLabel({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-surface-sunken px-2 text-xs leading-4 font-semibold",
        className
      )}
    >
      <Lock className="size-3" strokeWidth={2} aria-hidden="true" />
      Private
    </span>
  );
}

/** The tab in `?tab=`, or New. */
export function parseReviewTab(value: unknown): ReviewStatus {
  return REVIEW_STATUSES.find((status) => status === value) ?? "new";
}

export function reviewsHref(tab: ReviewStatus): string {
  return `/admin/reviews?tab=${tab}`;
}

export function reviewHref(review: Pick<ReviewWithProduct, "id">): string {
  return `/admin/reviews/${review.id}`;
}

/** The photo, or a quote mark for a review in words only. */
function ReviewThumb({ review }: { review: ReviewWithProduct }) {
  return (
    <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-surface-sunken">
      {review.photoUrl ? (
        <Image src={review.photoUrl} alt="" fill sizes="64px" className="object-cover" />
      ) : (
        <Quote className="size-6 fill-ink-subtle stroke-ink-subtle" aria-hidden="true" />
      )}
    </span>
  );
}

/**
 * One review: photo, who sent it, stars, the start of the words, and when it
 * came in (Private when it is feedback only). The whole row opens it.
 */
export function ReviewRow({ review, now }: { review: ReviewWithProduct; now: Date }) {
  const byline = reviewByline(review);
  return (
    <li className="border-b border-border">
      <Link href={reviewHref(review)} className="flex min-h-22 items-start gap-3 py-3 transition-colors hover:bg-surface-sunken/60 lg:px-3">
        <ReviewThumb review={review} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={cn("text-[15px] leading-[22px] font-semibold break-words", !byline && "text-ink-muted")}>
              {byline ?? "No name"}
            </span>
            {review.rating ? <Stars rating={review.rating} size="sm" /> : null}
          </span>
          <span className="line-clamp-2 text-[13px] leading-[18px] text-ink-muted">
            {review.body ?? (review.photoAlt ? `Photo: ${review.photoAlt}` : "Photo only")}
          </span>
          <span className="flex flex-wrap items-center gap-2 text-xs leading-4 text-ink-muted tabular-nums">
            {review.isPrivate && <PrivateLabel />}
            <span>
              {review.source === "customer" ? "Sent" : "Added"} {formatShortDate(review.createdAt, now)}
              {review.product && ` · ${review.product.name}`}
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}

const EMPTY: Record<ReviewStatus, { title: string; detail: string }> = {
  new: { title: "No new reviews", detail: "Reviews customers send from the site show up here for you to check." },
  published: { title: "No published reviews", detail: "Publish a review, or add one a customer sent you." },
  hidden: { title: "Nothing hidden", detail: "Reviews you take off the site, and feedback you've read, show up here." },
};

/**
 * Every review on one tab, each tab with its count, and Add review. New
 * holds what customers sent and the admin hasn't looked at yet.
 */
export function ReviewsOverview({ reviews, tab, now }: { reviews: ReviewWithProduct[]; tab: ReviewStatus; now: Date }) {
  const byStatus = Object.fromEntries(REVIEW_STATUSES.map((status) => [status, [] as ReviewWithProduct[]])) as Record<
    ReviewStatus,
    ReviewWithProduct[]
  >;
  for (const review of reviews) byStatus[review.status].push(review);
  // Published in the site's order; the others as they came in.
  const rows =
    tab === "published"
      ? byStatus.published.sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
      : byStatus[tab];

  return (
    <div className="flex max-w-[1048px] flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="type-heading-lg">Reviews</h1>
          <p className="text-[13px] leading-[18px] text-ink-muted tabular-nums">
            {byStatus.new.length} new · {byStatus.published.length} on the site
          </p>
        </div>
        <Link href="/admin/reviews/new" className={BUTTON_PRIMARY}>
          <Plus strokeWidth={2} aria-hidden="true" />
          Add review
        </Link>
      </header>

      <div className="flex flex-col gap-4">
        <nav
          aria-label="Review status"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {REVIEW_STATUSES.map((status) => {
            const on = status === tab;
            return (
              <Link
                key={status}
                href={reviewsHref(status)}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={cn(CHIP, "px-4", on ? CHIP_ON : CHIP_OFF)}
              >
                {REVIEW_STATUS_LABEL[status]}
                <span className={cn("font-medium tabular-nums", on ? "text-on-yellow" : "text-ink-muted")}>
                  {byStatus[status].length}
                </span>
              </Link>
            );
          })}
        </nav>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center lg:py-16">
            <MessageSquareQuote className="size-10 text-ink-subtle" strokeWidth={1.5} aria-hidden="true" />
            <p className="text-base leading-[22px] font-semibold">{EMPTY[tab].title}</p>
            <p className="max-w-[360px] text-[13px] leading-[18px] text-ink-muted">{EMPTY[tab].detail}</p>
          </div>
        ) : (
          <ul aria-label={`${REVIEW_STATUS_LABEL[tab]} reviews`} className="flex flex-col border-t border-border">
            {rows.map((review) => (
              <ReviewRow key={review.id} review={review} now={now} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
