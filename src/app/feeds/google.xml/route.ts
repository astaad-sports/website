import { getStoreCatalogue } from "@/lib/products/catalogue";
import { feedItems, feedXml } from "@/lib/seo/merchant-feed";
import { siteUrl } from "@/lib/site";

/**
 * /feeds/google.xml: the product feed Google Merchant Center fetches on a
 * schedule, so its prices and stock follow the store (see merchant-feed.ts).
 * It is made on each request from the catalogue, which an admin change
 * refreshes at once. It is data for Google, not a page for search results.
 */
export async function GET() {
  const base = siteUrl();
  const items = feedItems(await getStoreCatalogue(), base);
  const body = feedXml(items, {
    title: "Astaad Sports",
    link: base,
    description: "Astaad cricket bats and gear, one item for each size on sale.",
  });
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "X-Robots-Tag": "noindex",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
