import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/json-ld";
import { CompleteYourKit } from "@/components/storefront/complete-your-kit";
import { deliveryTerms } from "@/components/storefront/delivery";
import { FinalCta } from "@/components/storefront/final-cta";
import { kitTilesForBat } from "@/components/storefront/kit-tiles";
import { ProductBuilder } from "@/components/storefront/product-builder";
import { ProductDetails } from "@/components/storefront/product-details";
import { ProductHero } from "@/components/storefront/product-hero";
import { ProductReviews } from "@/components/storefront/product-reviews";
import { ProductStory } from "@/components/storefront/product-story";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { PRODUCT_TRUST, TrustStrip } from "@/components/storefront/trust-strip";
import { getBatRange, getCategory } from "@/lib/catalogue";
import { getStoreCatalogue } from "@/lib/products/catalogue";
import { findStoreBat, sizeInAddress } from "@/lib/products/model";
import { reviewsOfProduct } from "@/lib/reviews/model";
import { getPublishedReviews } from "@/lib/reviews/store";
import { pageMetadata, productShareImage } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, productJsonLd, realPhotos, sizeListings } from "@/lib/seo/structured-data";
import { batDescription, batDescriptor, batTitle } from "@/lib/seo/titles";
import { getStoreSettings } from "@/lib/settings/store";
import { siteUrl } from "@/lib/site";

// Bats added after the build still render on first visit (dynamicParams is on by default).
export async function generateStaticParams() {
  const { bats } = await getStoreCatalogue();
  return bats.map((bat) => ({ slug: bat.slug }));
}

export async function generateMetadata({ params }: PageProps<"/bats/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const bat = findStoreBat(await getStoreCatalogue(), slug);
  if (!bat) return {};
  const photo = realPhotos(bat.images)[0];
  return pageMetadata({
    title: batTitle(bat),
    description: batDescription(bat),
    path: `/bats/${bat.slug}`,
    image: photo ? productShareImage(bat, photo) : undefined,
  });
}

export default async function BatPage({ params, searchParams }: PageProps<"/bats/[slug]">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const [catalogue, settings, published] = await Promise.all([getStoreCatalogue(), getStoreSettings(), getPublishedReviews()]);
  const bat = findStoreBat(catalogue, slug);
  if (!bat) notFound();
  const reviews = reviewsOfProduct(published, bat.id);
  // "?size=6" opens the page on that size: search engines list each size at such an address.
  const size = sizeInAddress(bat, query.size);

  const cta = bat.customization.enabled ? `Customize your ${bat.name}` : `Choose your ${bat.name}`;
  const delivery = deliveryTerms(settings);

  const base = siteUrl();
  const path = `/bats/${bat.slug}`;
  const range = getBatRange(bat.subcategory);
  // Home, Bats, the bat's range where it has a page of its own, then the bat.
  const trail = [
    { name: "Home", path: "/" },
    { name: "Bats", path: "/shop/bats" },
    ...(range ? [{ name: range.name, path: range.href }] : []),
    { name: bat.name, path },
  ];

  return (
    <>
      <JsonLd
        data={productJsonLd({
          product: bat,
          name: `Astaad ${bat.name} ${batDescriptor(bat)}`,
          // The bat's specification line, as "Product details" shows it.
          description: bat.details,
          category: "Cricket Bats",
          path,
          reviews,
          deliveryFeePaise: delivery.feePaise,
          base,
          group: { id: bat.slug, sizes: sizeListings(bat, path) },
        })}
      />
      <JsonLd data={breadcrumbJsonLd(trail, base)} />
      <SiteHeader activeHref={getCategory("bats")?.href} />
      <main className="flex-1">
        <ProductHero bat={bat} delivery={delivery} reviews={reviews} size={size} />
        <ProductBuilder key={`${bat.slug}:${size ?? ""}`} bat={bat} deliveryFeePaise={delivery.feePaise} size={size} />
        <ProductStory bat={bat} />
        <ProductDetails bat={bat} />
        <ProductReviews productId={bat.id} productName={bat.name} reviews={reviews} />
        <TrustStrip items={PRODUCT_TRUST} tone="sunken" />
        <CompleteYourKit eyebrow={`Pairs with the ${bat.name}`} items={kitTilesForBat(catalogue)} />
        <FinalCta
          label={cta}
          title="Ready for your"
          highlight="bigger innings?"
          crestSize={64}
          titleClassName="md:text-[64px]"
          primary={{ label: cta, href: `/bats/${bat.slug}#build` }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
