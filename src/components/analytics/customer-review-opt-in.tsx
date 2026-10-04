"use client";

import Script from "next/script";

import type { ReviewOptIn } from "@/lib/customer-reviews";

declare global {
  interface Window {
    gapi?: {
      load(module: "surveyoptin", ready: () => void): void;
      surveyoptin?: { render(optIn: ReviewOptIn): void };
    };
  }
}

// One mark per order in this browser's localStorage, so reloading the
// confirmation page, or coming back to it, does not ask again.
const ASKED_KEY = "astaad-review-asked";

function alreadyAsked(key: string): boolean {
  try {
    return window.localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

function rememberAsked(key: string) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // Private mode or a full quota: a reload asks again, which Google allows.
  }
}

/**
 * Google Customer Reviews' opt-in: Google's own dialog asking whether it may
 * email the customer a survey once the order has arrived. The order page
 * shows it on the confirmation that follows payment, and decides whether
 * there is anything to ask (see reviewOptIn).
 */
export function CustomerReviewOptIn({ optIn }: { optIn: ReviewOptIn }) {
  return (
    <Script
      src="https://apis.google.com/js/platform.js"
      strategy="afterInteractive"
      onReady={() => {
        const key = `${ASKED_KEY}-${optIn.order_id}`;
        if (alreadyAsked(key)) return;
        window.gapi?.load("surveyoptin", () => {
          window.gapi?.surveyoptin?.render(optIn);
          rememberAsked(key);
        });
      }}
    />
  );
}
