import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/json-ld";
import { CompleteYourKit } from "@/components/storefront/complete-your-kit";
import { deliveryTerms } from "@/components/storefront/delivery";
import { FinalCta } from "@/components/storefront/final-cta";
import { GearDetails } from "@/components/storefront/gear-details";
import { GearHero } from "@/components/storefront/gear-hero";
import { kitTilesForGear } from "@/components/storefront/kit-tiles";
import { ProductReviews } from "@/components/storefront/product-reviews";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { PRODUCT_TRUST, TrustStrip } from "@/components/storefront/trust-strip";
import { GEAR_CATEGORY_CONTENT, getCategory } from "@/lib/catalogue";
import { getStoreCatalogue } from "@/lib/products/catalogue";
import { findStoreGear } from "@/lib/products/model";
import { reviewsOfProduct } from "@/lib/reviews/model";
import { getPublishedReviews } from "@/lib/reviews/store";
import { pageMetadata, productShareImage } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, productJsonLd, realPhotos } from "@/lib/seo/structured-data";
import { gearDescription, gearDetails, gearTitle } from "@/lib/seo/titles";
import { getStoreSettings } from "@/lib/settings/store";
import { siteUrl } from "@/lib/site";

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
  const photo = realPhotos(product.images)[0];
  return pageMetadata({
    title: gearTitle(product),
    description: gearDescription(product),
    path: `/shop/${product.categorySlug}/${product.slug}`,
    image: photo ? productShareImage(product, photo) : undefined,
  });
}

export default async function GearPage({ params }: PageProps<"/shop/[category]/[slug]">) {
  const { category: categorySlug, slug } = await params;
  const [catalogue, settings, published] = await Promise.all([getStoreCatalogue(), getStoreSettings(), getPublishedReviews()]);
  const product = findStoreGear(catalogue, categorySlug, slug);
  const category = getCategory(categorySlug);
  if (!product || !category) notFound();
  const reviews = reviewsOfProduct(published, product.id);

  const content = GEAR_CATEGORY_CONTENT[product.categorySlug];
  const delivery = deliveryTerms(settings);

  const base = siteUrl();
  const path = `/shop/${product.categorySlug}/${product.slug}`;
  // As the hero's own trail has it: Home, the category, then the product.
  const trail = [
    { name: "Home", path: "/" },
    { name: category.name, path: category.href },
    { name: product.name, path },
  ];

  return (
    <>
      <JsonLd
        data={productJsonLd({
          product,
          name: `Astaad ${product.name}`,
          description: gearDetails(product),
          category: category.seoTitle,
          path,
          reviews,
          deliveryFeePaise: delivery.feePaise,
          base,
        })}
      />
      <JsonLd data={breadcrumbJsonLd(trail, base)} />
      <SiteHeader activeHref={category.href} />
      <main className="flex-1">
        <GearHero product={product} category={category} delivery={delivery} reviews={reviews} />
        <GearDetails product={product} content={content} deliveryFeePaise={delivery.feePaise} />
        <ProductReviews productId={product.id} productName={product.name} reviews={reviews} />
        <TrustStrip items={PRODUCT_TRUST} tone="sunken" />
        <CompleteYourKit
          eyebrow={`Pairs with the ${product.name}`}
          items={kitTilesForGear(catalogue, product.categorySlug)}
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
