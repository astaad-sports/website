import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/json-ld";
import { BatGrid, CategoryGrid } from "@/components/storefront/category-grid";
import { CategoryHero } from "@/components/storefront/category-hero";
import { CompleteYourKit } from "@/components/storefront/complete-your-kit";
import { FinalCta } from "@/components/storefront/final-cta";
import { kitTilesForBat, kitTilesForGear } from "@/components/storefront/kit-tiles";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { PRODUCT_TRUST, TrustStrip } from "@/components/storefront/trust-strip";
import {
  BAT_RANGES,
  DIAGONAL_BAT_TILE,
  STORE_CATEGORIES,
  getBatRange,
  getCategory,
  type BatRange,
  type StoreCategory,
} from "@/lib/catalogue";
import { getStoreCatalogue } from "@/lib/products/catalogue";
import { batsByRange, batsInSubcategory, gearInCategory } from "@/lib/products/model";
import { pageMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { categoryDescription } from "@/lib/seo/titles";
import { deliveryFeePaise } from "@/lib/settings/model";
import { getStoreSettings } from "@/lib/settings/store";
import { siteUrl } from "@/lib/site";

export function generateStaticParams() {
  return [...STORE_CATEGORIES, ...BAT_RANGES].map(({ slug }) => ({ category: slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/shop/[category]">): Promise<Metadata> {
  const { category: slug } = await params;
  const range = getBatRange(slug);
  const entry = range ?? getCategory(slug);
  if (!entry) return {};
  const catalogue = await getStoreCatalogue();
  const products = range
    ? batsInSubcategory(catalogue, range.slug)
    : slug === "bats"
      ? catalogue.bats
      : gearInCategory(catalogue, slug);
  const from = products.length ? Math.min(...products.map((product) => product.price)) : null;
  return pageMetadata({
    title: entry.seoTitle,
    description: categoryDescription(entry, products.length, from),
    path: entry.href,
  });
}

/** The category's trail for search engines, as its hero shows it: Home, Shop (or Bats for a range), the category. */
function CategoryTrail({ name, href, parent }: { name: string; href: string; parent: { name: string; path: string } }) {
  return (
    <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, parent, { name, path: href }], siteUrl())} />
  );
}

const SHOP = { name: "Shop", path: "/shop" };

export default async function CategoryPage({ params }: PageProps<"/shop/[category]">) {
  const { category: slug } = await params;
  const range = getBatRange(slug);
  if (range) return <BatRangePage range={range} />;
  const category = getCategory(slug);
  if (!category) notFound();
  if (category.kind === "bats") return <BatsPage category={category} />;

  const [catalogue, settings] = await Promise.all([getStoreCatalogue(), getStoreSettings()]);
  const products = gearInCategory(catalogue, slug);
  // Nothing on sale yet reads "Coming soon", not a starting price.
  const from = products.length ? Math.min(...products.map((product) => product.price)) : null;

  return (
    <>
      <CategoryTrail name={category.name} href={category.href} parent={SHOP} />
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
          primary={{ label: "Shop bats", href: "/shop/bats" }}
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
      <CategoryTrail name={range.name} href={range.href} parent={{ name: "Bats", path: batsCategory.href }} />
      <SiteHeader activeHref={batsCategory.href} />
      <main className="flex-1">
        <CategoryHero
          category={{ name: range.name, tagline: range.tagline, image: range.image, tile: DIAGONAL_BAT_TILE }}
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
          primary={{ label: "Shop bats", href: "/shop/bats" }}
          secondary={{ label: "Build your bat", href: "/#build" }}
        />
      </main>
      <SiteFooter />
    </>
  );
}

/** Every bat on the store, range by range; the tabs narrow them to one range. */
async function BatsPage({ category }: { category: StoreCategory }) {
  const [catalogue, settings] = await Promise.all([getStoreCatalogue(), getStoreSettings()]);
  const bats = batsByRange(catalogue);

  return (
    <>
      <CategoryTrail name={category.name} href={category.href} parent={SHOP} />
      <SiteHeader activeHref={category.href} />
      <main className="flex-1">
        <CategoryHero
          category={category}
          count={bats.length}
          from={bats.length ? Math.min(...bats.map((bat) => bat.price)) : null}
          deliveryFeePaise={deliveryFeePaise(settings)}
        />
        <BatGrid bats={bats} noun="bats" ranges />
        <TrustStrip items={PRODUCT_TRUST} tone="sunken" />
        <CompleteYourKit eyebrow="Pairs with your bat" items={kitTilesForBat(catalogue)} />
        <FinalCta
          label="Shop Astaad"
          title="Ready for your"
          highlight="bigger innings?"
          primary={{ label: "Build your bat", href: "/#build" }}
          secondary={{ label: "Shop all gear", href: "/shop" }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
