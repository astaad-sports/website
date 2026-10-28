// Google Analytics for the store. Pure: tests pass their own environment.

/** The store's Google Analytics 4 property. A measurement ID is public: it is in every page that loads the tag. */
export const GA_MEASUREMENT_ID = "G-TNY9RSYC4S";

/** The store's Google Ads account, loaded by the same Google tag. Public like the measurement ID. */
export const GOOGLE_ADS_ID = "AW-18538906934";

/** Where a paid order is counted in Google Ads: its "Website purchases" conversion. */
export const ADS_PURCHASE_CONVERSION = `${GOOGLE_ADS_ID}/e3eTCO2cy6odELaKhYhF`;

/** The live site: a production build that is not a Vercel preview deploy. */
export function isLiveSite(env: Record<string, string | undefined> = process.env): boolean {
  if (env.NODE_ENV !== "production") return false;
  return !env.VERCEL_ENV || env.VERCEL_ENV === "production";
}

/**
 * The measurement ID where visits should be counted: the live site only.
 * Null in development and on Vercel preview deploys, so our own work on the
 * store never shows up as visitors.
 */
export function analyticsId(env: Record<string, string | undefined> = process.env): string | null {
  return isLiveSite(env) ? GA_MEASUREMENT_ID : null;
}
