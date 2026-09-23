import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryGrid } from "@/components/storefront/category-grid";
import { CategoryHero } from "@/components/storefront/category-hero";
import { CompleteYourKit } from "@/components/storefront/complete-your-kit";
import { FinalCta } from "@/components/storefront/final-cta";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { PRODUCT_TRUST, TrustStrip } from "@/components/storefront/trust-strip";
import {
  batAsKitItem,
  GEAR,
  GEAR_CATEGORY_SLUGS,
  getBat,
  getCategory,
  getGearByCategory,
  type KitItem,
} from "@/lib/catalogue";

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

  const products = getGearByCategory(slug);
  const from = products.length
    ? Math.min(...products.map((product) => product.price))
    : category.from;

  // The other categories' entry models, plus the entry English Willow bat.
  const crossSell: KitItem[] = [
    ...GEAR.filter((item) => item.featured && item.categorySlug !== slug),
    batAsKitItem(getBat("run-machine")!),
  ];

  return (
    <>
      <SiteHeader activeHref={category.href} />
      <main className="flex-1">
        <CategoryHero category={category} count={products.length} from={from} />
        <CategoryGrid products={products} categoryName={category.name} />
        <TrustStrip items={PRODUCT_TRUST} tone="sunken" />
        <CompleteYourKit
          eyebrow={`Pairs with your ${category.name.toLowerCase()}`}
          items={crossSell}
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
