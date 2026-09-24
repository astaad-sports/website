import type { Metadata } from "next";
import Link from "next/link";
import { PenLine } from "lucide-react";

import { Eyebrow } from "@/components/storefront/eyebrow";
import { RatingSummary, ReviewTile } from "@/components/storefront/review-card";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { Button } from "@/components/ui/button";
import { summariseReviews } from "@/lib/reviews/model";
import { getPublishedReviews } from "@/lib/reviews/store";

export const metadata: Metadata = {
  title: "Customer reviews",
  description: "Reviews and photos from players who use Astaad bats and gear.",
};

/** Every published review, the latest first, with the average rating and a way to write one. */
export default async function ReviewsPage() {
  const reviews = await getPublishedReviews();
  const summary = summariseReviews(reviews);

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-surface-sunken">
        <div className="site-shell flex flex-col gap-10 py-12 md:py-16">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex max-w-[640px] flex-col gap-3">
              <Eyebrow bar>Customer reviews</Eyebrow>
              <h1 className="type-heading-xl">Real players. Real Astaad.</h1>
              <p className="type-body-lg text-ink-muted">
                What players say about our bats and gear, and the photos they send us from the nets and the middle.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <RatingSummary summary={summary} />
              <Button render={<Link href="/reviews/write" />} nativeButton={false} className="px-6">
                <PenLine strokeWidth={1.5} aria-hidden="true" />
                Write a review
              </Button>
            </div>
          </div>

          {reviews.length > 0 ? (
            <ul aria-label="Reviews" className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
              {reviews.map((review, index) => (
                // Columns fill top to bottom: the first two are the top of the first column.
                <ReviewTile key={review.id} review={review} eager={index < 2} />
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-start gap-2 rounded-md border border-border bg-surface-raised p-6 shadow-card">
              <h2 className="type-heading-md">No reviews yet</h2>
              <p className="type-body text-ink-muted">Played with an Astaad bat? Be the first to tell other players about it.</p>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
