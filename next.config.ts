import type { NextConfig } from "next";

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

const host = blobHost();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: host ? [{ protocol: "https", hostname: host, pathname: "/products/**" }] : [],
  },
  experimental: {
    serverActions: {
      // One product photo per request; the browser shrinks it first, so 4 MB plus form overhead is plenty.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
