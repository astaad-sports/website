import { BatCollection } from "@/components/storefront/bat-collection";
import { Bestsellers } from "@/components/storefront/bestsellers";
import { BrandStory } from "@/components/storefront/brand-story";
import { CategoryTiles } from "@/components/storefront/category-tiles";
import { Engineered } from "@/components/storefront/engineered";
import { EnglishWillow } from "@/components/storefront/english-willow";
import { FinalCta } from "@/components/storefront/final-cta";
import { HomeBatBuilder } from "@/components/storefront/home-bat-builder";
import { HomeHero } from "@/components/storefront/hero";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { SizeGuideSection } from "@/components/storefront/size-guide-section";
import { HOME_TRUST, TrustStrip } from "@/components/storefront/trust-strip";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <HomeHero />
        <CategoryTiles />
        <BatCollection />
        <EnglishWillow />
        <Engineered />
        <HomeBatBuilder />
        <SizeGuideSection />
        <Bestsellers />
        <BrandStory />
        <TrustStrip items={HOME_TRUST} />
        <FinalCta
          label="Shop Astaad"
          title="Ready for your"
          highlight="bigger innings?"
          primary={{ label: "Shop Astaad", href: "/#collection" }}
          secondary={{ label: "Build your bat", href: "/#build" }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
