import { BAT_IMAGE, getBat, getGear } from "@/lib/catalogue";

/**
 * The built-in photo for an ordered product, for when the products table has
 * none (see primaryImagesBySlug); null for products that never shipped with the site.
 */
export function productImage(kind: "bat" | "gear", slug: string): string | null {
  if (kind === "bat") return getBat(slug) ? BAT_IMAGE : null;
  return getGear(slug)?.image ?? null;
}
