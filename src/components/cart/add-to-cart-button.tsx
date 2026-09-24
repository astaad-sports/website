"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { priceCartItem, type CartItem } from "@/lib/cart";
import { cn } from "@/lib/utils";

import { useCatalogue } from "./catalogue-provider";
import { useCart } from "./use-cart";

/**
 * Greys out whatever look the caller gave the button, keeping its size. The
 * hairline keeps its outline visible on the grey kit tiles.
 */
const SOLD_OUT_CLASSES =
  "cursor-not-allowed border-border bg-surface-sunken text-ink-muted hover:border-border hover:bg-surface-sunken";

export type AddToCartButtonProps = Omit<ButtonProps, "onClick" | "children"> & {
  item: CartItem;
  /** For the screen-reader announcement: "Astaad Run Machine added to your cart". */
  productName: string;
  /**
   * The product is out of stock: the button stays the same size but reads
   * "Out of stock" (icon buttons keep their icon) and cannot be pressed.
   */
  soldOut?: boolean;
  children: ReactNode;
};

/**
 * Adds `item` to the cart, then reads "Added to cart" for a moment (an icon
 * button shows a tick). The header count updates too.
 */
export function AddToCartButton({ item, productName, soldOut = false, children, ...props }: AddToCartButtonProps) {
  const { add } = useCart();
  const catalogue = useCatalogue();
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const iconOnly = typeof props.size === "string" && props.size.startsWith("icon");

  useEffect(() => () => clearTimeout(timer.current), []);

  if (soldOut) {
    return (
      <Button
        {...props}
        disabled
        focusableWhenDisabled
        aria-label={iconOnly ? `${productName} is out of stock` : undefined}
        className={cn(props.className, SOLD_OUT_CLASSES)}
      >
        {iconOnly ? children : "Out of stock"}
      </Button>
    );
  }

  function handleClick() {
    add(item);
    // A product added since this tab loaded the catalogue: fetch it, or the cart would leave the item out.
    if (!priceCartItem(item, catalogue)) router.refresh();
    setAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 2500);
  }

  return (
    <>
      <Button {...props} onClick={handleClick}>
        {added ? (
          <>
            <Check className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />
            {!iconOnly && "Added to cart"}
          </>
        ) : (
          children
        )}
      </Button>
      <span role="status" className="sr-only">
        {added ? `${productName} added to your cart` : ""}
      </span>
    </>
  );
}
