import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BatGrid, CategoryGrid } from "@/components/storefront/category-grid";
import { CategoryHero } from "@/components/storefront/category-hero";
import { CompleteYourKit } from "@/components/storefront/complete-your-kit";
import { FinalCta } from "@/components/storefront/final-cta";
import { kitTilesForBat, kitTilesForGear } from "@/components/storefront/kit-tiles";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { PRODUCT_TRUST, TrustStrip } from "@/components/storefront/trust-strip";
import { BAT_RANGES, GEAR_CATEGORY_SLUGS, getBatRange, getCategory, type BatRange } from "@/lib/catalogue";
import { getStoreCatalogue } from "@/lib/products/catalogue";
import { batsInSubcategory, gearInCategory } from "@/lib/products/model";
import { deliveryFeePaise } from "@/lib/settings/model";
import { getStoreSettings } from "@/lib/settings/store";

export function generateStaticParams() {
  return [...GEAR_CATEGORY_SLUGS, ...BAT_RANGES.map((range) => range.slug)].map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: PageProps<"/shop/[category]">): Promise<Metadata> {
  const { category: slug } = await params;
  const range = getBatRange(slug);
  if (range) {
    return { title: range.name, description: `Astaad ${range.noun}: ${range.tagline}` };
  }
  const category = getCategory(slug);
  if (!category || category.kind !== "gear") return {};
  return {
    title: category.name,
    description: `Astaad ${category.name.toLowerCase()}: ${category.tagline}`,
  };
}

export default async function CategoryPage({ params }: PageProps<"/shop/[category]">) {
  const { category: slug } = await params;
  const range = getBatRange(slug);
  if (range) return <BatRangePage range={range} />;
  const category = getCategory(slug);
  if (!category || category.kind !== "gear") notFound();

  const [catalogue, settings] = await Promise.all([getStoreCatalogue(), getStoreSettings()]);
  const products = gearInCategory(catalogue, slug);
  // Nothing on sale yet reads "Coming soon", not a starting price.
  const from = products.length ? Math.min(...products.map((product) => product.price)) : null;

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

/** Kashmir willow or tennis bats: the catalogue's bats in that subcategory, laid out like a gear category. */
async function BatRangePage({ range }: { range: BatRange }) {
  const [catalogue, settings] = await Promise.all([getStoreCatalogue(), getStoreSettings()]);
  const bats = batsInSubcategory(catalogue, range.slug);
  const batsCategory = getCategory("bats")!;

  return (
    <>
      <SiteHeader activeHref={batsCategory.href} />
      <main className="flex-1">
        <CategoryHero
          category={{ name: range.name, tagline: range.tagline, image: range.image, tile: batsCategory.tile }}
          count={bats.length}
          from={bats.length ? Math.min(...bats.map((bat) => bat.price)) : null}
          deliveryFeePaise={deliveryFeePaise(settings)}
          parent={{ label: "Bats", href: batsCategory.href }}
          imageClassName={range.grayscale ? "grayscale-[0.4]" : undefined}
        />
        <BatGrid bats={bats} noun={range.noun} />
        <TrustStrip items={PRODUCT_TRUST} tone="sunken" />
        <CompleteYourKit eyebrow="Pairs with your bat" items={kitTilesForBat(catalogue)} />
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
