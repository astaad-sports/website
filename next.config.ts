import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product photos uploaded from the admin (src/lib/products/storage.ts).
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com", pathname: "/products/**" }],
  },
  experimental: {
    serverActions: {
      // One product photo per request; the browser shrinks it first, so 4 MB plus form overhead is plenty.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
