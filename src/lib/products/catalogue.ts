import "server-only";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

import { listAutomaticOffers } from "@/db/offers";
import { listProductsForCatalogue } from "@/db/products";
import { readSettings } from "@/db/settings";
import { deliveryFeePaise, DEFAULT_SETTINGS } from "@/lib/settings/model";

import { seedProductRows, toStoreCatalogue, type StoreCatalogue } from "./model";

/** Everything cached from products, offers and settings carries this tag. */
export const PRODUCTS_TAG = "products";

/**
 * How long a cached catalogue lasts, in seconds, so an offer starts or ends
 * on the store within a few minutes of midnight without anyone saving
 * anything. The root layout uses the same number (it must be a literal there).
 */
export const CATALOGUE_REVALIDATE = 300;

/**
 * The products with their running offers and the delivery charge, from the
 * database, or the built-in catalogue while no database is configured (local
 * development).
 */
async function buildCatalogue(): Promise<StoreCatalogue> {
  if (!process.env.DATABASE_URL) return toStoreCatalogue(seedProductRows());
  const now = new Date();
  const [rows, offers, settings] = await Promise.all([listProductsForCatalogue(), listAutomaticOffers(now), readSettings()]);
  return toStoreCatalogue(rows, { offers, deliveryFeePaise: deliveryFeePaise(settings ?? DEFAULT_SETTINGS), now });
}

/**
 * The public catalogue for storefront pages, cached until an admin changes a
 * product, offer or setting (see productsChanged), and for at most five
 * minutes. Hidden products are not in it.
 */
export const getStoreCatalogue = unstable_cache(buildCatalogue, ["store-catalogue"], {
  tags: [PRODUCTS_TAG],
  revalidate: CATALOGUE_REVALIDATE,
});

/** The catalogue straight from the database, for pricing a checkout against current stock and offers. */
export async function getFreshStoreCatalogue(): Promise<StoreCatalogue> {
  return buildCatalogue();
}

/**
 * Call after any product, photo, stock, offer or settings change, from a
 * Server Action or Route Handler: the next storefront request reads the new
 * data instead of serving the old page.
 */
export function productsChanged(): void {
  revalidateTag(PRODUCTS_TAG, { expire: 0 });
  revalidatePath("/", "layout");
}
