import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { SOLD_OUT_CLASSES } from "./sold-out";

/**
 * A product tile's "Buy Now": it opens the product's page, where the size and
 * build are chosen and bought. Out of stock, it reads "Out of stock" and
 * cannot be pressed.
 */
export function BuyNowLink({ href, soldOut = false, className }: { href: string; soldOut?: boolean; className?: string }) {
  if (soldOut) {
    return (
      <Button disabled focusableWhenDisabled className={cn(className, SOLD_OUT_CLASSES)}>
        Out of stock
      </Button>
    );
  }
  return (
    <Button render={<Link href={href} />} nativeButton={false} className={className}>
      Buy Now
    </Button>
  );
}
