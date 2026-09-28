import { describe, expect, test } from "bun:test";

import { findStoreBat, findStoreGear, seedProductRows, standardBatConfig, toStoreCatalogue, type ProductWithImages } from "./model";
import {
  countedStock,
  countsFor,
  defaultOffered,
  hasVariantOut,
  otherPrices,
  productVariants,
  sameCounts,
  sizeOptions,
  sizePrice,
  sizePricesFor,
  sizeSoldOut,
  startingVariant,
  stockColumns,
  returnToCounts,
  takeFromCounts,
  variantCounts,
  variantNote,
} from "./variants";

const row = (slug: string, changes: Partial<ProductWithImages> = {}): ProductWithImages => ({
  ...seedProductRows().find((entry) => entry.slug === slug)!,
  ...changes,
});
const keys = (product: ProductWithImages) => productVariants(product).map((variant) => variant.key);
const labels = (product: ProductWithImages) => productVariants(product).map((variant) => variant.label);

describe("what a product is sold in", () => {
  test("each kind of product has its own sizes to pick from", () => {
    expect(sizeOptions("bats", "english-willow").map((size) => size.code)).toEqual(["6", "H", "SH", "LH"]);
    expect(sizeOptions("bats", "kashmir-willow").map((size) => size.code)).toEqual(["6", "H", "SH", "LH"]);
    expect(sizeOptions("bats", "tennis-bats").map((size) => [size.label, size.hint])).toEqual([
      ["Full Size", "35 inches long"],
      ["SH / Standard", "33.5 inches long"],
    ]);
    expect(sizeOptions("helmets", null).map((size) => size.code)).toEqual(["Small", "Medium", "Large", "XL"]);
    expect(sizeOptions("cricket-kitbags", null)).toEqual([]);
  });

  test("a new product starts with its kind's usual sizes", () => {
    expect(defaultOffered("bats", "english-willow")).toEqual({ sizes: ["SH"], hands: false });
    expect(defaultOffered("bats", "kashmir-willow")).toEqual({ sizes: ["SH"], hands: false });
    expect(defaultOffered("bats", "tennis-bats")).toEqual({ sizes: ["FS", "SH"], hands: false });
    expect(defaultOffered("batting-gloves", null)).toEqual({ sizes: ["Men’s"], hands: true });
    expect(defaultOffered("batting-pads", null)).toEqual({ sizes: ["Men’s"], hands: true });
    expect(defaultOffered("helmets", null)).toEqual({ sizes: ["Medium", "Large", "XL"], hands: false });
    expect(defaultOffered("cricket-kitbags", null)).toEqual({ sizes: [], hands: false });
  });

  test("a variant is one size and hand; with one size the hand alone names it", () => {
    const gloves = row("elite-batting-gloves");
    expect(keys(gloves)).toEqual(["Men’s|Right hand", "Men’s|Left hand"]);
    expect(labels(gloves)).toEqual(["Right hand", "Left hand"]);
    expect(labels(row("pro-batting-pads"))).toEqual(["Right hand", "Left hand"]);
    const pads = row("pro-batting-pads", { sizes: ["Boys", "Youth", "Men’s"] });
    expect(labels(pads)).toEqual([
      "Boys · Right hand",
      "Boys · Left hand",
      "Youth · Right hand",
      "Youth · Left hand",
      "Men’s · Right hand",
      "Men’s · Left hand",
    ]);
    expect(keys(row("club-cricket-helmet"))).toEqual(["Medium", "Large", "XL"]);
    expect(labels(row("run-machine"))).toEqual(["Size 6", "H / Harrow", "SH / Full Size", "LH / Long Handle"]);
    expect(productVariants(row("pro-cricket-kitbag"))).toEqual([{ key: "", size: null, sizeLabel: null, hand: null, label: "" }]);
  });

  test("unknown sizes are dropped, a bat always has a size, and only pads and gloves have hands", () => {
    expect(keys(row("club-cricket-helmet", { sizes: ["XL", "Huge", "Medium"], hands: true }))).toEqual(["Medium", "XL"]);
    expect(keys(row("run-machine", { sizes: [] }))).toEqual(["SH"]);
    expect(keys(row("run-machine", { sizes: ["FS"] }))).toEqual(["SH"]);
    expect(keys(row("elite-batting-gloves", { sizes: [], hands: true }))).toEqual(["Right hand", "Left hand"]);
  });
});

describe("stock by size and hand", () => {
  test("an uncounted product has no counts", () => {
    expect(variantCounts(row("club-cricket-helmet"))).toBeNull();
    expect(countedStock(row("club-cricket-helmet"))).toBeNull();
  });

  test("each variant has its count; one without has 0, and they add up", () => {
    const helmet = row("club-cricket-helmet", { stock: 5, variantStock: { Medium: 2, XL: 3, Small: 9 } });
    expect(variantCounts(helmet)).toEqual({ Medium: 2, Large: 0, XL: 3 });
    expect(countedStock(helmet)).toBe(5);
  });

  test("a product sold one way keeps its count in stock alone", () => {
    expect(variantCounts(row("pro-cricket-kitbag", { stock: 4 }))).toEqual({ "": 4 });
    expect(stockColumns(row("pro-cricket-kitbag"), { "": 4 })).toEqual({ stock: 4, variantStock: {} });
    expect(variantCounts(row("run-machine", { sizes: ["SH"], stock: 2 }))).toEqual({ SH: 2 });
  });

  test("a count taken before the product had sizes is of its usual one", () => {
    expect(variantCounts(row("run-machine", { stock: 2 }))).toEqual({ "6": 0, H: 0, SH: 2, LH: 0 });
    expect(variantCounts(row("elite-batting-gloves", { stock: 1 }))).toEqual({ "Men’s|Right hand": 1, "Men’s|Left hand": 0 });
    expect(variantCounts(row("club-cricket-helmet", { stock: 3 }))).toEqual({ Medium: 3, Large: 0, XL: 0 });
  });

  test("the columns to store: the total, and each count of a product sold in several", () => {
    const helmet = row("club-cricket-helmet");
    expect(stockColumns(helmet, { Medium: 2, XL: 3 })).toEqual({ stock: 5, variantStock: { Medium: 2, Large: 0, XL: 3 } });
    expect(stockColumns(helmet, null)).toEqual({ stock: null, variantStock: {} });
    expect(countsFor(helmet, { Medium: 1.9, Large: -2, Small: 4 })).toEqual({ Medium: 1, Large: 0, XL: 0 });
  });

  test("counts are the same only with the same variants and numbers", () => {
    expect(sameCounts(null, null)).toBe(true);
    expect(sameCounts(null, { SH: 0 })).toBe(false);
    expect(sameCounts({ Medium: 2, Large: 0 }, { Large: 0, Medium: 2 })).toBe(true);
    expect(sameCounts({ Medium: 2, Large: 0 }, { Medium: 2 })).toBe(false);
    expect(sameCounts({ Medium: 2 }, { Medium: 1 })).toBe(false);
  });

  test("a size that ran out while others are on sale is flagged", () => {
    expect(hasVariantOut({ Medium: 2, Large: 0, XL: 3 })).toBe(true);
    expect(hasVariantOut({ Medium: 2, Large: 1 })).toBe(false);
    expect(hasVariantOut({ Medium: 0, Large: 0 })).toBe(false);
    expect(hasVariantOut(null)).toBe(false);
  });
});

describe("prices by size", () => {
  const SIZE_PRICES = {
    "6": { pricePaise: 699_900, mrpPaise: 1_099_900 },
    H: { pricePaise: 849_900, mrpPaise: 1_399_900 },
  };
  const blackEdition = row("black-edition", { sizePrices: SIZE_PRICES });

  test("a size with a price of its own costs that; the others cost the bat's price", () => {
    expect(sizePrice(blackEdition, "6")).toEqual({ pricePaise: 699_900, mrpPaise: 1_099_900 });
    expect(sizePrice(blackEdition, "SH")).toEqual({ pricePaise: blackEdition.pricePaise, mrpPaise: blackEdition.mrpPaise });
    expect(sizePrice(blackEdition, "LH")).toEqual({ pricePaise: blackEdition.pricePaise, mrpPaise: blackEdition.mrpPaise });
  });

  test("only sizes the bat is sold in, with a real price and an MRP no lower, are kept", () => {
    const messy = row("black-edition", {
      sizes: ["6", "SH", "LH"],
      sizePrices: {
        "6": { pricePaise: 699_900, mrpPaise: 500_000 },
        H: { pricePaise: 849_900, mrpPaise: null },
        SH: { pricePaise: 0, mrpPaise: null },
        LH: { pricePaise: 12.5, mrpPaise: null },
      },
    });
    expect(sizePricesFor(messy)).toEqual({ "6": { pricePaise: 699_900, mrpPaise: null } });
    expect(sizePricesFor(row("club-cricket-helmet", { sizePrices: { Medium: { pricePaise: 100_000, mrpPaise: null } } }))).toEqual({});
  });

  test("the store prices each size, and an offer takes its percentage off each", () => {
    const rows = seedProductRows().map((entry) => (entry.slug === "black-edition" ? blackEdition : entry));
    const plain = findStoreBat(toStoreCatalogue(rows), "black-edition")!;
    const prices = (bat: typeof plain) => bat.variants.map((variant) => [variant.size, variant.price, variant.mrp, variant.off]);
    expect(prices(plain)).toEqual([
      ["6", 6999, 10999, 36],
      ["H", 8499, 13999, 39],
      ["SH", plain.price, plain.mrp, plain.off],
      ["LH", plain.price, plain.mrp, plain.off],
    ]);
    expect(otherPrices(plain).map((variant) => variant.size)).toEqual(["6", "H"]);

    const now = new Date("2026-10-15T06:00:00Z");
    const offer = {
      name: "Diwali Sale",
      percentOff: 10,
      scope: "store" as const,
      categories: [],
      productIds: [],
      code: null,
      startsAt: new Date("2026-10-01T00:00:00Z"),
      endsAt: new Date("2026-10-31T00:00:00Z"),
    };
    const onOffer = findStoreBat(toStoreCatalogue(rows, { offers: [offer], now }), "black-edition")!;
    const six = onOffer.variants.find((variant) => variant.size === "6")!;
    expect([six.regularPrice, six.price]).toEqual([6999, 6299]);
    expect(onOffer.regularPrice).toBe(plain.price);
  });
});

describe("putting a cancelled order back in stock", () => {
  test("it goes back to the size that was bought", () => {
    const counts = { Medium: 0, Large: 1, XL: 3 };
    expect(returnToCounts(counts, "Medium", 2)).toBe(true);
    expect(counts).toEqual({ Medium: 2, Large: 1, XL: 3 });
  });

  test("an order that names no size goes back only to a product with a single count", () => {
    const one = { SH: 0 };
    expect(returnToCounts(one, null, 1)).toBe(true);
    expect(returnToCounts(one, "Small", 1)).toBe(true);
    expect(one).toEqual({ SH: 2 });
    const several = { Medium: 1, Large: 0 };
    expect(returnToCounts(several, null, 1)).toBe(false);
    expect(returnToCounts(several, "Small", 1)).toBe(false);
    expect(returnToCounts(several, "Large", 0)).toBe(false);
    expect(several).toEqual({ Medium: 1, Large: 0 });
  });
});

describe("taking an order out of stock", () => {
  test("it comes out of the size that was bought, never below 0", () => {
    const counts = { Medium: 2, Large: 0, XL: 3 };
    expect(takeFromCounts(counts, "XL", 2)).toBe(0);
    expect(takeFromCounts(counts, "Medium", 3)).toBe(1);
    expect(takeFromCounts(counts, "Large", 1)).toBe(1);
    expect(counts).toEqual({ Medium: 0, Large: 0, XL: 1 });
  });

  test("an order that names no size (or one no longer sold) comes out of whichever has the most", () => {
    const counts = { Medium: 1, Large: 0, XL: 3 };
    expect(takeFromCounts(counts, null, 2)).toBe(0);
    expect(counts).toEqual({ Medium: 1, Large: 0, XL: 1 });
    expect(takeFromCounts(counts, "Small", 3)).toBe(1);
    expect(counts).toEqual({ Medium: 0, Large: 0, XL: 0 });
  });
});

describe("on the store", () => {
  const catalogueWith = (changes: Record<string, Partial<ProductWithImages>>) =>
    toStoreCatalogue(seedProductRows().map((entry) => ({ ...entry, ...changes[entry.slug] })));

  test("a picker starts on the usual size and hand", () => {
    const catalogue = catalogueWith({});
    expect(startingVariant(findStoreBat(catalogue, "goat")!).key).toBe("SH");
    expect(startingVariant(findStoreGear(catalogue, "helmets", "club-cricket-helmet")!).key).toBe("Medium");
    expect(startingVariant(findStoreGear(catalogue, "batting-gloves", "elite-batting-gloves")!).key).toBe("Men’s|Right hand");
    expect(startingVariant(findStoreGear(catalogue, "cricket-kitbags", "pro-cricket-kitbag")!).key).toBe("");
  });

  test("when the usual one has run out, it starts on the first that can be bought", () => {
    const catalogue = catalogueWith({
      goat: { stock: 1, variantStock: { LH: 1 } },
      "club-cricket-helmet": { stock: 3, variantStock: { XL: 3 } },
      "pro-batting-pads": {
        sizes: ["Boys", "Youth", "Men’s"],
        stock: 3,
        variantStock: { "Boys|Right hand": 2, "Men’s|Left hand": 1 },
      },
    });
    const goat = findStoreBat(catalogue, "goat")!;
    expect(startingVariant(goat).key).toBe("LH");
    expect(standardBatConfig(goat).size).toBe("LH");
    expect(sizeSoldOut(goat, "SH")).toBe(true);
    expect(sizeSoldOut(goat, "LH")).toBe(false);
    expect(startingVariant(findStoreGear(catalogue, "helmets", "club-cricket-helmet")!).key).toBe("XL");
    // The usual size in the other hand comes before another size.
    expect(startingVariant(findStoreGear(catalogue, "batting-pads", "pro-batting-pads")!).key).toBe("Men’s|Left hand");
  });

  test("with SH gone, a size at the bat's price comes before one with a price of its own", () => {
    const catalogue = catalogueWith({
      goat: {
        stock: 3,
        variantStock: { "6": 2, LH: 1 },
        sizePrices: { "6": { pricePaise: 799_900, mrpPaise: 1_299_900 } },
      },
    });
    expect(startingVariant(findStoreBat(catalogue, "goat")!).key).toBe("LH");
  });

  test("a product with nothing left starts on the usual one all the same", () => {
    const catalogue = catalogueWith({ goat: { stock: 0, availability: "out_of_stock" } });
    const goat = findStoreBat(catalogue, "goat")!;
    expect(goat.soldOut).toBe(true);
    expect(startingVariant(goat).key).toBe("SH");
  });

  test("the chosen size says when it is running low or has run out", () => {
    const catalogue = catalogueWith({ "club-cricket-helmet": { stock: 12, variantStock: { Medium: 2, XL: 10 } } });
    const helmet = findStoreGear(catalogue, "helmets", "club-cricket-helmet")!;
    const variant = (size: string) => helmet.variants.find((entry) => entry.size === size);
    expect(helmet.stockStatus).toBe("in");
    expect(variantNote(helmet, variant("Medium"))).toBe("Only 2 left");
    expect(variantNote(helmet, variant("Large"))).toBe("Out of stock");
    expect(variantNote(helmet, variant("XL"))).toBeNull();
  });
});
