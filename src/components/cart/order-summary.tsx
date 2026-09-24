import type { ReactNode } from "react";
import { Lock } from "lucide-react";

import { formatPaise } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Subtotal, discount, delivery and total, with the call to action and the
 * secure-payment line. The subtotal is shown at regular prices, so the rows
 * add up to the total with the discount taken off.
 */
export function OrderSummary({
  count,
  subtotalPaise,
  discountPaise,
  shippingPaise,
  totalPaise,
  children,
  className,
}: {
  count: number;
  /** The lines' totals after offers, as PricedCart has it. */
  subtotalPaise: number;
  /** What offers and coupons took off; the Discount row shows only when it is more than 0. */
  discountPaise: number;
  shippingPaise: number;
  totalPaise: number;
  /** The coupon, the button, and anything above it such as an error. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby="order-summary-title"
      className={cn(
        "flex flex-col gap-5 rounded-md border border-border bg-surface-raised p-6 shadow-card",
        className
      )}
    >
      <h2 id="order-summary-title" className="type-heading-md">
        Order summary
      </h2>
      <dl className="flex flex-col gap-3 type-body">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">
            Subtotal ({count} {count === 1 ? "item" : "items"})
          </dt>
          <dd className="font-semibold tabular-nums">{formatPaise(subtotalPaise + discountPaise)}</dd>
        </div>
        {discountPaise > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Discount</dt>
            <dd className="font-semibold tabular-nums">&minus;{formatPaise(discountPaise)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Delivery</dt>
          <dd className="font-semibold tabular-nums">{shippingPaise ? formatPaise(shippingPaise) : "Free"}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-border pt-4">
          <dt className="type-heading-sm">Total</dt>
          <dd className="type-price-lg tabular-nums">{formatPaise(totalPaise)}</dd>
        </div>
      </dl>
      {children}
      <p className="flex items-center justify-center gap-2 type-body-sm text-ink-muted">
        <Lock className="size-4" strokeWidth={1.5} aria-hidden="true" />
        Secure payments: UPI, cards and net banking
      </p>
    </section>
  );
}
