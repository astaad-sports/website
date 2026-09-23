import { describe, expect, test } from "bun:test";

import {
  addToItems,
  batCartItem,
  cartItemSchema,
  cleanEngravingInput,
  gearCartItem,
  lineKey,
  MAX_QUANTITY,
  normaliseEngraving,
  priceCart,
  priceCartItem,
  type CartItem,
} from "./cart";
import { DEFAULT_BAT_CONFIG, getBat, getGear } from "./catalogue";

const runMachine = getBat("run-machine")!;
const eliteGloves = getGear("elite-batting-gloves")!;
const kitbag = getGear("pro-cricket-kitbag")!;

describe("pricing comes from the catalogue", () => {
  test("a standard bat costs its catalogue price, in paise", () => {
    const line = priceCartItem(batCartItem("run-machine"))!;
    expect(line.unitPricePaise).toBe(runMachine.price * 100);
    expect(line.name).toBe("Astaad Run Machine");
    expect(line.summary).toContain("SH / Full Size");
  });

  test("customisation is free: engraving does not change the price", () => {
    const engraved = priceCartItem(batCartItem("run-machine", { ...DEFAULT_BAT_CONFIG, name: "virat" }))!;
    expect(engraved.unitPricePaise).toBe(runMachine.price * 100);
    expect(engraved.options).toContainEqual({ label: "Engraving", value: "VIRAT" });
  });

  test("a cart totals its lines, with free delivery", () => {
    const cart = priceCart([batCartItem("run-machine", DEFAULT_BAT_CONFIG, 2), gearCartItem(eliteGloves)]);
    const expected = (runMachine.price * 2 + eliteGloves.price) * 100;
    expect(cart.subtotalPaise).toBe(expected);
    expect(cart.shippingPaise).toBe(0);
    expect(cart.totalPaise).toBe(expected);
    expect(cart.count).toBe(3);
    expect(cart.invalid).toBe(0);
  });

  test("a price sent by the browser is ignored", () => {
    const tampered = { ...batCartItem("run-machine"), price: 1, unitPricePaise: 100 } as unknown as CartItem;
    const parsed = cartItemSchema.parse(tampered);
    expect(priceCartItem(parsed)!.unitPricePaise).toBe(runMachine.price * 100);
  });
});

describe("items must match the catalogue", () => {
  test("unknown products and options are dropped and counted", () => {
    const standard = batCartItem("run-machine");
    const cart = priceCart([
      { ...standard, slug: "no-such-bat" },
      { ...standard, options: { ...standard.options, size: "XXL" } },
      { ...standard, options: { ...standard.options, weight: "900 g" } },
      { ...standard, options: { ...standard.options, engraving: "lower case" } },
      standard,
    ]);
    expect(cart.lines).toHaveLength(1);
    expect(cart.invalid).toBe(4);
  });

  test("gloves need a size and hand; a kitbag takes neither", () => {
    expect(priceCartItem(gearCartItem(eliteGloves))!.summary).toBe("Men’s · Right hand");
    expect(priceCartItem({ kind: "gear", slug: eliteGloves.slug, options: {}, quantity: 1 })).toBeNull();
    expect(priceCartItem(gearCartItem(kitbag))!.options).toEqual([]);
    expect(priceCartItem({ kind: "gear", slug: kitbag.slug, options: { size: "Large" }, quantity: 1 })).toBeNull();
  });

  test("quantities outside 1 to 10 fail validation", () => {
    expect(cartItemSchema.safeParse({ ...batCartItem("run-machine"), quantity: 0 }).success).toBe(false);
    expect(cartItemSchema.safeParse({ ...batCartItem("run-machine"), quantity: 11 }).success).toBe(false);
    expect(cartItemSchema.safeParse({ ...batCartItem("run-machine"), quantity: 1.5 }).success).toBe(false);
  });
});

describe("engraving", () => {
  test("is upper case, supported characters only, at most 15", () => {
    expect(normaliseEngraving("  virat   kohli 18 ")).toBe("VIRAT KOHLI 18");
    expect(normaliseEngraving("rohit!! 🏏 45")).toBe("ROHIT 45");
    expect(normaliseEngraving("a".repeat(20))).toHaveLength(15);
  });

  test("the input box drops unsupported characters as you type", () => {
    expect(cleanEngravingInput("Dhoni 7 🏏!")).toBe("Dhoni 7 ");
  });
});

describe("adding to the cart", () => {
  test("the same build merges into one line, up to the quantity cap", () => {
    let items: CartItem[] = [];
    for (let i = 0; i < 12; i += 1) items = addToItems(items, batCartItem("run-machine"));
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(MAX_QUANTITY);
  });

  test("a different build is its own line", () => {
    const items = addToItems([batCartItem("run-machine")], batCartItem("run-machine", { ...DEFAULT_BAT_CONFIG, size: 3 }));
    expect(items).toHaveLength(2);
    expect(lineKey(items[0])).not.toBe(lineKey(items[1]));
  });
});
