"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import type { CartItem } from "@/lib/cart";

import { useCart } from "./use-cart";

export type AddToCartButtonProps = Omit<ButtonProps, "onClick" | "children"> & {
  item: CartItem;
  /** For the screen-reader announcement: "Astaad Run Machine added to your cart". */
  productName: string;
  children: ReactNode;
};

/** Adds `item` to the cart, then reads "Added to cart" for a moment. The header count updates too. */
export function AddToCartButton({ item, productName, children, ...props }: AddToCartButtonProps) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function handleClick() {
    add(item);
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
            Added to cart
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
