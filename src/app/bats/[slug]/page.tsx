import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CompleteYourKit } from "@/components/storefront/complete-your-kit";
import { FinalCta } from "@/components/storefront/final-cta";
import { kitTilesForBat } from "@/components/storefront/kit-tiles";
import { ProductBuilder } from "@/components/storefront/product-builder";
import { ProductDetails } from "@/components/storefront/product-details";
import { ProductHero } from "@/components/storefront/product-hero";
import { ProductStory } from "@/components/storefront/product-story";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { PRODUCT_TRUST, TrustStrip } from "@/components/storefront/trust-strip";
import { getStoreCatalogue } from "@/lib/products/catalogue";
import { findStoreBat, listInWords, type StoreBat } from "@/lib/products/model";

// Bats added after the build still render on first visit (dynamicParams is on by default).
export async function generateStaticParams() {
  const { bats } = await getStoreCatalogue();
  return bats.map((bat) => ({ slug: bat.slug }));
}

/** The meta description, naming only the choices this bat offers. */
function metaDescription(bat: StoreBat): string {
  const { customization } = bat;
  if (!customization.enabled) return `The Astaad ${bat.name}, a ${bat.grade} cricket bat in four sizes.`;
  const choices = ["weight", "profile", "handle"];
  if (customization.engraving) choices.push("free name engraving");
  if (customization.matchReady) choices.push("knocking");
  return `Configure your Astaad ${bat.name}: ${listInWords(choices)}.`;
}

export async function generateMetadata({ params }: PageProps<"/bats/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const bat = findStoreBat(await getStoreCatalogue(), slug);
  if (!bat) return {};
  return {
    title: `${bat.name} — ${bat.grade} Cricket Bat`,
    description: metaDescription(bat),
  };
}

export default async function BatPage({ params }: PageProps<"/bats/[slug]">) {
  const { slug } = await params;
  const catalogue = await getStoreCatalogue();
  const bat = findStoreBat(catalogue, slug);
  if (!bat) notFound();

  const cta = bat.customization.enabled ? `Customize your ${bat.name}` : `Choose your ${bat.name}`;

  return (
    <>
      <SiteHeader activeHref="/#collection" />
      <main className="flex-1">
        <ProductHero bat={bat} />
        <ProductBuilder key={bat.slug} bat={bat} />
        <ProductStory bat={bat} />
        <ProductDetails bat={bat} />
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
