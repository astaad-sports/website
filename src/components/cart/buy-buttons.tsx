import { ArrowRight, Lock, ShoppingCart } from "lucide-react";

import type { CartItem } from "@/lib/cart";
import { cn } from "@/lib/utils";

import { AddToCartButton } from "./add-to-cart-button";
import { BuyNowButton } from "./buy-now-button";

/**
 * Both buttons: 48px tall, with padding tight enough for "Added to cart" to
 * fit half of a 360px phone. A longer label wraps onto a second line.
 */
const BUTTON =
  "h-12 w-full gap-1.5 rounded-xs px-2 text-[13px] leading-4 font-bold tracking-[0.08em] whitespace-normal uppercase";

/**
 * Add to cart and Buy now for one item: side by side and the same size,
 * or one above the other where the column is too narrow for two (the bat
 * builder's summary). Out of stock, they are one greyed "Out of stock" button.
 * A line under them says Buy now pays through Razorpay.
 */
export function BuyButtons({
  item,
  productName,
  soldOut = false,
  quiet = false,
  tone = "light",
  className,
}: {
  item: CartItem;
  /** For Add to cart's screen-reader announcement. */
  productName: string;
  soldOut?: boolean;
  /** Add to cart as an outline, not the yellow button: for under another yellow button. */
  quiet?: boolean;
  /** The surface the buttons sit on. */
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <div className={cn("@container", className)}>
      {/* `relative` keeps Add to cart's hidden status line inside the row. */}
      <div className={cn("relative grid gap-2", !soldOut && "@[19rem]:grid-cols-2 @[19rem]:gap-2.5")}>
        <AddToCartButton
          item={item}
          productName={productName}
          soldOut={soldOut}
          variant={quiet ? "secondary" : "default"}
          className={cn(
            BUTTON,
            quiet && "border border-border bg-surface-raised hover:border-border-strong hover:bg-surface-raised"
          )}
        >
          <ShoppingCart className="size-[18px]" strokeWidth={2} aria-hidden="true" />
          Add to cart
        </AddToCartButton>
        <BuyNowButton item={item} soldOut={soldOut} tone={tone} className={BUTTON}>
          Buy now
          <ArrowRight className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />
        </BuyNowButton>
      </div>
      {!soldOut && (
        <p
          className={cn(
            "mt-2 flex flex-wrap items-center justify-center gap-x-1.5 text-xs leading-4",
            tone === "dark" ? "text-on-dark-subtle" : "text-ink-muted"
          )}
        >
          <Lock className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
          UPI, cards and net banking · Secured by Razorpay
        </p>
      )}
    </div>
  );
}
