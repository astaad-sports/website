"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { useCart } from "./use-cart";

/** The header cart icon with the live item count. */
export function CartLink({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  const { count } = useCart();
  const label = count ? `Cart, ${count} ${count === 1 ? "item" : "items"}` : "Cart";

  return (
    <Link href="/cart" aria-label={label} className={className}>
      <ShoppingCart className={iconClassName} strokeWidth={1.5} aria-hidden="true" />
      {count > 0 && (
        <Badge size="count" className="absolute top-1 right-0.5">
          {count > 99 ? "99+" : count}
        </Badge>
      )}
    </Link>
  );
}
