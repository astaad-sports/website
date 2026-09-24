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
  lineProblemText,
  priceCart as priceCartIn,
  priceCartItem as priceCartItemIn,
  withResolvedToe,
  type CartItem,
} from "./cart";
import { DEFAULT_BAT_CONFIG, getBat, getGear } from "./catalogue";
import {
  FULL_CUSTOMIZATION,
  NO_CUSTOMIZATION,
  seedProductRows,
  toStoreCatalogue,
  type ProductWithImages,
  type StoreCatalogue,
} from "./products/model";

const runMachine = getBat("run-machine")!;
const eliteGloves = getGear("elite-batting-gloves")!;
const kitbag = getGear("pro-cricket-kitbag")!;

/** The seeded catalogue, with some products changed the way an admin would. */
function catalogueWith(changes: Record<string, Partial<ProductWithImages>> = {}): StoreCatalogue {
  return toStoreCatalogue(seedProductRows().map((row) => ({ ...row, ...changes[row.slug] })));
}

const seeded = catalogueWith();
const priceCart = (items: CartItem[], catalogue = seeded) => priceCartIn(items, catalogue);
const priceCartItem = (item: CartItem, catalogue = seeded) => priceCartItemIn(item, catalogue);

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

describe("stock", () => {
  test("an uncounted product can be bought in any quantity", () => {
    const cart = priceCart([batCartItem("run-machine", DEFAULT_BAT_CONFIG, MAX_QUANTITY)]);
    expect(cart.unavailable).toBe(0);
    expect(cart.lines[0].stockLeft).toBeNull();
  });

  test("a sold-out product stays in the cart but cannot be bought", () => {
    const catalogue = catalogueWith({ "run-machine": { stock: 0, availability: "out_of_stock" } });
    const cart = priceCart([batCartItem("run-machine"), gearCartItem(kitbag)], catalogue);
    expect(cart.lines).toHaveLength(2);
    expect(cart.unavailable).toBe(1);
    expect(cart.lines[0].problem).toBe("sold_out");
    expect(lineProblemText(cart.lines[0])).toBe("Out of stock. Remove it to check out.");
  });

  test("marking a product out of stock by hand works even with stock left", () => {
    const catalogue = catalogueWith({ "run-machine": { stock: 5, availability: "out_of_stock" } });
    expect(priceCartItem(batCartItem("run-machine"), catalogue)!.problem).toBe("sold_out");
  });

  test("different builds of one bat share its stock", () => {
    const catalogue = catalogueWith({ "run-machine": { stock: 2 } });
    const cart = priceCart(
      [batCartItem("run-machine"), batCartItem("run-machine", { ...DEFAULT_BAT_CONFIG, size: 3 }, 2)],
      catalogue
    );
    expect(cart.lines.map((line) => line.problem)).toEqual(["not_enough", "not_enough"]);
    expect(lineProblemText(cart.lines[0])).toBe("Only 2 left in total. Remove one to check out.");
    expect(lineProblemText(cart.lines[1])).toBe("Only 2 left in total. Remove one to check out.");

    const tooMany = priceCart([batCartItem("run-machine", DEFAULT_BAT_CONFIG, 3)], catalogue);
    expect(lineProblemText(tooMany.lines[0])).toBe("Only 2 left. Lower the quantity to check out.");

    const fits = priceCart([batCartItem("run-machine"), batCartItem("run-machine", { ...DEFAULT_BAT_CONFIG, size: 3 })], catalogue);
    expect(fits.unavailable).toBe(0);
  });

  test("a hidden product is no longer sold", () => {
    const catalogue = catalogueWith({ "run-machine": { availability: "hidden" } });
    const cart = priceCart([batCartItem("run-machine")], catalogue);
    expect(cart.lines).toHaveLength(0);
    expect(cart.invalid).toBe(1);
  });
});

describe("a bat sells only the build options it offers", () => {
  const plain = catalogueWith({ "run-machine": { customization: NO_CUSTOMIZATION } });
  const plainBat = plain.bats.find((bat) => bat.slug === "run-machine")!;

  test("without customisation only the size is chosen", () => {
    const item = batCartItem("run-machine", { ...DEFAULT_BAT_CONFIG, name: "virat", knock: true }, 1, plainBat.customization);
    expect(item.options).toMatchObject({ weight: "", profile: "", handle: "", engraving: "", knocking: false, scuffSheet: false });
    const line = priceCartItem(item, plain)!;
    expect(line.options.map((option) => option.label)).toEqual(["Willow", "Size"]);
    expect(line.summary).toBe("SH / Full Size");
  });

  test("a customised build of a bat that no longer offers it is refused", () => {
    expect(priceCartItem(batCartItem("run-machine"), plain)).toBeNull();
  });

  test("an option the bat does not offer is refused", () => {
    const noEngraving = catalogueWith({
      "run-machine": { customization: { ...seeded.bats[0].customization, engraving: false } },
    });
    expect(priceCartItem(batCartItem("run-machine", { ...DEFAULT_BAT_CONFIG, name: "virat" }), noEngraving)).toBeNull();
    const bat = noEngraving.bats.find((entry) => entry.slug === "run-machine")!;
    const item = batCartItem("run-machine", { ...DEFAULT_BAT_CONFIG, name: "virat" }, 1, bat.customization);
    expect(item.options.engraving).toBe("");
    expect(priceCartItem(item, noEngraving)).not.toBeNull();
  });
});

describe("toe shapes", () => {
  test("the chosen toe is recorded on the line, semi-round by default", () => {
    const standard = priceCartItem(batCartItem("run-machine"))!;
    expect(standard.item.options).toMatchObject({ toe: "Semi Round" });
    expect(standard.options).toContainEqual({ label: "Toe", value: "Semi Round" });

    const flat = priceCartItem(batCartItem("run-machine", { ...DEFAULT_BAT_CONFIG, toe: 2 }))!;
    expect(flat.options).toContainEqual({ label: "Toe", value: "Flat" });
    expect(flat.summary).toContain("Flat toe");
  });

  test("a cart saved before toe shapes existed still prices, with the usual toe", () => {
    const options = { ...batCartItem("run-machine").options };
    delete options.toe;
    const line = priceCartItem({ kind: "bat", slug: "run-machine", options, quantity: 1 })!;
    expect(line).not.toBeNull();
    expect(line.options).toContainEqual({ label: "Toe", value: "Semi Round" });
  });

  test("a saved bat without a toe merges with the same build added now", () => {
    const options = { ...batCartItem("run-machine").options };
    delete options.toe;
    const saved: CartItem = { kind: "bat", slug: "run-machine", options, quantity: 1 };
    const resolved = withResolvedToe(saved, seeded);
    expect(resolved.kind === "bat" && resolved.options.toe).toBe("Semi Round");
    const items = addToItems([resolved], batCartItem("run-machine"));
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
    expect(withResolvedToe(batCartItem("run-machine", { ...DEFAULT_BAT_CONFIG, toe: 2 }), seeded)).toEqual(
      batCartItem("run-machine", { ...DEFAULT_BAT_CONFIG, toe: 2 })
    );
  });

  test("a toe the bat does not offer is refused, and a bat with none has no toe", () => {
    const roundOnly = catalogueWith({ "run-machine": { customization: { ...FULL_CUSTOMIZATION, toes: ["Round"] } } });
    expect(priceCartItem(batCartItem("run-machine", { ...DEFAULT_BAT_CONFIG, toe: 2 }), roundOnly)).toBeNull();

    const noToes = catalogueWith({ "run-machine": { customization: { ...FULL_CUSTOMIZATION, toes: [] } } });
    const bat = noToes.bats.find((entry) => entry.slug === "run-machine")!;
    const item = batCartItem("run-machine", DEFAULT_BAT_CONFIG, 1, bat.customization);
    expect(item.options.toe).toBeUndefined();
    expect(priceCartItem(item, noToes)!.options.map((option) => option.label)).not.toContain("Toe");
  });
});
