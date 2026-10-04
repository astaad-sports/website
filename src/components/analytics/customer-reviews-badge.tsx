"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { loadGooglePlatform } from "./google-platform";

// Google puts its frame in the page (450 by 150) for a moment even when it
// has no badge to show, then takes it out again. The badge is given room once
// the frame has stayed this long.
const SETTLE_MS = 3000;

/**
 * Google Customer Reviews' badge, drawn by Google in its own frame: the
 * store's rating, once Google has one to show. Until then it takes no room.
 * It sits in the page where this is placed rather than floating in a corner,
 * where it would cover the tab bar on phones. Google is only contacted once
 * the badge is about to scroll into view. `className` applies while the badge
 * shows.
 */
export function CustomerReviewsBadge({ merchantId, className }: { merchantId: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    let left = false;
    let settle: ReturnType<typeof setTimeout> | undefined;
    // Google's to restyle and fill, so React never meets what it puts there.
    const target = document.createElement("div");
    container.appendChild(target);

    // The frame waits off the page (position: absolute) until Google has drawn it.
    const frames = new MutationObserver(() => {
      const frame = target.querySelector("iframe");
      if (frame && getComputedStyle(frame).position === "static") {
        settle ??= setTimeout(() => setShown(true), SETTLE_MS);
      } else {
        clearTimeout(settle);
        settle = undefined;
        setShown(false);
      }
    });
    frames.observe(target, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] });

    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        near.disconnect();
        loadGooglePlatform()
          .then((gapi) => {
            if (left) return;
            gapi.load("ratingbadge", () => {
              if (!left) gapi.ratingbadge?.render(target, { merchant_id: merchantId, position: "INLINE" });
            });
          })
          .catch(() => {
            // Blocked by the browser or an extension: the page goes without the badge.
          });
      },
      { rootMargin: "600px" }
    );
    near.observe(container);

    return () => {
      left = true;
      near.disconnect();
      frames.disconnect();
      clearTimeout(settle);
      target.remove();
    };
  }, [merchantId]);

  return <div ref={ref} className={cn("max-w-full overflow-hidden", shown ? className : "size-0")} />;
}
