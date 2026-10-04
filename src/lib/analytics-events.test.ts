import { describe, expect, test } from "bun:test";

import { batCartItem, gearCartItem, priceCart, priceCartItem } from "@/lib/cart";
import { findStoreBat, findStoreGear, seedProductRows, standardBatConfig, toStoreCatalogue } from "@/lib/products/model";

import { cartEvent, purchaseEvent, viewItemEvent } from "./analytics-events";

const catalogue = toStoreCatalogue(
  seedProductRows().map((row) => (row.slug === "goat" ? { ...row, sizes: ["6", "SH", "LH"] } : row))
);
const goat = findStoreBat(catalogue, "goat")!;
const helmet = findStoreGear(catalogue, "helmets", "club-cricket-helmet")!;

describe("a product viewed", () => {
  test("is the product at the price shown", () => {
    expect(viewItemEvent({ slug: "goat", name: "G.O.A.T", category: "Bats", price: 16499 })).toEqual({
      currency: "INR",
      value: 16499,
      items: [{ item_id: "goat", item_name: "Astaad G.O.A.T", item_brand: "Astaad", item_category: "Bats", price: 16499, quantity: 1 }],
    });
  });

  test("is named as the cart names it, so a product's steps add up", () => {
    const line = priceCartItem(batCartItem(goat), catalogue)!;
    const viewed = viewItemEvent({ slug: goat.slug, name: goat.name, category: "Bats", price: goat.price });
    expect(viewed.items[0].item_name).toBe(line.name);
    expect(viewed.items[0].item_id).toBe(cartEvent([line]).items[0].item_id);
  });

  test("names the size the address chose", () => {
    const event = viewItemEvent({ slug: "goat", name: "G.O.A.T", category: "Bats", price: 7999, size: "6" });
    expect(event.items[0]).toMatchObject({ item_id: "goat", item_variant: "6", price: 7999 });
  });
});

describe("cart lines", () => {
  test("a bat added: its product, its size as the variant, its price in rupees", () => {
    const line = priceCartItem(batCartItem(goat, { ...standardBatConfig(goat), size: "LH" }), catalogue)!;
    expect(cartEvent([line])).toEqual({
      currency: "INR",
      value: 16499,
      items: [
        { item_id: "goat", item_name: line.name, item_brand: "Astaad", item_category: "Bats", item_variant: "LH", price: 16499, quantity: 1 },
      ],
    });
  });

  test("gear is filed under its category, with its size and hand", () => {
    const line = priceCartItem(gearCartItem(helmet), catalogue)!;
    const [item] = cartEvent([line]).items;
    expect(item).toMatchObject({ item_id: "club-cricket-helmet", item_category: "Helmets", price: helmet.price, quantity: 1 });
    expect(item.item_variant).toBe(line.variant || undefined);
  });

  test("a whole cart adds up price times quantity", () => {
    const priced = priceCart([batCartItem(goat, standardBatConfig(goat), 2), gearCartItem(helmet)], catalogue, null, null);
    const event = cartEvent(priced.lines);
    expect(event.value).toBe(priced.subtotalPaise / 100);
    expect(event.items.map((item) => item.quantity)).toEqual([2, 1]);
  });
});

describe("an order paid", () => {
  const order = {
    number: 10019,
    totalPaise: 1859800,
    shippingPaise: 9900,
    couponCode: "EARLY5",
    items: [
      { productKind: "bat" as const, productSlug: "goat", productName: "G.O.A.T", variant: "SH", unitPricePaise: 1649900, quantity: 1 },
      { productKind: "gear" as const, productSlug: "legacy-pro-helmet", productName: "Legacy Pro Helmet", variant: "Large", unitPricePaise: 199900, quantity: 1 },
      { productKind: "gear" as const, productSlug: "old-kitbag", productName: "Old Kitbag", variant: null, unitPricePaise: 100, quantity: 1 },
    ],
  };

  test("carries the order's number, what the items cost, delivery and the coupon", () => {
    const event = purchaseEvent(order, { "legacy-pro-helmet": "Helmets" });
    expect(event).toMatchObject({ transaction_id: "AST-10019", currency: "INR", value: 18499, shipping: 99, coupon: "EARLY5" });
    expect(event.items).toEqual([
      { item_id: "goat", item_name: "G.O.A.T", item_brand: "Astaad", item_category: "Bats", item_variant: "SH", price: 16499, quantity: 1 },
      { item_id: "legacy-pro-helmet", item_name: "Legacy Pro Helmet", item_brand: "Astaad", item_category: "Helmets", item_variant: "Large", price: 1999, quantity: 1 },
      // No longer on the store, and sold one way.
      { item_id: "old-kitbag", item_name: "Old Kitbag", item_brand: "Astaad", item_category: "Gear", price: 1, quantity: 1 },
    ]);
  });

  test("no coupon, no coupon field; nothing about the customer", () => {
    const event = purchaseEvent({ ...order, couponCode: null });
    expect(event).not.toHaveProperty("coupon");
    expect(Object.keys(event).sort()).toEqual(["currency", "items", "shipping", "transaction_id", "value"]);
  });
});
