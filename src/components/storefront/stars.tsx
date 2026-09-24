import { Star } from "lucide-react";

import { ratingLabel } from "@/lib/reviews/model";
import { cn } from "@/lib/utils";

/**
 * Five stars, the first `rating` filled. Screen readers hear "4 out of 5
 * stars". `tone="dark"` is for stars over a photo or a dark surface.
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
  return (
    <span role="img" aria-label={ratingLabel(rating)} className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          key={index}
          aria-hidden="true"
          strokeWidth={1.5}
          className={cn(
            star,
            index <= rating
              ? "fill-rating stroke-rating"
              : tone === "dark"
                ? "fill-transparent stroke-on-dark-subtle"
                : "fill-transparent stroke-ink-subtle"
          )}
        />
      ))}
    </span>
  );
}
