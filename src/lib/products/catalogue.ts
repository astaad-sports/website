import "server-only";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

import { listProductsForCatalogue } from "@/db/products";

import { seedProductRows, toStoreCatalogue, type ProductWithImages, type StoreCatalogue } from "./model";

/** Everything cached from the products table carries this tag. */
export const PRODUCTS_TAG = "products";

/** The products table, or the built-in catalogue while no database is configured (local development). */
async function loadRows(): Promise<ProductWithImages[]> {
  if (!process.env.DATABASE_URL) return seedProductRows();
  return listProductsForCatalogue();
}

/**
 * The public catalogue for storefront pages, cached until an admin changes a
 * product (see productsChanged). Hidden products are not in it.
 */
export const getStoreCatalogue = unstable_cache(async (): Promise<StoreCatalogue> => toStoreCatalogue(await loadRows()), [
  "store-catalogue",
], { tags: [PRODUCTS_TAG] });

/** The catalogue straight from the database, for pricing a checkout against current stock. */
export async function getFreshStoreCatalogue(): Promise<StoreCatalogue> {
  return toStoreCatalogue(await loadRows());
}

/**
 * Call after any product, photo or stock change, from a Server Action or Route
 * Handler: the next storefront request reads the new data instead of serving
 * the old page.
 */
export function productsChanged(): void {
  revalidateTag(PRODUCTS_TAG, { expire: 0 });
  revalidatePath("/", "layout");
}
