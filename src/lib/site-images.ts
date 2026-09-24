// The store's own photos: the home page, category tiles, customer photos and
// the bat builder's shapes. They live in Vercel Blob under site/; the list in
// site-images.json was written when they were uploaded. Each file name carries
// a hash of its contents, so a replaced photo gets a new URL and no cache
// serves the old one. Product photos are not here: they belong to their
// products (the product_images table).
import images from "./site-images.json";

export type SiteImageKey = keyof typeof images;

export interface SiteImage {
  src: string;
  width: number;
  height: number;
}

export function siteImage(key: SiteImageKey): SiteImage {
  return images[key];
}
