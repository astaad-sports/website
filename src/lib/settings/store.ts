import "server-only";

import { unstable_cache } from "next/cache";

import { readSettings } from "@/db/settings";
import { PRODUCTS_TAG } from "@/lib/products/catalogue";

import { DEFAULT_SETTINGS, type Settings } from "./model";

/**
 * The store's settings for pages, cached with the catalogue (a save calls
 * productsChanged, which refreshes both). The defaults stand in until the
 * first save, and while no database is configured.
 */
export const getStoreSettings = unstable_cache(
  async (): Promise<Settings> => {
    return getFreshSettings();
  },
  ["store-settings"],
  { tags: [PRODUCTS_TAG] }
);

/** The settings straight from the database, for pricing an order. */
export async function getFreshSettings(): Promise<Settings> {
  if (!process.env.DATABASE_URL) return DEFAULT_SETTINGS;
  const row = await readSettings();
  if (!row) return DEFAULT_SETTINGS;
  return {
    storeName: row.storeName,
    supportEmail: row.supportEmail,
    supportPhone: row.supportPhone,
    gstin: row.gstin,
    freeDelivery: row.freeDelivery,
    deliveryFeePaise: row.deliveryFeePaise,
    defaultCarrier: row.defaultCarrier,
    dispatchTime: row.dispatchTime,
  };
}
