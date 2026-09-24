import { BAT_IMAGE, getBat, getGear } from "@/lib/catalogue";

/** The catalogue photo for an ordered product, or null if the product has since been removed. */
export function productImage(kind: "bat" | "gear", slug: string): string | null {
  if (kind === "bat") return getBat(slug) ? BAT_IMAGE : null;
  return getGear(slug)?.image ?? null;
}
