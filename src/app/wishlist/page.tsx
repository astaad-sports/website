import type { Metadata } from "next";

import { Eyebrow } from "@/components/storefront/eyebrow";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { WishlistView } from "@/components/wishlist/wishlist-view";

export const metadata: Metadata = {
  title: "Your wishlist",
  robots: { index: false },
};

/** The products saved with the heart, kept in this browser like the cart. */
export default function WishlistPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="site-shell flex flex-col gap-8 py-12 md:py-16">
          <div className="flex flex-col gap-3">
            <Eyebrow bar>Shop</Eyebrow>
            <h1 className="type-heading-xl">Your wishlist</h1>
          </div>
          <WishlistView />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
