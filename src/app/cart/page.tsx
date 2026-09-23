import type { Metadata } from "next";

import { CartView } from "@/components/cart/cart-view";
import { Eyebrow } from "@/components/storefront/eyebrow";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";

export const metadata: Metadata = {
  title: "Your cart",
  robots: { index: false },
};

export default function CartPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-surface-sunken">
        <div className="site-shell flex flex-col gap-8 py-12 md:py-16">
          <div className="flex flex-col gap-3">
            <Eyebrow bar>Shop</Eyebrow>
            <h1 className="type-heading-xl">Your cart</h1>
          </div>
          <CartView />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
