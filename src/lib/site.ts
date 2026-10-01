// The site's public address, for links that leave the site (order emails) and
// for what search engines read (canonical addresses, the sitemap, JSON-LD).
// Pure: tests pass their own environment.

/** An http(s) origin from a setting, adding https:// to a bare domain; null when unusable. */
function origin(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null;
  } catch {
    return null;
  }
}

/**
 * The site's origin with no trailing slash: SITE_URL, else the Vercel
 * production domain (VERCEL_PROJECT_PRODUCTION_URL), else
 * http://localhost:3000. A value that is not an http(s) address is skipped.
 */
export function siteUrl(env: Record<string, string | undefined> = process.env): string {
  return origin(env.SITE_URL) ?? origin(env.VERCEL_PROJECT_PRODUCTION_URL) ?? "http://localhost:3000";
}

/**
 * A path on the site ("/bats/goat", "/images/helmet.png") as a full address
 * on `base`; the home page is `base` itself. A full address, such as a
 * photo in Blob, comes back as it is.
 */
export function absoluteUrl(pathOrUrl: string, base: string = siteUrl()): string {
  if (!pathOrUrl.startsWith("/")) return pathOrUrl;
  return pathOrUrl === "/" ? base : `${base}${pathOrUrl}`;
}
