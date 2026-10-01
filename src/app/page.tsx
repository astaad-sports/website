import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { BatCollection } from "@/components/storefront/bat-collection";
import { Bestsellers } from "@/components/storefront/bestsellers";
import { BrandStory } from "@/components/storefront/brand-story";
import { CategoryTiles } from "@/components/storefront/category-tiles";
import { Craft } from "@/components/storefront/craft";
import { CustomerReviews } from "@/components/storefront/customer-reviews";
import { Engineered } from "@/components/storefront/engineered";
import { EnglishWillow } from "@/components/storefront/english-willow";
import { FinalCta } from "@/components/storefront/final-cta";
import { HomeBatBuilder } from "@/components/storefront/home-bat-builder";
import { HomeHero } from "@/components/storefront/hero";
import { InstagramFeed } from "@/components/storefront/instagram-feed";
import { bestsellerTiles } from "@/components/storefront/kit-tiles";
import { MobileTabBar } from "@/components/storefront/mobile-tab-bar";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { SizeGuideSection } from "@/components/storefront/size-guide-section";
import { HOME_TRUST, TrustStrip } from "@/components/storefront/trust-strip";
import { WatchReel } from "@/components/storefront/watch-reel";
import { CUSTOMER_CLIP } from "@/lib/customer-photos";
import { INSTAGRAM_URL } from "@/lib/instagram/model";
import { getStoreCatalogue } from "@/lib/products/catalogue";
import { batCounts, batsInSubcategory, builderBat, categoryStats } from "@/lib/products/model";
import { summariseReviews } from "@/lib/reviews/model";
import { getPublishedReviews } from "@/lib/reviews/store";
import { pageMetadata } from "@/lib/seo/metadata";
import { storeJsonLd } from "@/lib/seo/structured-data";
import { getStoreSettings } from "@/lib/settings/store";
import { siteUrl } from "@/lib/site";
import { siteImage } from "@/lib/site-images";

export const metadata: Metadata = pageMetadata({
  title: { absolute: "Astaad Sports | English Willow Cricket Bats & Gear" },
  description:
    "English willow, Kashmir willow and tennis cricket bats, built to your weight, profile and handle. Plus pads, gloves, helmets and kitbags, delivered across India.",
  path: "/",
});

/** The home row shows the latest this many; /reviews has them all. */
const HOME_REVIEWS = 30;

export default async function Home() {
  const [catalogue, reviews, settings] = await Promise.all([
    getStoreCatalogue(),
    getPublishedReviews(),
    getStoreSettings(),
  ]);
  const englishWillow = batsInSubcategory(catalogue, "english-willow");
  const builder = builderBat(catalogue);
  const bestsellers = bestsellerTiles(catalogue);

  return (
    <>
      {storeJsonLd(settings, { base: siteUrl(), sameAs: [INSTAGRAM_URL] }).map((data) => (
        <JsonLd key={String(data["@type"])} data={data} />
      ))}
      <SiteHeader sticky />
      {/* Below md the header stays on screen, so a jump to a section stops just under it. */}
      <main className="flex-1 max-md:[&_[id]]:scroll-mt-14">
        <HomeHero />
        <CategoryTiles stats={categoryStats(catalogue)} />
        <BatCollection models={batCounts(catalogue)} />
        {englishWillow.length > 0 && <EnglishWillow bats={englishWillow} />}
        <Engineered />
        {builder && <HomeBatBuilder bat={builder} />}
        <SizeGuideSection />
        {bestsellers.length > 0 && <Bestsellers items={bestsellers} />}
        <CustomerReviews reviews={reviews.slice(0, HOME_REVIEWS)} summary={summariseReviews(reviews)} clip={CUSTOMER_CLIP} />
        <WatchReel />
        <InstagramFeed />
        <BrandStory />
        <Craft />
        <TrustStrip items={HOME_TRUST} />
        <FinalCta
          label="Shop Astaad"
          title="Ready for your"
          highlight="bigger innings?"
          primary={{ label: "Shop Astaad", href: "/shop" }}
          secondary={{ label: "Build your bat", href: "/#build" }}
          backdrop={siteImage("home/bats-on-the-rock").src}
        />
      </main>
      <SiteFooter />
      <MobileTabBar />
    </>
  );
}
