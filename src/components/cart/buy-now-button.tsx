"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import type { CartItem } from "@/lib/cart";
import { BUY_NOW_CHECKOUT } from "@/lib/checkout";
import { cn } from "@/lib/utils";

import { useCart } from "./use-cart";

/** The solid button beside the yellow Add to cart: black on a light page, white on a dark panel. */
const TONE = {
  light: "border-surface-dark bg-surface-dark text-on-dark hover:border-surface-dark-raised hover:bg-surface-dark-raised",
  dark: "border-on-dark bg-on-dark text-surface-dark hover:border-on-dark-muted hover:bg-on-dark-muted",
};

export type BuyNowButtonProps = Omit<ButtonProps, "onClick" | "children" | "variant"> & {
  item: CartItem;
  /**
   * The product is out of stock: there is no button, as the Add to cart
   * beside it already reads "Out of stock".
   */
  soldOut?: boolean;
  /** The surface the button sits on. */
  tone?: keyof typeof TONE;
  children: ReactNode;
};

/**
 * "Buy now": opens checkout for `item` alone, one of it, without adding it
 * to the cart. Whatever is in the cart stays there for later.
 */
export function BuyNowButton({ item, soldOut = false, tone = "light", children, className, ...props }: BuyNowButtonProps) {
  const { buyNow } = useCart();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (soldOut) return null;

  return (
    <Button
      {...props}
      variant="secondary"
      disabled={pending}
      focusableWhenDisabled
      aria-busy={pending}
      onClick={() => {
        buyNow(item);
        startTransition(() => router.push(BUY_NOW_CHECKOUT));
      }}
      className={cn(TONE[tone], className)}
    >
      {pending ? "Please wait…" : children}
    </Button>
  );
}
