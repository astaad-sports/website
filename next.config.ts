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
 * removes a trailing slash first ("/contact-us/"). A named product comes
 * before the rule for the rest. Old pages with no counterpart (the blog, its
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
  ["/product/g-o-a-t", "/bats/goat"],
  ["/product/run-machine", "/bats/run-machine"],
  ["/product/combat-pro", "/bats/combat-pro"],
  ["/product/black-edition", "/bats/black-edition"],
  ["/product/weapon-x", "/bats/weapon-x"],
  // Bats that are no longer made.
  ["/product/:slug", "/shop/bats"],
  ["/product-category/kashmir-willow", "/shop/kashmir-willow"],
  ["/product-category/tennis-bat", "/shop/tennis-bats"],
  ["/product-category/:slug", "/shop/bats"],
  // Three old articles that were about a range the shop lists.
  ["/english-willow-cricket-bats", "/shop/bats"],
  ["/lightweight-kashmir-willow-cricket-bats", "/shop/kashmir-willow"],
  ["/best-tennis-cricket-bats", "/shop/tennis-bats"],
];

const nextConfig: NextConfig = {
  redirects: async () =>
    OLD_SITE_REDIRECTS.map(([source, destination]) => ({ source, destination, permanent: true })),
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
