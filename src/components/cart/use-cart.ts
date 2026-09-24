"use client";

import { useMemo, useSyncExternalStore } from "react";

import { addToItems, cartItemSchema, lineKey, MAX_QUANTITY, priceCart, type CartItem } from "@/lib/cart";

import { useCatalogue } from "./catalogue-provider";

// The cart lives in this browser's localStorage. It holds choices only; the
// server prices the order at checkout.
const STORAGE_KEY = "astaad-cart";

const listeners = new Set<() => void>();
let snapshot: { items: CartItem[] } | null = null;
let listeningToStorage = false;

/**
 * Stored items that still parse, with duplicate lines merged. An item the
 * catalogue no longer sells (a hidden product) stays stored but is left out of
 * the cart, so it comes back if the product does.
 */
function readStorage(): CartItem[] {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.reduce<CartItem[]>((items, entry) => {
      const parsed = cartItemSchema.safeParse(entry);
      return parsed.success ? addToItems(items, parsed.data) : items;
    }, []);
  } catch {
    return [];
  }
}

function setSnapshot(items: CartItem[]) {
  snapshot = { items };
}

function emit() {
  for (const listener of listeners) listener();
}

function write(items: CartItem[]) {
  setSnapshot(items);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Private mode or a full quota: the cart still works for this page view.
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed the cart: re-read it once for every subscriber.
  if (!listeningToStorage) {
    listeningToStorage = true;
    window.addEventListener("storage", (event) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      setSnapshot(readStorage());
      emit();
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  if (!snapshot) setSnapshot(readStorage());
  return snapshot!;
}

// The server has no cart; null lets pages show a placeholder until the browser loads it.
function getServerSnapshot() {
  return null;
}

const actions = {
  add(item: CartItem) {
    write(addToItems(getSnapshot().items, item));
  },
  setQuantity(key: string, quantity: number) {
    const next = Math.min(MAX_QUANTITY, Math.max(1, Math.round(quantity)));
    write(getSnapshot().items.map((item) => (lineKey(item) === key ? { ...item, quantity: next } : item)));
  },
  remove(key: string) {
    write(getSnapshot().items.filter((item) => lineKey(item) !== key));
  },
  clear() {
    write([]);
  },
};

/**
 * The shopping cart, priced against the current catalogue. `items` (the lines
 * that can be shown) and `priced` are null during server rendering and the
 * first client render, then the stored cart.
 */
export function useCart() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const catalogue = useCatalogue();
  const priced = useMemo(() => (state ? priceCart(state.items, catalogue) : null), [state, catalogue]);
  const items = useMemo(() => priced?.lines.map((line) => line.item) ?? null, [priced]);
  return {
    items,
    priced,
    count: priced?.count ?? 0,
    ...actions,
  };
}
