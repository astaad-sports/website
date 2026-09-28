import { Star } from "lucide-react";

import { formatAverage, reviewCount, type ProductRating } from "@/lib/reviews/model";
import { cn } from "@/lib/utils";

/**
 * A product card's rating: "★ 4.7 (3)", or "3 reviews" when none of its
 * reviews has stars. Nothing for a product nobody has reviewed yet.
 * Screen readers hear "Rated 4.7 out of 5 from 3 reviews".
 */
export function CardRating({ rating, className }: { rating: ProductRating | null | undefined; className?: string }) {
  if (!rating || rating.count === 0) return null;
  const count = reviewCount(rating.count);
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 text-[13px] leading-[18px] whitespace-nowrap text-ink-muted", className)}>
      {rating.average === null ? (
        count
      ) : (
        <>
          <span className="sr-only">
            Rated {formatAverage(rating.average)} out of 5 from {count}
          </span>
          <Star aria-hidden="true" strokeWidth={1.5} className="size-3.5 fill-rating stroke-rating" />
          <span aria-hidden="true" className="font-semibold text-foreground tabular-nums">
            {formatAverage(rating.average)}
          </span>
          <span aria-hidden="true" className="tabular-nums">
            ({rating.count})
          </span>
        </>
      )}
    </span>
  );
}
