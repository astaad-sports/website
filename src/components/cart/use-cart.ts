"use client";

import { useMemo, useSyncExternalStore } from "react";
import { z } from "zod";

import { addToItems, cartItemSchema, lineKey, MAX_QUANTITY, priceCart, type CartItem } from "@/lib/cart";
import type { AppliedCoupon } from "@/lib/offers/model";

import { useCatalogue } from "./catalogue-provider";

// The cart lives in this browser's localStorage. It holds choices only; the
// server prices the order at checkout.
const STORAGE_KEY = "astaad-cart";
/** The coupon the server accepted; checked again when the order is placed. */
const COUPON_KEY = "astaad-coupon";

const couponSchema: z.ZodType<AppliedCoupon> = z.object({
  code: z.string().max(20),
  name: z.string().max(60),
  percentOff: z.number().int().min(1).max(90),
  scope: z.enum(["store", "categories", "products"]),
  categories: z.array(z.string().max(40)).max(10),
  productIds: z.array(z.string().max(40)).max(500),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
});

interface CartState {
  items: CartItem[];
  coupon: AppliedCoupon | null;
}

const listeners = new Set<() => void>();
let snapshot: CartState | null = null;
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

function readCoupon(): AppliedCoupon | null {
  try {
    const parsed = couponSchema.safeParse(JSON.parse(window.localStorage.getItem(COUPON_KEY) ?? "null"));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function setSnapshot(state: CartState) {
  snapshot = state;
}

function readState(): CartState {
  return { items: readStorage(), coupon: readCoupon() };
}

function emit() {
  for (const listener of listeners) listener();
}

function write(next: Partial<CartState>) {
  setSnapshot({ ...getSnapshot(), ...next });
  try {
    if (next.items) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next.items));
    if (next.coupon !== undefined) {
      if (next.coupon) window.localStorage.setItem(COUPON_KEY, JSON.stringify(next.coupon));
      else window.localStorage.removeItem(COUPON_KEY);
    }
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
      if (event.key !== STORAGE_KEY && event.key !== COUPON_KEY && event.key !== null) return;
      setSnapshot(readState());
      emit();
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  if (!snapshot) setSnapshot(readState());
  return snapshot!;
}

// The server has no cart; null lets pages show a placeholder until the browser loads it.
function getServerSnapshot() {
  return null;
}

const actions = {
  add(item: CartItem) {
    write({ items: addToItems(getSnapshot().items, item) });
  },
  setQuantity(key: string, quantity: number) {
    const next = Math.min(MAX_QUANTITY, Math.max(1, Math.round(quantity)));
    write({ items: getSnapshot().items.map((item) => (lineKey(item) === key ? { ...item, quantity: next } : item)) });
  },
  remove(key: string) {
    write({ items: getSnapshot().items.filter((item) => lineKey(item) !== key) });
  },
  /** A coupon checked with checkCoupon; null removes it. */
  setCoupon(coupon: AppliedCoupon | null) {
    write({ coupon });
  },
  /** After an order is placed: the cart and its coupon are done with. */
  clear() {
    write({ items: [], coupon: null });
  },
};

/**
 * The shopping cart, priced against the current catalogue and the customer's coupon. `items` (the lines
 * that can be shown) and `priced` are null during server rendering and the
 * first client render, then the stored cart.
 */
export function useCart() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const catalogue = useCatalogue();
  const priced = useMemo(
    // The coupon's dates were checked by the server, not this device's clock (see couponRunning).
    () => (state ? priceCart(state.items, catalogue, state.coupon, null) : null),
    [state, catalogue]
  );
  const items = useMemo(() => priced?.lines.map((line) => line.item) ?? null, [priced]);
  return {
    items,
    priced,
    /** The coupon as the customer entered it, even if it takes nothing off this cart. */
    coupon: state?.coupon ?? null,
    count: priced?.count ?? 0,
    ...actions,
  };
}
