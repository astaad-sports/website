import "server-only";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

import { listAutomaticOffers } from "@/db/offers";
import { listProductsForCatalogue } from "@/db/products";
import type { Offer } from "@/db/schema";
import { readSettings } from "@/db/settings";
import { deliveryFeePaise, DEFAULT_SETTINGS } from "@/lib/settings/model";

import { seedProductRows, toStoreCatalogue, type ProductWithImages, type StoreCatalogue } from "./model";

/** Everything cached from products, offers and settings carries this tag. */
export const PRODUCTS_TAG = "products";

/**
 * How long cached store data lasts, in seconds, as a backstop for changes
 * made outside the admin (a migration, Drizzle Studio). Admin changes refresh
 * it at once (see productsChanged).
 */
export const CATALOGUE_REVALIDATE = 300;

/**
 * What the catalogue is built from. The cache stores JSON, so offers keep ISO
 * times and are turned back into dates when priced (the product rows' own
 * timestamps come back as strings too; pricing doesn't read them).
 */
interface CatalogueInputs {
  rows: ProductWithImages[];
  offers: (Omit<Offer, "startsAt" | "endsAt"> & { startsAt: string; endsAt: string })[];
  deliveryFeePaise: number;
}

/**
 * The products, the offers that need no code and have not ended (upcoming
 * ones too), and the delivery charge, from the database, or the built-in
 * catalogue while no database is configured (local development).
 */
async function loadInputs(): Promise<CatalogueInputs> {
  if (!process.env.DATABASE_URL) return { rows: seedProductRows(), offers: [], deliveryFeePaise: 0 };
  const [rows, offers, settings] = await Promise.all([
    listProductsForCatalogue(),
    listAutomaticOffers(new Date()),
    readSettings(),
  ]);
  return {
    rows,
    offers: offers.map((offer) => ({ ...offer, startsAt: offer.startsAt.toISOString(), endsAt: offer.endsAt.toISOString() })),
    deliveryFeePaise: deliveryFeePaise(settings ?? DEFAULT_SETTINGS),
  };
}

/**
 * Prices the inputs at `now`. Which offer runs is decided here, on every
 * request, not when the data was cached, so an offer starts and ends on the
 * store exactly at its India midnight.
 */
function buildCatalogue(inputs: CatalogueInputs, now: Date): StoreCatalogue {
  const offers = inputs.offers.map((offer) => ({ ...offer, startsAt: new Date(offer.startsAt), endsAt: new Date(offer.endsAt) }));
  return toStoreCatalogue(inputs.rows, { offers, deliveryFeePaise: inputs.deliveryFeePaise, now });
}

const getCatalogueInputs = unstable_cache(loadInputs, ["store-catalogue-inputs"], {
  tags: [PRODUCTS_TAG],
  revalidate: CATALOGUE_REVALIDATE,
});

/**
 * The public catalogue for storefront pages, priced at this moment. Hidden
 * products are not in it. The data behind it is cached until an admin changes
 * a product, offer or setting; pages render for each request (see the root layout).
 */
export async function getStoreCatalogue(): Promise<StoreCatalogue> {
  return buildCatalogue(await getCatalogueInputs(), new Date());
}

/** The catalogue straight from the database, for pricing a checkout against current stock and offers. */
export async function getFreshStoreCatalogue(): Promise<StoreCatalogue> {
  return buildCatalogue(await loadInputs(), new Date());
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
