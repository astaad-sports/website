"use client";

import { useSyncExternalStore } from "react";

import { countdownParts, type CountdownParts } from "@/lib/offers/model";

// One clock for every countdown on the page (a grid of cards can show
// dozens), ticking each second while any of them is on screen.
let clock = 0;
let timer: number | undefined;
const listeners = new Set<() => void>();

function tick() {
  clock = Date.now();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (timer === undefined) {
    clock = Date.now();
    timer = window.setInterval(tick, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
}

/** Now, to the second, so reads within one second agree. */
const thisSecond = () => Math.floor(Date.now() / 1000) * 1000;

/**
 * Time left until `endsAt` (ISO), ticking each second. The server renders it
 * at its own time and the browser hydrates at a slightly later one, so the
 * element showing it needs `suppressHydrationWarning`.
 */
export function useCountdown(endsAt: string): CountdownParts {
  const now = useSyncExternalStore(subscribe, () => (timer === undefined ? thisSecond() : clock), thisSecond);
  return countdownParts(new Date(endsAt).getTime() - now);
}
