import type { ReviewOptIn } from "@/lib/customer-reviews";

/** The parts of Google's platform.js (`window.gapi`) that Customer Reviews uses. */
export interface GoogleApi {
  load(module: "surveyoptin" | "ratingbadge", ready: () => void): void;
  surveyoptin?: { render(optIn: ReviewOptIn): void };
  ratingbadge?: {
    render(container: HTMLElement, options: { merchant_id: number; position: "INLINE" | "BOTTOM_LEFT" | "BOTTOM_RIGHT" }): void;
  };
}

declare global {
  interface Window {
    gapi?: GoogleApi;
  }
}

let platform: Promise<GoogleApi> | null = null;

/**
 * Google's platform.js, loaded once however many components ask for it: the
 * order confirmation has both the badge and the opt-in. Not next/script,
 * which calls back only one of two components that share a script. Rejects
 * when the script is blocked; the next call tries again.
 */
export function loadGooglePlatform(): Promise<GoogleApi> {
  platform ??= new Promise<GoogleApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/platform.js";
    script.async = true;
    const failed = () => {
      platform = null;
      script.remove();
      reject(new Error("Google's platform.js did not load"));
    };
    script.onload = () => (window.gapi ? resolve(window.gapi) : failed());
    script.onerror = failed;
    document.head.appendChild(script);
  });
  return platform;
}
