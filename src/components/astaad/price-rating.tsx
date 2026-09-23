import { cn } from "@/lib/utils";

import { Icon } from "./icon";

export interface PriceRatingProps {
  /** A formatted price — "₹ 28,999" (use `formatPrice`). */
  price: string;
  rating?: number | string;
  count?: number;
  /** "(124 reviews)" instead of "(124)" — the product page. */
  reviews?: boolean;
  size?: "md" | "lg";
  className?: string;
}

/**
 * Price on the left in the `price` style, star rating on the right in
 * `ink-muted` with the star filled `rating`. The product page uses
 * `size="lg"` and `reviews`.
 */
export function PriceRating({
  price,
  rating,
  count,
  reviews,
  size = "md",
  className,
}: PriceRatingProps) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-2 text-foreground",
        className
      )}
    >
      <span className={size === "lg" ? "type-price-lg" : "type-price"}>
        {price}
      </span>
      {rating != null && (
        <span className="type-body-sm inline-flex items-center gap-1 text-ink-muted">
          <Icon
            name="star"
            className="size-3.5 fill-rating stroke-rating"
          />
          <span>{rating}</span>
          {count != null && (
            <span>{reviews ? `(${count} reviews)` : `(${count})`}</span>
          )}
        </span>
      )}
    </div>
  );
}
