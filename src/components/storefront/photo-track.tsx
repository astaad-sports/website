"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { useSwipe } from "./use-swipe";

/**
 * A product's photos side by side across the stage, sliding to the one
 * showing; on a touch screen, swipe left or right to move between them.
 * `children` lays out one photo in its slide. `near` is true for the photo
 * showing and the ones either side, which load straight away so a swipe never
 * lands on a blank slide.
 */
export function PhotoTrack({
  count,
  active,
  onChange,
  children,
}: {
  count: number;
  active: number;
  onChange: (index: number) => void;
  children: (index: number, near: boolean) => ReactNode;
}) {
  const swipe = useSwipe({ count, active, onChange });
  return (
    <div className="absolute inset-0 touch-pan-y touch-pinch-zoom" {...swipe.handlers}>
      <div
        className={cn(
          "flex size-full",
          !swipe.dragging && "transition-transform duration-300 ease-out motion-reduce:transition-none"
        )}
        style={{ translate: `calc(${active * -100}% + ${swipe.offset}px)` }}
      >
        {Array.from({ length: count }, (_, index) => (
          <div key={index} inert={index !== active} className="relative size-full shrink-0">
            {children(index, Math.abs(index - active) <= 1)}
          </div>
        ))}
      </div>
    </div>
  );
}
