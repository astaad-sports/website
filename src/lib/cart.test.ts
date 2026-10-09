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
import type { BatConfig } from "./catalogue";
import {
  FULL_CUSTOMIZATION,
  NO_CUSTOMIZATION,
  seedProductRows,
  standardBatConfig,
  toStoreCatalogue,
  type ProductWithImages,
  type StoreCatalogue,
} from "./products/model";

/** The seeded catalogue, with some products changed the way an admin would. */
function catalogueWith(changes: Record<string, Partial<ProductWithImages>> = {}): StoreCatalogue {
  return toStoreCatalogue(seedProductRows().map((row) => ({ ...row, ...changes[row.slug] })));
}

const seeded = catalogueWith();
const batIn = (catalogue: StoreCatalogue, slug = "run-machine") => catalogue.bats.find((bat) => bat.slug === slug)!;
const gearIn = (catalogue: StoreCatalogue, slug: string) => catalogue.gear.find((product) => product.slug === slug)!;

const runMachine = batIn(seeded);
const eliteGloves = gearIn(seeded, "elite-batting-gloves");
const helmet = gearIn(seeded, "club-cricket-helmet");
const kitbag = gearIn(seeded, "pro-cricket-kitbag");

/** A Run Machine from `catalogue`, in its standard build with these choices changed. */
function build(config: Partial<BatConfig> = {}, qty = 1, catalogue = seeded) {
  const bat = batIn(catalogue);
  return batCartItem(bat, { ...standardBatConfig(bat), ...config }, qty);
}
const priceCart = (items: CartItem[], catalogue = seeded) => priceCartIn(items, catalogue);
const priceCartItem = (item: CartItem, catalogue = seeded) => priceCartItemIn(item, catalogue);

describe("pricing comes from the catalogue", () => {
  test("a standard bat costs its catalogue price, in paise", () => {
    const line = priceCartItem(build())!;
    expect(line.unitPricePaise).toBe(runMachine.price * 100);
    expect(line.name).toBe("Astaad Run Machine");
    expect(line.summary).toContain("SH / Full Size");
  });

  test("customisation is free: engraving does not change the price", () => {
    const engraved = priceCartItem(build({ name: "virat" }))!;
    expect(engraved.unitPricePaise).toBe(runMachine.price * 100);
    expect(engraved.options).toContainEqual({ label: "Engraving", value: "VIRAT" });
  });

  test("a cart totals its lines, with free delivery", () => {
    const cart = priceCart([build({}, 2), gearCartItem(eliteGloves)]);
    const expected = (runMachine.price * 2 + eliteGloves.price) * 100;
    expect(cart.subtotalPaise).toBe(expected);
    expect(cart.shippingPaise).toBe(0);
    expect(cart.totalPaise).toBe(expected);
    expect(cart.count).toBe(3);
    expect(cart.invalid).toBe(0);
  });

  test("a price sent by the browser is ignored", () => {
    const tampered = { ...build(), price: 1, unitPricePaise: 100 } as unknown as CartItem;
    const parsed = cartItemSchema.parse(tampered);
    expect(priceCartItem(parsed)!.unitPricePaise).toBe(runMachine.price * 100);
  });
});

describe("weight ranges by size", () => {
  const goat = batIn(seeded, "goat");

  test("a bat in Size 6 or Harrow takes that size's ranges", () => {
    const size6 = batCartItem(goat, { ...standardBatConfig(goat), size: "6" });
    expect(size6.options).toMatchObject({ size: "6", weight: "975–1000 g" });
    expect(priceCartItem(size6)!.summary).toContain("Size 6 · 975–1000 g");
    expect(batCartItem(goat, { ...standardBatConfig(goat), size: "H", weight: 2 }).options.weight).toBe("1100–1120 g");
  });

  test("a full-size range on a Size 6 bat is not a build the bat offers", () => {
    const size6 = batCartItem(goat, { ...standardBatConfig(goat), size: "6" });
    expect(priceCartItem({ ...size6, options: { ...size6.options, weight: "1150–1180 g" } })).toBeNull();
  });

  test("a range the bat does not offer in a size falls back to one it does", () => {
    const heavyJunior = catalogueWith({ goat: { customization: { ...FULL_CUSTOMIZATION, weights: ["1000–1025 g", "1150–1180 g"] } } });
    const bat = batIn(heavyJunior, "goat");
    expect(batCartItem(bat, { ...standardBatConfig(bat), size: "6", weight: 1 }).options.weight).toBe("1000–1025 g");
    // Nothing offered in Harrow: no weight, so it is not a build the bat sells.
    const harrow = batCartItem(bat, { ...standardBatConfig(bat), size: "H" });
    expect(harrow.options.weight).toBe("");
    expect(priceCartItem(harrow, heavyJunior)).toBeNull();
  });
});

describe("items must match the catalogue", () => {
  test("unknown products and options are dropped and counted", () => {
    const standard = build();
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

  test("a product sells only the sizes and hands ticked for it", () => {
    // Gloves come in Men's only; helmets in Medium, Large and XL, with no hand.
    const gloves = (size: string) => ({ kind: "gear" as const, slug: eliteGloves.slug, options: { size, hand: "Left hand" as const }, quantity: 1 });
    expect(priceCartItem(gloves("Men’s"))!.summary).toBe("Men’s · Left hand");
    expect(priceCartItem(gloves("Boys"))).toBeNull();
    const helmetIn = (size: string) => ({ kind: "gear" as const, slug: helmet.slug, options: { size }, quantity: 1 });
    expect(priceCartItem(helmetIn("XL"))!.summary).toBe("XL");
    expect(priceCartItem(helmetIn("Small"))).toBeNull();
    expect(priceCartItem({ ...helmetIn("Medium"), options: { size: "Medium", hand: "Right hand" } })).toBeNull();

    const shOnly = catalogueWith({ "run-machine": { sizes: ["SH"] } });
    expect(priceCartItem(build({ size: "SH" }), shOnly)!.summary).toContain("SH / Full Size");
    expect(priceCartItem({ ...build(), options: { ...build().options, size: "LH" } }, shOnly)).toBeNull();
    // A size the bat is not sold in falls back to the one it is.
    expect(build({ size: "LH" }, 1, shOnly).options.size).toBe("SH");
  });

  test("a size with a price of its own is charged that price", () => {
    const priced = catalogueWith({
      "run-machine": { sizePrices: { "6": { pricePaise: 399_900, mrpPaise: 599_900 } } },
    });
    const six = priceCartItem(build({ size: "6" }, 2, priced), priced)!;
    expect(six.unitPricePaise).toBe(399_900);
    expect(six.regularUnitPricePaise).toBe(399_900);
    expect(six.lineTotalPaise).toBe(799_800);
    expect(priceCartItem(build({ size: "SH" }, 1, priced), priced)!.unitPricePaise).toBe(runMachine.price * 100);
    const cart = priceCart([build({ size: "6" }, 1, priced), build({ size: "LH" }, 1, priced)], priced);
    expect(cart.subtotalPaise).toBe(399_900 + runMachine.price * 100);
  });

  test("a tennis bat comes in two lengths and cannot be customised", () => {
    const tennis = catalogueWith({ "run-machine": { subcategory: "tennis-bats", sizes: ["FS", "SH"] } });
    const bat = batIn(tennis);
    expect(bat.customization.enabled).toBe(false);
    expect(bat.sizes.map((size) => size.label)).toEqual(["Full Size", "SH / Standard"]);
    expect(priceCartItem(batCartItem(bat), tennis)!.summary).toBe("SH / Standard");
    const full = priceCartItem(batCartItem(bat, { ...standardBatConfig(bat), size: "FS" }), tennis)!;
    expect(full.summary).toBe("Full Size");
    expect(full.unitPricePaise).toBe(priceCartItem(batCartItem(bat), tennis)!.unitPricePaise);
    expect(priceCartItem({ ...batCartItem(bat), options: { ...batCartItem(bat).options, size: "LH" } }, tennis)).toBeNull();
  });

  test("quantities outside 1 to 10 fail validation", () => {
    expect(cartItemSchema.safeParse({ ...build(), quantity: 0 }).success).toBe(false);
    expect(cartItemSchema.safeParse({ ...build(), quantity: 11 }).success).toBe(false);
    expect(cartItemSchema.safeParse({ ...build(), quantity: 1.5 }).success).toBe(false);
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
    for (let i = 0; i < 12; i += 1) items = addToItems(items, build());
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(MAX_QUANTITY);
  });

  test("a different build is its own line", () => {
    const items = addToItems([build()], build({ size: "LH" }));
    expect(items).toHaveLength(2);
    expect(lineKey(items[0])).not.toBe(lineKey(items[1]));
  });
});

describe("stock", () => {
  test("an uncounted product can be bought in any quantity", () => {
    const cart = priceCart([build({}, MAX_QUANTITY)]);
    expect(cart.unavailable).toBe(0);
    expect(cart.lines[0].stockLeft).toBeNull();
  });

  test("a sold-out product stays in the cart but cannot be bought", () => {
    const catalogue = catalogueWith({ "run-machine": { stock: 0, availability: "out_of_stock" } });
    const cart = priceCart([build(), gearCartItem(kitbag)], catalogue);
    expect(cart.lines).toHaveLength(2);
    expect(cart.unavailable).toBe(1);
    expect(cart.lines[0].problem).toBe("sold_out");
    expect(lineProblemText(cart.lines[0])).toBe("Out of stock. Remove it to check out.");
  });

  test("marking a product out of stock by hand works even with stock left", () => {
    const catalogue = catalogueWith({ "run-machine": { stock: 5, availability: "out_of_stock" } });
    expect(priceCartItem(build(), catalogue)!.problem).toBe("sold_out");
  });

  test("different builds of one bat in one size share that size's stock", () => {
    const catalogue = catalogueWith({ "run-machine": { stock: 3, variantStock: { SH: 2, LH: 1 } } });
    const cart = priceCart([build(), build({ name: "virat" }, 2)], catalogue);
    expect(cart.lines.map((line) => line.problem)).toEqual(["not_enough", "not_enough"]);
    expect(lineProblemText(cart.lines[0])).toBe("Only 2 left in total. Remove one to check out.");
    expect(lineProblemText(cart.lines[1])).toBe("Only 2 left in total. Remove one to check out.");

    const tooMany = priceCart([build({}, 3)], catalogue);
    expect(lineProblemText(tooMany.lines[0])).toBe("Only 2 left. Lower the quantity to check out.");

    const fits = priceCart([build({}, 2), build({ size: "LH" })], catalogue);
    expect(fits.unavailable).toBe(0);
    expect(fits.lines.map((line) => line.stockLeft)).toEqual([2, 1]);
  });

  test("each size has its own stock: one can run out while another is on sale", () => {
    const catalogue = catalogueWith({ "run-machine": { stock: 3, variantStock: { SH: 2, LH: 1 } } });
    expect(batIn(catalogue).soldOut).toBe(false);
    expect(priceCartItem(build({ size: "6" }), catalogue)!.problem).toBe("sold_out");
    expect(priceCartItem(build({ size: "LH" }, 2), catalogue)!.problem).toBe("not_enough");
    expect(priceCartItem(build({ size: "LH" }), catalogue)!.problem).toBeNull();
  });

  test("the left and right hand of a glove are counted apart", () => {
    const catalogue = catalogueWith({
      "elite-batting-gloves": { stock: 2, variantStock: { "Men’s|Right hand": 0, "Men’s|Left hand": 2 } },
    });
    const gloves = gearIn(catalogue, "elite-batting-gloves");
    expect(gloves.soldOut).toBe(false);
    const right = priceCartItem(gearCartItem(gloves, { hand: "Right hand" }), catalogue)!;
    expect(right.problem).toBe("sold_out");
    const left = priceCartItem(gearCartItem(gloves, { hand: "Left hand" }, 2), catalogue)!;
    expect(left.problem).toBeNull();
    expect(left.variant).toBe("Men’s|Left hand");
    // A card's cart button adds the hand that can be bought.
    expect(gearCartItem(gloves).options).toEqual({ size: "Men’s", hand: "Left hand" });
  });

  test("a helmet is counted by size", () => {
    const catalogue = catalogueWith({ "club-cricket-helmet": { stock: 5, variantStock: { Medium: 2, XL: 3 } } });
    const counted = gearIn(catalogue, "club-cricket-helmet");
    expect(counted.variants.map((variant) => [variant.size, variant.left])).toEqual([
      ["Medium", 2],
      ["Large", 0],
      ["XL", 3],
    ]);
    expect(priceCartItem(gearCartItem(counted, { size: "Large" }), catalogue)!.problem).toBe("sold_out");
    expect(priceCartItem(gearCartItem(counted, { size: "XL" }, 3), catalogue)!.problem).toBeNull();
    expect(priceCartItem(gearCartItem(counted, { size: "Medium" }, 3), catalogue)!.problem).toBe("not_enough");
  });

  test("a hidden product is no longer sold", () => {
    const catalogue = catalogueWith({ "run-machine": { availability: "hidden" } });
    const cart = priceCart([build()], catalogue);
    expect(cart.lines).toHaveLength(0);
    expect(cart.invalid).toBe(1);
  });
});

describe("a bat sells only the build options it offers", () => {
  const plain = catalogueWith({ "run-machine": { customization: NO_CUSTOMIZATION } });
  const plainBat = plain.bats.find((bat) => bat.slug === "run-machine")!;

  test("without customisation only the size is chosen", () => {
    const item = batCartItem(plainBat, { ...standardBatConfig(runMachine), name: "virat", knock: true });
    expect(item.options).toMatchObject({ weight: "", profile: "", handle: "", engraving: "", knocking: false, scuffSheet: false });
    const line = priceCartItem(item, plain)!;
    expect(line.options.map((option) => option.label)).toEqual(["Willow", "Size"]);
    expect(line.summary).toBe("SH / Full Size");
  });

  test("a customised build of a bat that no longer offers it is refused", () => {
    expect(priceCartItem(build(), plain)).toBeNull();
  });

  test("an option the bat does not offer is refused", () => {
    const noEngraving = catalogueWith({
      "run-machine": { customization: { ...seeded.bats[0].customization, engraving: false } },
    });
    expect(priceCartItem(build({ name: "virat" }), noEngraving)).toBeNull();
    const item = build({ name: "virat" }, 1, noEngraving);
    expect(item.options.engraving).toBe("");
    expect(priceCartItem(item, noEngraving)).not.toBeNull();
  });
});

describe("Full Spine is not made in the lightest range of any size", () => {
  // Weight 0 in SH is 1120–1150 g; profile 2 is Full Spine.
  test("a builder's light Full Spine goes in the cart as the first profile made in that weight", () => {
    expect(build({ weight: 0, profile: 2 }).options).toMatchObject({ weight: "1120–1150 g", profile: "Duckbill Players" });
    expect(build({ weight: 1, profile: 2 }).options).toMatchObject({ weight: "1150–1180 g", profile: "Full Spine" });
  });

  test("a cart line asking for it is refused", () => {
    const light = build({ weight: 0 });
    expect(priceCartItem(light)).not.toBeNull();
    expect(priceCartItem({ ...light, options: { ...light.options, profile: "Full Spine" } })).toBeNull();
  });

  test("nor in the lightest Size 6 and Harrow ranges, but in their others", () => {
    const goat = batIn(seeded, "goat");
    const fullSpine = (size: string, weight: number) =>
      batCartItem(goat, { ...standardBatConfig(goat), size, weight, profile: 2 }).options;
    expect(fullSpine("6", 0)).toMatchObject({ weight: "950–975 g", profile: "Duckbill Players" });
    expect(fullSpine("H", 0)).toMatchObject({ weight: "1050–1075 g", profile: "Duckbill Players" });
    expect(fullSpine("6", 1)).toMatchObject({ weight: "975–1000 g", profile: "Full Spine" });
    const harrow = batCartItem(goat, { ...standardBatConfig(goat), size: "H", weight: 1, profile: 2 });
    expect(priceCartItem(harrow)!.item.options).toMatchObject({ weight: "1075–1100 g", profile: "Full Spine" });
  });
});

describe("toe shapes", () => {
  test("the chosen toe is recorded on the line, semi-round by default", () => {
    const standard = priceCartItem(build())!;
    expect(standard.item.options).toMatchObject({ toe: "Semi Round" });
    expect(standard.options).toContainEqual({ label: "Toe", value: "Semi Round" });

    const flat = priceCartItem(build({ toe: 2 }))!;
    expect(flat.options).toContainEqual({ label: "Toe", value: "Flat" });
    expect(flat.summary).toContain("Flat toe");
  });

  test("a cart saved before toe shapes existed still prices, with the usual toe", () => {
    const options = { ...build().options };
    delete options.toe;
    const line = priceCartItem({ kind: "bat", slug: "run-machine", options, quantity: 1 })!;
    expect(line).not.toBeNull();
    expect(line.options).toContainEqual({ label: "Toe", value: "Semi Round" });
  });

  test("a saved bat without a toe merges with the same build added now", () => {
    const options = { ...build().options };
    delete options.toe;
    const saved: CartItem = { kind: "bat", slug: "run-machine", options, quantity: 1 };
    const resolved = withResolvedToe(saved, seeded);
    expect(resolved.kind === "bat" && resolved.options.toe).toBe("Semi Round");
    const items = addToItems([resolved], build());
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
    expect(withResolvedToe(build({ toe: 2 }), seeded)).toEqual(
      build({ toe: 2 })
    );
  });

  test("a toe the bat does not offer is refused, and a bat with none has no toe", () => {
    const roundOnly = catalogueWith({ "run-machine": { customization: { ...FULL_CUSTOMIZATION, toes: ["Round"] } } });
    expect(priceCartItem(build({ toe: 2 }), roundOnly)).toBeNull();

    const noToes = catalogueWith({ "run-machine": { customization: { ...FULL_CUSTOMIZATION, toes: [] } } });
    const item = build({}, 1, noToes);
    expect(item.options.toe).toBeUndefined();
    expect(priceCartItem(item, noToes)!.options.map((option) => option.label)).not.toContain("Toe");
  });
});
