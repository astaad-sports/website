// Google Analytics for the store. Pure: tests pass their own environment.

/** The store's Google Analytics 4 property. A measurement ID is public: it is in every page that loads the tag. */
export const GA_MEASUREMENT_ID = "G-TNY9RSYC4S";

/**
 * The measurement ID where visits should be counted: the live site only.
 * Null in development and on Vercel preview deploys, so our own work on the
 * store never shows up as visitors.
 */
export function analyticsId(env: Record<string, string | undefined> = process.env): string | null {
  if (env.NODE_ENV !== "production") return null;
  if (env.VERCEL_ENV && env.VERCEL_ENV !== "production") return null;
  return GA_MEASUREMENT_ID;
}
