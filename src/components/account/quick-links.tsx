"use client";

import Link from "next/link";
import { ChevronRight, Heart, LifeBuoy, PackageSearch, Star, type LucideIcon } from "lucide-react";

import { useWishlist } from "@/components/wishlist/use-wishlist";

const TILE =
  "flex h-full items-center gap-4 rounded-md border border-border bg-surface-raised p-4 shadow-card transition-colors hover:border-border-strong max-sm:flex-col max-sm:items-start max-sm:gap-3 sm:px-5";

function Tile({ href, icon: Icon, title, detail }: { href: string; icon: LucideIcon; title: string; detail: string }) {
  return (
    <Link href={href} className={TILE}>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-sunken">
        <Icon className="size-5" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="type-heading-sm">{title}</span>
        <span className="type-body-sm text-ink-muted">{detail}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-ink-muted max-sm:hidden" strokeWidth={1.5} aria-hidden="true" />
    </Link>
  );
}

/** "3 saved for later", or what the wishlist is for while it is empty (or not yet read from this browser). */
function savedLine(count: number): string {
  return count ? `${count} saved for later` : "Save bats and gear for later";
}

/**
 * The account page's shortcuts: the wishlist (with how many are saved in this
 * browser), order tracking, writing a review, and help.
 */
export function AccountQuickLinks() {
  const { count } = useWishlist();
  return (
    <nav aria-label="Account shortcuts">
      <ul className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <li>
          <Tile href="/wishlist" icon={Heart} title="Wishlist" detail={savedLine(count)} />
        </li>
        <li>
          <Tile href="/track-order" icon={PackageSearch} title="Track an order" detail="See where your parcel is" />
        </li>
        <li>
          <Tile href="/reviews/write" icon={Star} title="Write a review" detail="Tell players how it plays" />
        </li>
        <li>
          <Tile href="/contact" icon={LifeBuoy} title="Help and contact" detail="Call, email or visit us" />
        </li>
      </ul>
    </nav>
  );
}
