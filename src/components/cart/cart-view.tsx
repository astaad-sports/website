"use client";

import Link from "next/link";
import { ArrowRight, ShoppingCart } from "lucide-react";

import { CartLineItem } from "@/components/astaad";
import { Button } from "@/components/ui/button";
import { lineProblemText, MAX_QUANTITY } from "@/lib/cart";
import { formatPaise } from "@/lib/format";

import { CouponBox } from "./coupon-box";
import { lineOfferText } from "./line-offer";
import { OrderSummary } from "./order-summary";
import { useCart } from "./use-cart";

function CartPlaceholder() {
  return (
    <div aria-busy="true" aria-label="Loading your cart" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-3">
        {[0, 1].map((index) => (
          <div key={index} className="h-[126px] animate-pulse rounded-md bg-surface-raised" />
        ))}
      </div>
      <div className="h-[280px] animate-pulse rounded-md bg-surface-raised" />
    </div>
  );
}

export function EmptyCart() {
  return (
    <div className="flex flex-col items-start gap-5 rounded-md border border-border bg-surface-raised p-8 shadow-card md:p-10">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-sunken">
        <ShoppingCart className="size-6" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="type-heading-lg">Your cart is empty</h2>
        <p className="type-body text-ink-muted">Pick your willow, then kit up for the season.</p>
      </div>
      <Button size="lg" render={<Link href="/#collection" />} nativeButton={false}>
        Shop bats
        <ArrowRight aria-hidden="true" />
      </Button>
    </div>
  );
}

/**
 * The cart page body: line items with quantity, remove and any offer (the
 * regular price struck through beside the price paid), beside the order
 * summary with the coupon box.
 */
export function CartView() {
  const { priced, setQuantity, remove } = useCart();

  if (!priced) return <CartPlaceholder />;
  if (priced.lines.length === 0) return <EmptyCart />;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <ul aria-label="Items in your cart" className="flex flex-col gap-3">
        {priced.lines.map((line) => (
          <li key={line.key}>
            <CartLineItem
              className="max-w-none"
              name={line.name}
              meta={line.summary || undefined}
              price={formatPaise(line.lineTotalPaise)}
              regularPrice={
                line.unitPricePaise < line.regularUnitPricePaise
                  ? formatPaise(line.regularUnitPricePaise * line.item.quantity)
                  : undefined
              }
              offer={line.offer ? lineOfferText(line.offer) : undefined}
              image={line.image}
              imageAlt=""
              qty={line.item.quantity}
              onQty={(quantity) => setQuantity(line.key, quantity)}
              onRemove={() => remove(line.key)}
              notice={lineProblemText(line) ?? undefined}
              maxQty={line.stockLeft === null ? MAX_QUANTITY : Math.min(MAX_QUANTITY, Math.max(1, line.stockLeft))}
            />
          </li>
        ))}
      </ul>
      <OrderSummary
        count={priced.count}
        subtotalPaise={priced.subtotalPaise}
        discountPaise={priced.discountPaise}
        shippingPaise={priced.shippingPaise}
        totalPaise={priced.totalPaise}
        className="lg:sticky lg:top-6"
      >
        <CouponBox />
        {priced.unavailable > 0 ? (
          <>
            <p role="status" className="type-body-sm font-semibold text-danger">
              {priced.unavailable === 1
                ? "One item can't be bought right now. Update it to check out."
                : `${priced.unavailable} items can't be bought right now. Update them to check out.`}
            </p>
            <Button size="lg" className="w-full" disabled>
              Proceed to checkout
              <ArrowRight aria-hidden="true" />
            </Button>
          </>
        ) : (
          <Button size="lg" render={<Link href="/checkout" />} nativeButton={false} className="w-full">
            Proceed to checkout
            <ArrowRight aria-hidden="true" />
          </Button>
        )}
      </OrderSummary>
    </div>
  );
}
