import { describe, expect, test } from "bun:test";

import { seedProductRows, toStoreCatalogue, type ProductWithImages } from "@/lib/products/model";

import { robotsRules, sitemapEntries } from "./sitemap";

const BASE = "https://astaadsports.com";

function entries(changes: Record<string, Partial<ProductWithImages>> = {}) {
  return sitemapEntries(toStoreCatalogue(seedProductRows().map((row) => ({ ...row, ...changes[row.slug] }))), BASE);
}

const urls = (list: ReturnType<typeof entries>) => list.map((entry) => entry.url);

describe("the sitemap", () => {
  test("lists home, the shop, categories, products and the pages that are always there, once each", () => {
    const all = urls(entries());
    expect(all[0]).toBe(BASE);
    expect(all).toContain("https://astaadsports.com/shop");
    expect(all).toContain("https://astaadsports.com/shop/bats");
    expect(all).toContain("https://astaadsports.com/shop/helmets");
    expect(all).toContain("https://astaadsports.com/bats/goat");
    expect(all).toContain("https://astaadsports.com/shop/helmets/club-cricket-helmet");
    expect(all).toContain("https://astaadsports.com/returns");
    expect(new Set(all).size).toBe(all.length);
    expect(all.every((url) => url.startsWith(BASE))).toBe(true);
  });

  test("leaves out private pages", () => {
    const all = urls(entries()).join("\n");
    for (const path of ["/admin", "/cart", "/checkout", "/account", "/login", "/wishlist", "/design-system", "/reviews/write"]) {
      expect(all).not.toContain(`${BASE}${path}`);
    }
  });

  test("leaves out hidden products and drafts with no price", () => {
    const all = urls(entries({ goat: { availability: "hidden" }, "club-cricket-helmet": { pricePaise: 0 } }));
    expect(all).not.toContain("https://astaadsports.com/bats/goat");
    expect(all).not.toContain("https://astaadsports.com/shop/helmets/club-cricket-helmet");
  });

  test("leaves out a category or range with nothing on sale", () => {
    // The seeded catalogue has no Kashmir willow or tennis bats.
    const all = urls(entries());
    expect(all).not.toContain("https://astaadsports.com/shop/kashmir-willow");
    expect(all).not.toContain("https://astaadsports.com/shop/tennis-bats");

    const withKashmir = urls(entries({ goat: { subcategory: "kashmir-willow" } }));
    expect(withKashmir).toContain("https://astaadsports.com/shop/kashmir-willow");

    const helmets = ["club-cricket-helmet", "pro-cricket-helmet", "elite-cricket-helmet"];
    const noHelmets = urls(entries(Object.fromEntries(helmets.map((slug) => [slug, { availability: "hidden" as const }]))));
    expect(noHelmets).not.toContain("https://astaadsports.com/shop/helmets");
  });

  test("a product's own photos are listed with it; the built-in stand-ins are not", () => {
    const photo = "https://blob.example/products/goat.webp";
    const list = entries({ goat: { images: [{ url: photo, position: 0 }] } });
    expect(list.find((entry) => entry.url.endsWith("/bats/goat"))?.images).toEqual([photo]);
    expect(list.find((entry) => entry.url.endsWith("/bats/run-machine"))).not.toHaveProperty("images");
  });
});

describe("robots.txt", () => {
  test("production lets everything be crawled and names the sitemap", () => {
    expect(robotsRules({ VERCEL_ENV: "production" }, BASE)).toEqual({
      rules: { userAgent: "*", allow: "/" },
      sitemap: "https://astaadsports.com/sitemap.xml",
    });
    expect(robotsRules({}, BASE).sitemap).toBe("https://astaadsports.com/sitemap.xml");
  });

  test("a preview deploy is closed to crawlers", () => {
    expect(robotsRules({ VERCEL_ENV: "preview" }, BASE)).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });
});
