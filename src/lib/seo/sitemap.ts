// What /sitemap.xml and /robots.txt say. Pure, so the lists can be tested
// without the database; the routes are src/app/sitemap.ts and robots.ts.
import type { MetadataRoute } from "next";

import { BAT_RANGES, STORE_CATEGORIES } from "@/lib/catalogue";
import { batsInSubcategory, gearInCategory, type StoreCatalogue } from "@/lib/products/model";
import { absoluteUrl } from "@/lib/site";

import { realPhotos } from "./structured-data";

/** Public pages that are always there. Cart, checkout, account, sign-in and the admin are private and carry noindex. */
const STATIC_PAGES = [
  "/about",
  "/reviews",
  "/size-guide",
  "/contact",
  "/track-order",
  "/warranty",
  "/delivery",
  "/returns",
  "/terms",
  "/privacy",
];

/**
 * Every page search engines should know: home, the shop, each category and
 * bat range that has something on sale (an empty one only says "Coming
 * soon"), every product the public can see with its photos, and the pages
 * that are always there. The sitemap is written as given, so every address
 * is a full one.
 */
export function sitemapEntries(catalogue: StoreCatalogue, base: string): MetadataRoute.Sitemap {
  const page = (path: string, images: readonly string[] = []): MetadataRoute.Sitemap[number] => {
    const photos = realPhotos(images).map((src) => absoluteUrl(src, base));
    return { url: absoluteUrl(path, base), ...(photos.length ? { images: photos } : {}) };
  };

  const categories = STORE_CATEGORIES.filter((category) =>
    category.kind === "bats" ? catalogue.bats.length > 0 : gearInCategory(catalogue, category.slug).length > 0
  );
  const ranges = BAT_RANGES.filter((range) => batsInSubcategory(catalogue, range.slug).length > 0);

  return [
    page("/"),
    page("/shop"),
    ...[...categories, ...ranges].map((entry) => page(entry.href)),
    ...catalogue.bats.map((bat) => page(`/bats/${bat.slug}`, bat.images)),
    ...catalogue.gear.map((product) => page(`/shop/${product.categorySlug}/${product.slug}`, product.images)),
    ...STATIC_PAGES.map((path) => page(path)),
  ];
}

/**
 * Everything may be crawled: private pages say noindex themselves, which a
 * crawler can only read if it is allowed in. A Vercel preview deploy is
 * closed altogether, so a branch's copy of the store is never indexed.
 */
export function robotsRules(env: Record<string, string | undefined>, base: string): MetadataRoute.Robots {
  if (env.VERCEL_ENV && env.VERCEL_ENV !== "production") return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${base}/sitemap.xml` };
}
