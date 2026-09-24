import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CompleteYourKit } from "@/components/storefront/complete-your-kit";
import { FinalCta } from "@/components/storefront/final-cta";
import { GearDetails } from "@/components/storefront/gear-details";
import { GearHero } from "@/components/storefront/gear-hero";
import { kitTilesForGear } from "@/components/storefront/kit-tiles";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { PRODUCT_TRUST, TrustStrip } from "@/components/storefront/trust-strip";
import { GEAR_CATEGORY_CONTENT, getCategory } from "@/lib/catalogue";
import { getStoreCatalogue } from "@/lib/products/catalogue";
import { findStoreGear, gearLine } from "@/lib/products/model";

// Products added after the build still render on first visit (dynamicParams is on by default).
export async function generateStaticParams() {
  const { gear } = await getStoreCatalogue();
  return gear.map((product) => ({ category: product.categorySlug, slug: product.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/shop/[category]/[slug]">): Promise<Metadata> {
  const { category, slug } = await params;
  const product = findStoreGear(await getStoreCatalogue(), category, slug);
  if (!product) return {};
  const line = gearLine(product);
  return {
    title: `${product.name} — ${product.category}`,
    description: `Astaad ${product.name}${line ? `: ${line}` : ""}. ${GEAR_CATEGORY_CONTENT[product.categorySlug].summary}`,
  };
}

export default async function GearPage({ params }: PageProps<"/shop/[category]/[slug]">) {
  const { category: categorySlug, slug } = await params;
  const catalogue = await getStoreCatalogue();
  const product = findStoreGear(catalogue, categorySlug, slug);
  const category = getCategory(categorySlug);
  if (!product || !category) notFound();

  const content = GEAR_CATEGORY_CONTENT[product.categorySlug];

  return (
    <>
      <SiteHeader activeHref={category.href} />
      <main className="flex-1">
        <GearHero product={product} category={category} content={content} />
        <GearDetails product={product} content={content} />
        <TrustStrip items={PRODUCT_TRUST} tone="sunken" />
        <CompleteYourKit
          eyebrow={`Pairs with the ${product.name}`}
          items={kitTilesForGear(catalogue, product.categorySlug)}
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
