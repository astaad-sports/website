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

const nextConfig: NextConfig = {
  images: {
    remotePatterns: hosts.flatMap((hostname) => [
      { protocol: "https" as const, hostname, pathname: "/products/**" },
      { protocol: "https" as const, hostname, pathname: "/site/**" },
    ]),
  },
  experimental: {
    serverActions: {
      // One product photo per request; the browser shrinks it first, so 4 MB plus form overhead is plenty.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
