import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryGrid } from "@/components/storefront/category-grid";
import { CategoryHero } from "@/components/storefront/category-hero";
import { CompleteYourKit } from "@/components/storefront/complete-your-kit";
import { FinalCta } from "@/components/storefront/final-cta";
import { kitTilesForGear } from "@/components/storefront/kit-tiles";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { PRODUCT_TRUST, TrustStrip } from "@/components/storefront/trust-strip";
import { GEAR_CATEGORY_SLUGS, getCategory } from "@/lib/catalogue";
import { getStoreCatalogue } from "@/lib/products/catalogue";
import { gearInCategory } from "@/lib/products/model";
import { deliveryFeePaise } from "@/lib/settings/model";
import { getStoreSettings } from "@/lib/settings/store";

export function generateStaticParams() {
  return GEAR_CATEGORY_SLUGS.map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: PageProps<"/shop/[category]">): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category || category.kind !== "gear") return {};
  return {
    title: category.name,
    description: `Astaad ${category.name.toLowerCase()}: ${category.tagline}`,
  };
}

export default async function CategoryPage({ params }: PageProps<"/shop/[category]">) {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category || category.kind !== "gear") notFound();

  const [catalogue, settings] = await Promise.all([getStoreCatalogue(), getStoreSettings()]);
  const products = gearInCategory(catalogue, slug);
  const from = products.length
    ? Math.min(...products.map((product) => product.price))
    : category.from;

  return (
    <>
      <SiteHeader activeHref={category.href} />
      <main className="flex-1">
        <CategoryHero
          category={category}
          count={products.length}
          from={from}
          deliveryFeePaise={deliveryFeePaise(settings)}
        />
        <CategoryGrid products={products} categoryName={category.name} />
        <TrustStrip items={PRODUCT_TRUST} tone="sunken" />
        <CompleteYourKit
          eyebrow={`Pairs with your ${category.name.toLowerCase()}`}
          items={kitTilesForGear(catalogue, slug)}
        />
        <FinalCta
          label="Shop Astaad"
          title="Ready for your"
          highlight="bigger innings?"
          primary={{ label: "Shop bats", href: "/#collection" }}
          secondary={{ label: "Build your bat", href: "/#build" }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
