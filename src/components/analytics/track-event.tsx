"use client";

import { useEffect } from "react";

import { trackEvent } from "./track";

function alreadySent(mark: string): boolean {
  try {
    return window.localStorage.getItem(mark) !== null;
  } catch {
    return false;
  }
}

function remember(mark: string) {
  try {
    window.localStorage.setItem(mark, "1");
  } catch {
    // Private mode or a full quota: a reload reports it again, and Analytics
    // still counts an order once, by its number.
  }
}

/**
 * Reports one event to Google Analytics when the page it is on opens: a
 * product viewed, an order paid. The same event is not sent again when the
 * page re-renders. With `once`, a mark in this browser's localStorage, it is
 * not sent again on a reload or a return to the page either.
 */
export function TrackEvent({ name, params, once }: { name: string; params: object; once?: string }) {
  // The page hands over a new object on every render; its contents say whether anything changed.
  const signature = JSON.stringify(params);
  useEffect(() => {
    if (once && alreadySent(once)) return;
    trackEvent(name, JSON.parse(signature) as object);
    if (once) remember(once);
  }, [name, signature, once]);
  return null;
}
