"use client";

import { useMemo, useSyncExternalStore } from "react";

import { useCatalogue } from "@/components/cart/catalogue-provider";
import { parseWishlist, toggleSaved, wishlistEntries } from "@/lib/wishlist";

// The wishlist lives in this browser's localStorage, like the cart: product
// ids only, newest first.
const STORAGE_KEY = "astaad-wishlist";

const listeners = new Set<() => void>();
let snapshot: string[] | null = null;
let listeningToStorage = false;

function readStorage(): string[] {
  try {
    return parseWishlist(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function write(ids: string[]) {
  snapshot = ids;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Private mode or a full quota: the wishlist still works for this page view.
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed the wishlist: re-read it once for every subscriber.
  if (!listeningToStorage) {
    listeningToStorage = true;
    window.addEventListener("storage", (event) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      snapshot = readStorage();
      emit();
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  if (!snapshot) snapshot = readStorage();
  return snapshot;
}

// The server has no wishlist; null lets pages show a placeholder until the browser loads it.
function getServerSnapshot() {
  return null;
}

function toggle(id: string) {
  write(toggleSaved(getSnapshot(), id));
}

/** Whether one product is saved (false until the browser has loaded the wishlist), and a toggle for it. */
export function useSaved(id: string) {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { saved: ids?.includes(id) ?? false, toggle: () => toggle(id) };
}

/**
 * The saved products the store still shows, newest first. `entries` is null
 * during server rendering and the first client render, then the stored wishlist.
 */
export function useWishlist() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const catalogue = useCatalogue();
  const entries = useMemo(() => (ids ? wishlistEntries(ids, catalogue) : null), [ids, catalogue]);
  return { entries, count: entries?.length ?? 0 };
}
