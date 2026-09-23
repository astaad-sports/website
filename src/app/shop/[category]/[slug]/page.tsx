import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CompleteYourKit } from "@/components/storefront/complete-your-kit";
import { FinalCta } from "@/components/storefront/final-cta";
import { GearDetails } from "@/components/storefront/gear-details";
import { GearHero } from "@/components/storefront/gear-hero";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { PRODUCT_TRUST, TrustStrip } from "@/components/storefront/trust-strip";
import {
  batAsKitItem,
  GEAR,
  GEAR_CATEGORY_CONTENT,
  getBat,
  getCategory,
  getGear,
  type KitItem,
} from "@/lib/catalogue";

export function generateStaticParams() {
  return GEAR.map((product) => ({ category: product.categorySlug, slug: product.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/shop/[category]/[slug]">): Promise<Metadata> {
  const { category, slug } = await params;
  const product = getGear(slug);
  if (!product || product.categorySlug !== category) return {};
  return {
    title: `${product.name} — ${product.category}`,
    description: `Astaad ${product.name}: ${product.line} · ${product.note}. ${formatDescription(product.categorySlug)}`,
  };
}

function formatDescription(category: keyof typeof GEAR_CATEGORY_CONTENT) {
  return GEAR_CATEGORY_CONTENT[category].summary;
}

export default async function GearPage({ params }: PageProps<"/shop/[category]/[slug]">) {
  const { category: categorySlug, slug } = await params;
  const product = getGear(slug);
  const category = getCategory(categorySlug);
  if (!product || !category || product.categorySlug !== categorySlug) notFound();

  const content = GEAR_CATEGORY_CONTENT[product.categorySlug];
  const crossSell: KitItem[] = [
    ...GEAR.filter((item) => item.featured && item.categorySlug !== product.categorySlug),
    batAsKitItem(getBat("run-machine")!),
  ];

  return (
    <>
      <SiteHeader activeHref={category.href} />
      <main className="flex-1">
        <GearHero product={product} category={category} content={content} />
        <GearDetails product={product} content={content} />
        <TrustStrip items={PRODUCT_TRUST} tone="sunken" />
        <CompleteYourKit eyebrow={`Pairs with the ${product.name}`} items={crossSell} />
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
