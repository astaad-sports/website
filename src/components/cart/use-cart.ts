"use client";

import { useSyncExternalStore } from "react";

import {
  addToItems,
  cartItemSchema,
  lineKey,
  MAX_QUANTITY,
  priceCart,
  priceCartItem,
  type CartItem,
  type PricedCart,
} from "@/lib/cart";

// The cart lives in this browser's localStorage. It holds choices only; the
// server prices the order at checkout.
const STORAGE_KEY = "astaad-cart";

const listeners = new Set<() => void>();
let snapshot: { items: CartItem[]; priced: PricedCart } | null = null;
let listeningToStorage = false;

/** Stored items that still parse and still match the catalogue, with duplicate lines merged. */
function readStorage(): CartItem[] {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.reduce<CartItem[]>((items, entry) => {
      const parsed = cartItemSchema.safeParse(entry);
      return parsed.success && priceCartItem(parsed.data) ? addToItems(items, parsed.data) : items;
    }, []);
  } catch {
    return [];
  }
}

function setSnapshot(items: CartItem[]) {
  snapshot = { items, priced: priceCart(items) };
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
 * The shopping cart. `items` and `priced` are null during server rendering
 * and the first client render, then the stored cart.
 */
export function useCart() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    items: state?.items ?? null,
    priced: state?.priced ?? null,
    count: state?.priced.count ?? 0,
    ...actions,
  };
}
