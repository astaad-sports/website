// Browsers built into apps. Links opened in Instagram, Facebook and similar
// apps open in their own browser, and Google refuses to sign anyone in there
// ("disallowed_useragent"), so the sign-in form offers email instead.

export interface InAppBrowser {
  /** "Instagram", "Facebook"…, or null for an app we can't name. */
  app: string | null;
}

const NAMED: [RegExp, string][] = [
  [/\bInstagram\b/, "Instagram"],
  [/\bBarcelona\b/, "Threads"],
  [/\bFB(AN|AV|_IAB|IOS|4A)\b/, "Facebook"],
  [/\bLinkedInApp\b/, "LinkedIn"],
  [/\bSnapchat\b/, "Snapchat"],
];

/**
 * The in-app browser a user agent belongs to, or null for a regular browser.
 * Android's WebView says "; wv)"; iOS web views can't be told apart reliably,
 * so only the apps that name themselves are caught there.
 */
export function inAppBrowser(userAgent: string | null | undefined): InAppBrowser | null {
  if (!userAgent) return null;
  for (const [pattern, app] of NAMED) if (pattern.test(userAgent)) return { app };
  if (/; wv\)/.test(userAgent)) return { app: null };
  return null;
}
