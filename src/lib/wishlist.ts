// The wishlist model: the ids of the products a customer saved in this
// browser, newest first. It holds ids only; what each product is and costs
// comes from the store catalogue, as with the cart.
import type { StoreBat, StoreCatalogue, StoreGear } from "./products/model";

export const MAX_SAVED = 100;

export type WishlistEntry = { kind: "bat"; product: StoreBat } | { kind: "gear"; product: StoreGear };

/** Stored ids that still read as ids, without repeats, at most MAX_SAVED. */
export function parseWishlist(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids = raw.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 64);
  return [...new Set(ids)].slice(0, MAX_SAVED);
}

/** Saves `id` at the front, or takes it out if it was saved. Past MAX_SAVED the oldest goes. */
export function toggleSaved(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((saved) => saved !== id) : [id, ...ids].slice(0, MAX_SAVED);
}

/**
 * The saved products the store still shows, newest first. A hidden product
 * stays saved but is left out, so it comes back if the product does.
 */
export function wishlistEntries(ids: string[], catalogue: StoreCatalogue): WishlistEntry[] {
  const bats = new Map(catalogue.bats.map((bat) => [bat.id, bat]));
  const gear = new Map(catalogue.gear.map((product) => [product.id, product]));
  return ids.flatMap<WishlistEntry>((id) => {
    const bat = bats.get(id);
    if (bat) return [{ kind: "bat", product: bat }];
    const product = gear.get(id);
    return product ? [{ kind: "gear", product }] : [];
  });
}
