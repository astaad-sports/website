"use client";

import Link from "next/link";
import { Heart } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { useWishlist } from "./use-wishlist";

function wishlistLabel(count: number): string {
  return count ? `Wishlist, ${count} saved` : "Wishlist";
}

/** The header heart with the live count of saved products. */
export function WishlistLink({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  const { count } = useWishlist();
  return (
    <Link href="/wishlist" aria-label={wishlistLabel(count)} className={className}>
      <Heart className={iconClassName} strokeWidth={1.5} aria-hidden="true" />
      {count > 0 && (
        <Badge size="count" className="absolute top-1 right-0.5">
          {count > 99 ? "99+" : count}
        </Badge>
      )}
    </Link>
  );
}

/** The Wishlist row in the phone menu, with the count at its end once something is saved. */
export function WishlistMenuLink({ className }: { className?: string }) {
  const { count } = useWishlist();
  return (
    <Link href="/wishlist" aria-label={wishlistLabel(count)} className={className}>
      <Heart className="size-5" strokeWidth={1.5} aria-hidden="true" />
      Wishlist
      {count > 0 && (
        <Badge size="count" className="ml-auto">
          {count > 99 ? "99+" : count}
        </Badge>
      )}
    </Link>
  );
}
