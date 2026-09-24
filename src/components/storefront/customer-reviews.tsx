"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CustomerClip } from "@/lib/customer-photos";
import type { PublicReview, ReviewSummary } from "@/lib/reviews/model";
import { cn } from "@/lib/utils";

import { RatingSummary, ReviewRowCard, ROW_CARD } from "./review-card";
import { SectionHeading } from "./section-heading";

/**
 * The silent clip. It plays only while mostly on screen, never on its own for
 * people who ask for less motion, and the button pauses or plays it.
 */
function ClipCard({ clip }: { clip: CustomerClip }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  // The viewer's own Play or Pause wins over scrolling.
  const chosen = useRef(false);

  useEffect(() => {
    const node = video.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (chosen.current) return;
        if (entry.intersectionRatio >= 0.6) node.play().catch(() => {});
        else node.pause();
      },
      { threshold: [0, 0.6] }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function toggle() {
    const node = video.current;
    if (!node) return;
    chosen.current = true;
    if (node.paused) node.play().catch(() => {});
    else node.pause();
  }

  return (
    <li className={cn(ROW_CARD, "bg-surface-dark")} style={{ aspectRatio: `${clip.width} / ${clip.height}` }}>
      <video
        ref={video}
        src={clip.src}
        poster={clip.poster}
        muted
        loop
        playsInline
        preload="none"
        aria-label={clip.alt}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="size-full object-cover"
      />
      <Button
        size="icon"
        variant="secondary"
        aria-label={playing ? "Pause the clip" : "Play the clip"}
        onClick={toggle}
        className="absolute bottom-3 left-3 size-10 rounded-full bg-surface-dark/80 text-on-dark hover:bg-surface-dark"
      >
        {playing ? (
          <Pause className="size-4" strokeWidth={2} aria-hidden="true" />
        ) : (
          <Play className="size-4" strokeWidth={2} aria-hidden="true" />
        )}
      </Button>
    </li>
  );
}

/**
 * "Real players. Real Astaad." — published reviews in a row that scrolls
 * sideways, the latest first: photos our players have sent in (with their
 * words and stars over them when they left some) and reviews in words alone.
 * The arrows move it a screen at a time. The average rating shows once a
 * review has stars; below the row, links to write one and to read them all.
 */
export function CustomerReviews({
  reviews,
  summary,
  clip,
}: {
  reviews: PublicReview[];
  summary: ReviewSummary;
  clip: CustomerClip;
}) {
  const row = useRef<HTMLUListElement>(null);

  function scroll(direction: 1 | -1) {
    const node = row.current;
    if (!node) return;
    node.scrollBy({ left: direction * node.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="bg-surface-sunken">
      <div className="site-shell flex flex-col gap-5 py-8 md:gap-8 md:py-20">
        <SectionHeading
          id="reviews-title"
          compact
          eyebrow="Customer reviews"
          title="Real players. Real Astaad."
          aside={
            <div className="flex items-center justify-between gap-6 md:justify-end">
              {summary.average !== null ? (
                <RatingSummary summary={summary} />
              ) : (
                <p className="hidden max-w-[260px] text-[15px] leading-[22px] text-ink-muted lg:block lg:text-right">
                  Photos and words our players have shared with us.
                </p>
              )}
              <div className="hidden gap-2 md:flex">
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="Previous reviews"
                  onClick={() => scroll(-1)}
                  className="size-12 rounded-full border border-border bg-surface-raised hover:bg-surface"
                >
                  <ChevronLeft className="size-5" strokeWidth={1.5} aria-hidden="true" />
                </Button>
                <Button
                  size="icon"
                  aria-label="Next reviews"
                  onClick={() => scroll(1)}
                  className="size-12 rounded-full bg-surface-dark text-on-dark hover:bg-surface-dark-raised"
                >
                  <ChevronRight className="size-5" strokeWidth={1.5} aria-hidden="true" />
                </Button>
              </div>
            </div>
          }
        />
        <ul
          ref={row}
          aria-label="Reviews and photos from our players"
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto px-4 md:-mx-8 md:scroll-px-8 md:gap-4 md:px-8"
        >
          <ClipCard clip={clip} />
          {reviews.map((review) => (
            <ReviewRowCard key={review.id} review={review} />
          ))}
        </ul>
        <div className="flex items-center gap-2.5 md:gap-3">
          <Button render={<Link href="/reviews/write" />} nativeButton={false} className="flex-1 px-3 md:flex-none md:px-6">
            <PenLine strokeWidth={1.5} aria-hidden="true" />
            Write a review
          </Button>
          <Button
            render={<Link href="/reviews" />}
            nativeButton={false}
            variant="secondary"
            className="flex-1 px-3 md:flex-none md:px-6"
          >
            Read all reviews
          </Button>
        </div>
      </div>
    </section>
  );
}
