import type { Metadata } from "next";
import { connection } from "next/server";

import { CatalogueProvider } from "@/components/cart/catalogue-provider";
import { CartView } from "@/components/cart/cart-view";
import { Eyebrow } from "@/components/storefront/eyebrow";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { getFreshStoreCatalogue } from "@/lib/products/catalogue";

export const metadata: Metadata = {
  title: "Your cart",
  robots: { index: false },
};

/**
 * The cart, priced against the products, offers and delivery charge as they
 * are now: rendered for each visit rather than served from a pre-rendered
 * copy, which could lag a change made in the admin.
 */
export default async function CartPage() {
  await connection();
  const catalogue = await getFreshStoreCatalogue();
  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-surface-sunken">
        <div className="site-shell flex flex-col gap-8 py-12 md:py-16">
          <div className="flex flex-col gap-3">
            <Eyebrow bar>Shop</Eyebrow>
            <h1 className="type-heading-xl">Your cart</h1>
          </div>
          <CatalogueProvider catalogue={catalogue}>
            <CartView />
          </CatalogueProvider>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
