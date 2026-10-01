import type { MetadataRoute } from "next";

import { getStoreCatalogue } from "@/lib/products/catalogue";
import { sitemapEntries } from "@/lib/seo/sitemap";
import { siteUrl } from "@/lib/site";

// Follows the catalogue's cache: a product added, hidden or deleted in the
// admin changes it at once (see productsChanged).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return sitemapEntries(await getStoreCatalogue(), siteUrl());
}
