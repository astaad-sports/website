import type { Metadata } from "next";

import { ShopGrid } from "@/components/storefront/category-grid";
import { CategoryHero } from "@/components/storefront/category-hero";
import { FinalCta } from "@/components/storefront/final-cta";
import { MobileTabBar } from "@/components/storefront/mobile-tab-bar";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { PRODUCT_TRUST, TrustStrip } from "@/components/storefront/trust-strip";
import { getStoreCatalogue } from "@/lib/products/catalogue";
import { batsByRange } from "@/lib/products/model";
import { deliveryFeePaise } from "@/lib/settings/model";
import { getStoreSettings } from "@/lib/settings/store";

export const metadata: Metadata = {
  title: "Shop",
  description: "Astaad bats, batting pads, batting gloves, helmets and kitbags, all in one place.",
};

/** Everything on the store in one grid, which the tabs narrow to a category. The phone's Shop tab opens it. */
export default async function ShopPage() {
  const [catalogue, settings] = await Promise.all([getStoreCatalogue(), getStoreSettings()]);
  const bats = batsByRange(catalogue);
  const prices = [...bats, ...catalogue.gear].map((product) => product.price);

  return (
    <>
      <SiteHeader sticky />
      <main className="flex-1">
        <CategoryHero
          category={{ name: "Shop", tagline: "Everything for the crease, from willow to kitbag." }}
          count={prices.length}
          from={prices.length ? Math.min(...prices) : null}
          deliveryFeePaise={deliveryFeePaise(settings)}
          parent={null}
        />
        <ShopGrid bats={bats} gear={catalogue.gear} />
        <TrustStrip items={PRODUCT_TRUST} tone="sunken" />
        <FinalCta
          label="Shop Astaad"
          title="Ready for your"
          highlight="bigger innings?"
          primary={{ label: "Shop bats", href: "/shop/bats" }}
          secondary={{ label: "Build your bat", href: "/#build" }}
        />
      </main>
      <SiteFooter />
      <MobileTabBar />
    </>
  );
}
