import { Star, StarHalf } from "lucide-react";

import { ratingLabel } from "@/lib/reviews/model";
import { cn } from "@/lib/utils";

/**
 * Five stars for a rating, to the nearest half: 4.7 fills four and a half.
 * Screen readers hear "4.7 out of 5 stars". `tone="dark"` is for stars over
 * a photo or a dark surface.
 */
export function Stars({
  rating,
  size = "md",
  tone = "light",
  className,
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
  tone?: "light" | "dark";
  className?: string;
}) {
  const star = size === "lg" ? "size-5" : size === "sm" ? "size-3.5" : "size-4";
  const empty = tone === "dark" ? "fill-transparent stroke-on-dark-subtle" : "fill-transparent stroke-ink-subtle";
  const halves = Math.round(rating * 2);
  return (
    <span role="img" aria-label={ratingLabel(rating)} className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((index) => {
        if (index * 2 <= halves) {
          return <Star key={index} aria-hidden="true" strokeWidth={1.5} className={cn(star, "fill-rating stroke-rating")} />;
        }
        if (index * 2 - 1 === halves) {
          return (
            <span key={index} aria-hidden="true" className={cn("relative inline-flex", star)}>
              <Star strokeWidth={1.5} className={cn(star, empty)} />
              <StarHalf strokeWidth={1.5} className={cn(star, "absolute inset-0 fill-rating stroke-rating")} />
            </span>
          );
        }
        return <Star key={index} aria-hidden="true" strokeWidth={1.5} className={cn(star, empty)} />;
      })}
    </span>
  );
}
