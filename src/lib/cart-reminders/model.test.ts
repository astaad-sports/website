import { describe, expect, test } from "bun:test";

import type { OrderItem } from "@/db/schema";
import { seedProductRows, toStoreCatalogue, type ProductWithImages, type StoreCatalogue } from "@/lib/products/model";

import { linesFromCart, linesFromOrder } from "./model";

function catalogueWith(changes: Record<string, Partial<ProductWithImages>> = {}): StoreCatalogue {
  return toStoreCatalogue(seedProductRows().map((row) => ({ ...row, ...changes[row.slug] })));
}

const seeded = catalogueWith();
const gloves = { kind: "gear" as const, slug: "elite-batting-gloves", options: { size: "Men’s", hand: "Left hand" as const }, quantity: 2 };
const helmet = { kind: "gear" as const, slug: "club-cricket-helmet", options: { size: "XL" }, quantity: 1 };

describe("linesFromCart", () => {
  test("each line at today's price, linked to its product, with its choices", () => {
    expect(linesFromCart([gloves], seeded)).toEqual([
      {
        name: "Astaad Elite Batting Gloves",
        href: "/shop/batting-gloves/elite-batting-gloves",
        details: "Men’s · Left hand",
        quantity: 2,
        linePaise: 999_800,
      },
    ]);
  });

  test("leaves out what can't be bought now: a sold-out product, or one no longer sold", () => {
    const soldOut = catalogueWith({ "club-cricket-helmet": { stock: 0, availability: "out_of_stock" } });
    expect(linesFromCart([gloves, helmet], soldOut).map((line) => line.details)).toEqual(["Men’s · Left hand"]);
    expect(linesFromCart([{ ...helmet, slug: "no-such-helmet" }], seeded)).toEqual([]);
  });
});

describe("linesFromOrder", () => {
  const item = (slug: string, kind: "bat" | "gear" = "gear"): OrderItem => ({
    id: "item-1",
    orderId: "order-1",
    productKind: kind,
    productSlug: slug,
    productName: "As it was named at checkout",
    options: [
      { label: "Size", value: "XL" },
      { label: "Grille", value: "Steel" },
    ],
    variant: "XL",
    unitPricePaise: 699_900,
    quantity: 1,
    lineTotalPaise: 699_900,
    offer: null,
  } as OrderItem);

  test("the line as the guest saw it at checkout, linked to the product as the cart links it", () => {
    expect(linesFromOrder([item("club-cricket-helmet")], seeded)).toEqual([
      {
        name: "As it was named at checkout",
        href: "/shop/helmets/club-cricket-helmet",
        details: "XL · Steel",
        quantity: 1,
        linePaise: 699_900,
      },
    ]);
    expect(linesFromOrder([item("run-machine", "bat")], seeded)[0].href).toBe("/bats/run-machine");
  });

  test("leaves out a product that is sold out or gone", () => {
    const soldOut = catalogueWith({ "club-cricket-helmet": { stock: 0, availability: "out_of_stock" } });
    expect(linesFromOrder([item("club-cricket-helmet")], soldOut)).toEqual([]);
    expect(linesFromOrder([item("no-such-helmet")], seeded)).toEqual([]);
  });
});
