import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CompleteYourKit } from "@/components/storefront/complete-your-kit";
import { FinalCta } from "@/components/storefront/final-cta";
import { ProductBuilder } from "@/components/storefront/product-builder";
import { ProductDetails } from "@/components/storefront/product-details";
import { ProductHero } from "@/components/storefront/product-hero";
import { ProductStory } from "@/components/storefront/product-story";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { PRODUCT_TRUST, TrustStrip } from "@/components/storefront/trust-strip";
import { BATS, getBat } from "@/lib/catalogue";

export function generateStaticParams() {
  return BATS.map((bat) => ({ slug: bat.slug }));
}

export async function generateMetadata({ params }: PageProps<"/bats/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const bat = getBat(slug);
  if (!bat) return {};
  return {
    title: `${bat.name} — ${bat.grade} Cricket Bat`,
    description: `Configure your Astaad ${bat.name}: weight, profile, handle, free name engraving and knocking.`,
  };
}

export default async function BatPage({ params }: PageProps<"/bats/[slug]">) {
  const { slug } = await params;
  const bat = getBat(slug);
  if (!bat) notFound();

  return (
    <>
      <SiteHeader activeHref="/#collection" />
      <main className="flex-1">
        <ProductHero bat={bat} />
        <ProductBuilder bat={bat} />
        <ProductStory bat={bat} />
        <ProductDetails bat={bat} />
        <TrustStrip items={PRODUCT_TRUST} tone="sunken" />
        <CompleteYourKit bat={bat} />
        <FinalCta
          label={`Customize your ${bat.name}`}
          title="Ready for your"
          highlight="bigger innings?"
          crestSize={64}
          titleClassName="md:text-[64px]"
          primary={{ label: `Customize your ${bat.name}`, href: `/bats/${bat.slug}#build` }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
