import type { NextConfig } from "next";

import siteImages from "./src/lib/site-images.json";

/**
 * This project's Vercel Blob host, where admin photo uploads live (see
 * src/lib/products/storage.ts). The store id comes from BLOB_STORE_ID or the
 * read-write token ("vercel_blob_rw_<storeId>_<secret>"), so the image
 * optimiser serves this store's photos and no one else's.
 */
function blobHost(): string | null {
  const id =
    process.env.BLOB_STORE_ID?.replace(/^store_/, "") ?? process.env.BLOB_READ_WRITE_TOKEN?.split("_")[3] ?? "";
  return /^[a-z0-9]+$/i.test(id) ? `${id.toLowerCase()}.public.blob.vercel-storage.com` : null;
}

/**
 * The same store, read from the site's own photos (src/lib/site-images.json),
 * so its product and site photos show even where the environment has no
 * Blob variables.
 */
const siteImageHosts = Object.values(siteImages).flatMap(({ src }) =>
  src.startsWith("https://") ? [new URL(src).hostname] : []
);

const hosts = [...new Set([blobHost(), ...siteImageHosts].filter((host): host is string => Boolean(host)))];

/**
 * Addresses of the WordPress shop this site replaced in September 2026, each
 * sent for good to its page here, so old links and search results keep
 * working and search engines swap the old entry for the new page. Next
 * removes a trailing slash first ("/contact-us/"). Products and ranges are
 * below (see oldShopRedirects). Old pages with no counterpart (the blog, its
 * tags, and the spam pages that site was hacked with) are left to answer 404.
 */
const OLD_SITE_REDIRECTS: [source: string, destination: string][] = [
  ["/return-policy", "/returns"],
  ["/refund-policy", "/returns"],
  ["/contact-us", "/contact"],
  ["/privacy-policy", "/privacy"],
  ["/terms-conditions", "/terms"],
  ["/my-account", "/account"],
  ["/my-account/:path*", "/account"],
  // Three old articles that were about a range the shop lists.
  ["/english-willow-cricket-bats", "/shop/bats"],
  ["/lightweight-kashmir-willow-cricket-bats", "/shop/kashmir-willow"],
  ["/best-tennis-cricket-bats", "/shop/tennis-bats"],
];

/** The old shop's bats that are still made, by their old names, and their pages here. */
const OLD_PRODUCTS: [slug: string, destination: string][] = [
  ["g-o-a-t", "/bats/goat"],
  ["run-machine", "/bats/run-machine"],
  ["combat-pro", "/bats/combat-pro"],
  ["black-edition", "/bats/black-edition"],
  ["weapon-x", "/bats/weapon-x"],
];

/** The old shop's ranges that have a page of their own here; the rest go to all the bats. */
const OLD_CATEGORIES: [slug: string, destination: string][] = [
  ["kashmir-willow", "/shop/kashmir-willow"],
  ["tennis-bat", "/shop/tennis-bats"],
];

/** Where an old product or range with no page of its own goes: a bat that is no longer made, English willow. */
const ALL_BATS = "/shop/bats";

/**
 * The old shop answered at two kinds of address, and Google holds both:
 * "/product/g-o-a-t/" and the plain "/?product=g-o-a-t" (likewise
 * "/product-category/…" and "/?product_cat=…"). A named one comes before the
 * rule for the rest. The plain kind keeps its "?product=…" on the new
 * address, because Next passes a request's query on; the page's canonical
 * address is without it.
 */
function oldShopRedirects(kind: "product" | "product-category", key: string, known: [string, string][]) {
  const plain = (destination: string, value?: string) => ({
    source: "/",
    has: [{ type: "query" as const, key, ...(value ? { value } : {}) }],
    destination,
    permanent: true,
  });
  return [
    ...known.map(([slug, destination]) => ({ source: `/${kind}/${slug}`, destination, permanent: true })),
    { source: `/${kind}/:slug`, destination: ALL_BATS, permanent: true },
    ...known.map(([slug, destination]) => plain(destination, slug)),
    plain(ALL_BATS),
  ];
}

const nextConfig: NextConfig = {
  redirects: async () => [
    ...OLD_SITE_REDIRECTS.map(([source, destination]) => ({ source, destination, permanent: true })),
    ...oldShopRedirects("product", "product", OLD_PRODUCTS),
    ...oldShopRedirects("product-category", "product_cat", OLD_CATEGORIES),
  ],
  // Titles, canonical addresses and the rest go in <head> for every visitor.
  // Next otherwise streams them into <body> for all but a list of crawlers
  // that leaves Googlebot out. Pages already wait for the catalogue, so
  // nothing is slower for it.
  htmlLimitedBots: /.*/,
  images: {
    // `search: ""` refuses query strings, so no one can make the optimizer
    // transform the same photo again and again under different URLs.
    remotePatterns: hosts.flatMap((hostname) => [
      { protocol: "https" as const, hostname, pathname: "/products/**", search: "" },
      { protocol: "https" as const, hostname, pathname: "/site/**", search: "" },
      { protocol: "https" as const, hostname, pathname: "/reviews/**", search: "" },
    ]),
  },
  experimental: {
    serverActions: {
      // One product or review photo per request; the browser shrinks it first, so 4 MB plus form overhead is plenty.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
