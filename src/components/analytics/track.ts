// Sends shopping events to Google Analytics from the browser (see
// src/lib/analytics-events.ts for what they say).

declare global {
  interface Window {
    /** Defined by the Google tag (see GoogleAnalytics); absent wherever analytics is off. */
    gtag?: (...args: unknown[]) => void;
  }
}

const waiting: [name: string, params: object][] = [];
let retry: ReturnType<typeof setInterval> | undefined;

function send(): boolean {
  if (typeof window.gtag !== "function") return false;
  for (const [name, params] of waiting.splice(0)) window.gtag("event", name, params);
  return true;
}

/**
 * Report an event. The Google tag loads after the page is interactive, so an
 * event raised as a page opens waits for it, for up to five seconds. Where
 * the tag never comes (development, preview deploys, the admin, a visitor who
 * blocks it) the event is dropped.
 */
export function trackEvent(name: string, params: object): void {
  if (typeof window === "undefined") return;
  waiting.push([name, params]);
  if (send() || retry) return;
  let tries = 0;
  retry = setInterval(() => {
    if (!send() && ++tries < 20) return;
    clearInterval(retry);
    retry = undefined;
    waiting.length = 0;
  }, 250);
}
