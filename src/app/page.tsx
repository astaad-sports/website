import { BatCollection } from "@/components/storefront/bat-collection";
import { Bestsellers } from "@/components/storefront/bestsellers";
import { BrandStory } from "@/components/storefront/brand-story";
import { CategoryTiles } from "@/components/storefront/category-tiles";
import { Craft } from "@/components/storefront/craft";
import { CustomerPhotos } from "@/components/storefront/customer-photos";
import { Engineered } from "@/components/storefront/engineered";
import { EnglishWillow } from "@/components/storefront/english-willow";
import { FinalCta } from "@/components/storefront/final-cta";
import { HomeBatBuilder } from "@/components/storefront/home-bat-builder";
import { HomeHero } from "@/components/storefront/hero";
import { bestsellerTiles } from "@/components/storefront/kit-tiles";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { SizeGuideSection } from "@/components/storefront/size-guide-section";
import { HOME_TRUST, TrustStrip } from "@/components/storefront/trust-strip";
import { CUSTOMER_CLIP, CUSTOMER_PHOTOS } from "@/lib/customer-photos";
import { getStoreCatalogue } from "@/lib/products/catalogue";
import { batCounts, batsInSubcategory, builderBat, categoryStats } from "@/lib/products/model";
import { siteImage } from "@/lib/site-images";

export default async function Home() {
  const catalogue = await getStoreCatalogue();
  const englishWillow = batsInSubcategory(catalogue, "english-willow");
  const builder = builderBat(catalogue);
  const bestsellers = bestsellerTiles(catalogue);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <HomeHero />
        <CategoryTiles stats={categoryStats(catalogue)} />
        <BatCollection models={batCounts(catalogue)} />
        {englishWillow.length > 0 && <EnglishWillow bats={englishWillow} />}
        <Engineered />
        {builder && <HomeBatBuilder bat={builder} />}
        <SizeGuideSection />
        {bestsellers.length > 0 && <Bestsellers items={bestsellers} />}
        <CustomerPhotos photos={CUSTOMER_PHOTOS} clip={CUSTOMER_CLIP} />
        <BrandStory />
        <Craft />
        <TrustStrip items={HOME_TRUST} />
        <FinalCta
          label="Shop Astaad"
          title="Ready for your"
          highlight="bigger innings?"
          primary={{ label: "Shop Astaad", href: "/#collection" }}
          secondary={{ label: "Build your bat", href: "/#build" }}
          backdrop={siteImage("home/bats-on-the-rock").src}
        />
      </main>
      <SiteFooter />
    </>
  );
}
