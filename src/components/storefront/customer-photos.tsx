"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CustomerClip, CustomerPhoto } from "@/lib/customer-photos";

import { SectionHeading } from "./section-heading";

const CARD = "relative h-[360px] shrink-0 snap-start overflow-hidden rounded-xs bg-surface-dark md:h-[440px]";

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
    <li className={CARD} style={{ aspectRatio: `${clip.width} / ${clip.height}` }}>
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
 * "Real players. Real Astaad." — photos our players have sent in, in a row
 * that scrolls sideways; the arrows move it a screen at a time.
 */
export function CustomerPhotos({ photos, clip }: { photos: CustomerPhoto[]; clip: CustomerClip }) {
  const row = useRef<HTMLUListElement>(null);

  function scroll(direction: 1 | -1) {
    const node = row.current;
    if (!node) return;
    node.scrollBy({ left: direction * node.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <section id="players" aria-labelledby="players-title" className="bg-surface-sunken">
      <div className="site-shell flex flex-col gap-8 py-16 md:py-20">
        <SectionHeading
          id="players-title"
          eyebrow="Customer photos"
          title="Real players. Real Astaad."
          aside={
            <div className="flex items-center gap-4">
              <p className="hidden max-w-[260px] text-[15px] leading-[22px] text-ink-muted lg:block lg:text-right">
                Photos our players have shared with us.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="Previous photos"
                  onClick={() => scroll(-1)}
                  className="size-12 rounded-full border border-border bg-surface-raised hover:bg-surface"
                >
                  <ChevronLeft className="size-5" strokeWidth={1.5} aria-hidden="true" />
                </Button>
                <Button
                  size="icon"
                  aria-label="Next photos"
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
          aria-label="Photos from our players"
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 md:-mx-8 md:scroll-px-8 md:px-8"
        >
          <ClipCard clip={clip} />
          {photos.map((photo) => (
            <li key={photo.src} className={CARD} style={{ aspectRatio: `${photo.width} / ${photo.height}` }}>
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes={`(min-width: 768px) ${Math.round((440 * photo.width) / photo.height)}px, ${Math.round((360 * photo.width) / photo.height)}px`}
                className="object-cover"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
