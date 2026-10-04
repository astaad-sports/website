"use client";

import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";

import { BatPlate } from "@/components/storefront/bat-plate";
import { GearPlate } from "@/components/storefront/gear-plate";
import { Button } from "@/components/ui/button";

import { useWishlist } from "./use-wishlist";

function WishlistPlaceholder() {
  return (
    <div aria-busy="true" aria-label="Loading your wishlist" className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((index) => (
        <div key={index} className="h-[320px] animate-pulse rounded-xs bg-surface-sunken" />
      ))}
    </div>
  );
}

function EmptyWishlist() {
  return (
    <div className="flex flex-col items-start gap-5 rounded-md border border-border bg-surface-raised p-8 shadow-card md:p-10">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-sunken">
        <Heart className="size-6" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="type-heading-lg">Your wishlist is empty</h2>
        <p className="type-body text-ink-muted">Tap the heart on any bat or piece of gear to keep it here for later.</p>
      </div>
      <Button size="lg" render={<Link href="/shop/bats" />} nativeButton={false}>
        Shop bats
        <ArrowRight aria-hidden="true" />
      </Button>
    </div>
  );
}

/**
 * The wishlist page body: the saved products on their plates, newest first,
 * each with its heart (tap it to take the product off) and Buy Now.
 */
export function WishlistView() {
  const { entries } = useWishlist();

  if (!entries) return <WishlistPlaceholder />;
  if (entries.length === 0) return <EmptyWishlist />;

  return (
    <div className="flex flex-col gap-6">
      <p className="type-body text-ink-muted">
        {entries.length} {entries.length === 1 ? "product" : "products"} saved on this device
      </p>
      <ul aria-label="Saved products" className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => (
          <li key={entry.product.id}>
            {entry.kind === "bat" ? <BatPlate bat={entry.product} /> : <GearPlate product={entry.product} />}
          </li>
        ))}
      </ul>
    </div>
  );
}
