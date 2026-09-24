import type { LineOffer } from "@/lib/cart";
import { formatPaise } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The offer that set a line's price: "Diwali Sale · 20% off", or
 * "Coupon DIWALI20 · 15% off" when the customer's code did. Order items keep
 * the same fields, so an order reads the way its cart did.
 */
export function lineOfferText(offer: Pick<LineOffer, "name" | "percentOff" | "code">): string {
  return `${offer.code ? `Coupon ${offer.code}` : offer.name} · ${offer.percentOff}% off`;
}

/** What a discounted line would have cost without its offer, struck through; screen readers hear which price it is. */
export function RegularPrice({ paise, className }: { paise: number; className?: string }) {
  return (
    <s className={cn("type-body-sm text-ink-muted tabular-nums", className)}>
      <span className="sr-only">Regular price </span>
      {formatPaise(paise)}
    </s>
  );
}
