const LOCAL_ORIGIN = "http://local.invalid";

/**
 * Where to send someone after sign-in: only a path on this site. The value is
 * parsed the way a browser would, because browsers drop tabs and newlines and
 * read "\" as "/", so "/\t/evil.com" or "/\evil.com" would otherwise leave the site.
 */
export function safeRedirectPath(value: unknown, fallback = "/account"): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  let url: URL;
  try {
    url = new URL(value, LOCAL_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== LOCAL_ORIGIN) return fallback;
  return url.pathname + url.search + url.hash;
}
