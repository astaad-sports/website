import { describe, expect, test } from "bun:test";

import { normaliseSku, parseCount, parseProductForm, parseRupees, productColumns } from "./editor";
import { availabilityForSave, availabilityForStock, FULL_CUSTOMIZATION, NO_CUSTOMIZATION, stockStatus } from "./model";

function form(fields: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    for (const entry of Array.isArray(value) ? value : [value]) data.append(name, entry);
  }
  return data;
}

const BAT = {
  name: "Run Machine",
  category: "bats",
  subcategory: "english-willow",
  grade: "Grade 4 English Willow",
  price: "7,699",
  mrp: "₹ 10,999",
  sizes: ["6", "H", "SH", "LH"],
  lowStockThreshold: "3",
  sku: "ast-rm g4",
  availability: "available",
  customEnabled: "on",
  customWeights: FULL_CUSTOMIZATION.weights,
  customProfiles: FULL_CUSTOMIZATION.profiles,
  customToes: FULL_CUSTOMIZATION.toes,
  customHandles: FULL_CUSTOMIZATION.handles,
  customEngraving: "on",
  customMatchReady: "on",
  customScuffSheet: "on",
};

describe("the product editor's fields", () => {
  test("a full English willow bat parses into paise, a clean SKU and its build options", () => {
    const parsed = parseProductForm(form(BAT));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.values).toMatchObject({
      kind: "bat",
      pricePaise: 769_900,
      mrpPaise: 1_099_900,
      sizes: ["6", "H", "SH", "LH"],
      hands: false,
      stock: null,
      variantStock: {},
      sku: "AST-RM-G4",
      customization: FULL_CUSTOMIZATION,
    });
  });

  test("a bat is sold in the sizes ticked, and each has its own count", () => {
    const parsed = parseProductForm(form({ ...BAT, sizes: ["LH", "SH", "XXL"], "stock:SH": "2", "stock:LH": "" }));
    expect(parsed.ok && parsed.values).toMatchObject({ sizes: ["SH", "LH"], stock: 2, variantStock: { SH: 2, LH: 0 } });

    const one = parseProductForm(form({ ...BAT, sizes: ["SH"], stock: "4", "stock:SH": "9" }));
    expect(one.ok && one.values).toMatchObject({ sizes: ["SH"], stock: 4, variantStock: {} });

    const none = parseProductForm(form({ ...BAT, sizes: [] }));
    expect(!none.ok && none.fieldErrors.sizes).toBe("Pick at least one size.");
  });

  test("a bat size can have a price and MRP of its own", () => {
    const parsed = parseProductForm(
      form({ ...BAT, "sizePrice:6": "6,999", "sizeMrp:6": "₹ 10,999", "sizePrice:H": "8499", "sizePrice:XL": "1" })
    );
    expect(parsed.ok && parsed.values.sizePrices).toEqual({
      "6": { pricePaise: 699_900, mrpPaise: 1_099_900 },
      H: { pricePaise: 849_900, mrpPaise: null },
    });
  });

  test("the bat's own price and MRP on a size is no price of its own, and one size needs none", () => {
    const same = parseProductForm(form({ ...BAT, "sizePrice:LH": "7699", "sizeMrp:LH": "10999" }));
    expect(same.ok && same.values.sizePrices).toEqual({});
    const one = parseProductForm(form({ ...BAT, sizes: ["SH"], "sizePrice:SH": "5000" }));
    expect(one.ok && one.values.sizePrices).toEqual({});
  });

  test("a size's price is checked like the bat's", () => {
    const errorFor = (fields: Record<string, string>) => {
      const parsed = parseProductForm(form({ ...BAT, ...fields }));
      return parsed.ok ? null : parsed.fieldErrors.sizePrices;
    };
    expect(errorFor({ "sizeMrp:6": "10999" })).toBe("Size 6: enter its price, or clear its MRP.");
    expect(errorFor({ "sizePrice:6": "69.99" })).toBe("Size 6: enter the price in whole rupees, for example 6999.");
    expect(errorFor({ "sizePrice:H": "8499", "sizeMrp:H": "8000" })).toBe("H / Harrow: the MRP can't be lower than the price.");
  });

  test("gear has one price", () => {
    const parsed = parseProductForm(
      form({
        name: "Legacy Pro Helmet",
        category: "helmets",
        price: "2499",
        lowStockThreshold: "3",
        availability: "available",
        sizes: ["Medium", "Large"],
        "sizePrice:Medium": "1999",
      })
    );
    expect(parsed.ok && parsed.values.sizePrices).toEqual({});
  });

  test("with every count empty the product is not counted; a bad one is reported", () => {
    const uncounted = parseProductForm(form({ ...BAT, "stock:SH": "", "stock:LH": " " }));
    expect(uncounted.ok && uncounted.values).toMatchObject({ stock: null, variantStock: {} });
    const bad = parseProductForm(form({ ...BAT, "stock:SH": "2", "stock:LH": "1.5" }));
    expect(!bad.ok && Object.keys(bad.fieldErrors)).toEqual(["stock"]);
  });

  test("tennis bats come in their own two sizes", () => {
    const parsed = parseProductForm(
      form({ ...BAT, subcategory: "tennis-bats", sizes: ["FS", "SH", "LH"], "stock:FS": "1", "stock:SH": "3" })
    );
    expect(parsed.ok && parsed.values).toMatchObject({
      sizes: ["FS", "SH"],
      stock: 4,
      variantStock: { FS: 1, SH: 3 },
      customization: NO_CUSTOMIZATION,
    });
  });

  test("gloves are counted by hand, helmets by size; only pads and gloves have hands", () => {
    const gloves = parseProductForm(
      form({
        name: "Falcon Pro Gloves",
        category: "batting-gloves",
        price: "1899",
        lowStockThreshold: "3",
        availability: "available",
        sizes: ["Men’s"],
        hands: "on",
        "stock:Men’s|Right hand": "2",
        "stock:Men’s|Left hand": "1",
      })
    );
    expect(gloves.ok && gloves.values).toMatchObject({
      sizes: ["Men’s"],
      hands: true,
      stock: 3,
      variantStock: { "Men’s|Right hand": 2, "Men’s|Left hand": 1 },
    });

    const helmet = parseProductForm(
      form({
        name: "Legacy Pro Helmet",
        category: "helmets",
        price: "2499",
        lowStockThreshold: "3",
        availability: "available",
        sizes: ["Medium", "Large", "XL"],
        hands: "on",
        "stock:Medium": "2",
        "stock:XL": "3",
      })
    );
    expect(helmet.ok && helmet.values).toMatchObject({
      sizes: ["Medium", "Large", "XL"],
      hands: false,
      stock: 5,
      variantStock: { Medium: 2, Large: 0, XL: 3 },
    });
  });

  test("customisation is only kept for English willow", () => {
    const parsed = parseProductForm(form({ ...BAT, subcategory: "kashmir-willow" }));
    expect(parsed.ok && parsed.values.customization).toEqual(NO_CUSTOMIZATION);
  });

  test("each size a bat is sold in needs a weight range of its own", () => {
    const fullSize = ["1120–1150 g", "1150–1180 g", "1180–1220 g"];
    const parsed = parseProductForm(form({ ...BAT, customWeights: fullSize }));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.fieldErrors.customization).toBe("Pick at least one weight for Size 6 and H / Harrow.");
    const shOnly = parseProductForm(form({ ...BAT, sizes: ["SH", "LH"], customWeights: fullSize }));
    expect(shOnly.ok && shOnly.values.customization?.weights).toEqual(fullSize);
    const oneEach = parseProductForm(form({ ...BAT, customWeights: ["975–1000 g", "1075–1100 g", "1150–1180 g"] }));
    expect(oneEach.ok).toBe(true);
  });

  test("an enabled build needs a weight, a profile and a handle", () => {
    const parsed = parseProductForm(form({ ...BAT, customWeights: [] }));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.fieldErrors.customization).toContain("at least one weight");
  });

  test("the toe is optional: none ticked means no toe choice", () => {
    const parsed = parseProductForm(form({ ...BAT, customToes: [] }));
    expect(parsed.ok && parsed.values.customization?.toes).toEqual([]);
    const some = parseProductForm(form({ ...BAT, customToes: ["Flat", "Round", "Pointed"] }));
    expect(some.ok && some.values.customization?.toes).toEqual(["Round", "Flat"]);
  });

  test("missing and malformed fields are reported one by one", () => {
    const parsed = parseProductForm(
      form({ ...BAT, name: " ", price: "76.99", mrp: "500", "stock:SH": "-2", sku: "A/B", availability: "sold" })
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(Object.keys(parsed.fieldErrors).sort()).toEqual(["availability", "name", "price", "sku", "stock"]);
  });

  test("the MRP can't be below the price", () => {
    const parsed = parseProductForm(form({ ...BAT, mrp: "5000" }));
    expect(!parsed.ok && parsed.fieldErrors.mrp).toBe("The MRP can't be lower than the price.");
  });

  test("the short description takes a few sentences, up to 500 characters", () => {
    expect(parseProductForm(form({ ...BAT, shortDescription: "a".repeat(500) })).ok).toBe(true);
    const tooLong = parseProductForm(form({ ...BAT, shortDescription: "a".repeat(501) }));
    expect(!tooLong.ok && tooLong.fieldErrors.shortDescription).toBe("Keep this under 500 characters.");
  });

  test("a bat needs its willow type; gear has none and keeps its short note as `note`", () => {
    const bat = parseProductForm(form({ ...BAT, subcategory: "" }));
    expect(!bat.ok && bat.fieldErrors.subcategory).toBe("Choose the willow type.");

    const gear = parseProductForm(
      form({
        name: "Elite Batting Gloves",
        category: "batting-gloves",
        subcategory: "english-willow",
        line: "Elite",
        shortDescription: "Pro sheepskin palm",
        grade: "ignored",
        price: "4999",
        stock: "6",
        lowStockThreshold: "2",
        availability: "available",
        customEnabled: "on",
      })
    );
    expect(gear.ok).toBe(true);
    if (!gear.ok) return;
    // No sizes ticked and no hand: sold one way, with one count.
    expect(gear.values).toMatchObject({ kind: "gear", subcategory: null, grade: null, customization: null, stock: 6, sizes: [], hands: false });
    expect(productColumns(gear.values)).toMatchObject({ note: "Pro sheepskin palm", shortDescription: null, line: "Elite" });
    expect(productColumns(gear.values)).not.toHaveProperty("kind");
  });
});

describe("number fields", () => {
  test("rupees accept the ₹ sign, commas and .00 but no paise", () => {
    expect(parseRupees("₹ 7,699")).toBe(7699);
    expect(parseRupees("7699.00")).toBe(7699);
    expect(parseRupees("")).toBeNull();
    expect(parseRupees("76.99")).toBeNaN();
  });

  test("counts are whole numbers; empty means not counted", () => {
    expect(parseCount("12")).toBe(12);
    expect(parseCount(" ")).toBeNull();
    expect(parseCount("1.5")).toBeNaN();
    expect(parseCount("-1")).toBeNaN();
  });

  test("SKUs are upper case with dashes for spaces", () => {
    expect(normaliseSku(" ast rm-g4 ")).toBe("AST-RM-G4");
  });
});

describe("stock and availability", () => {
  const product = (availability: "available" | "out_of_stock" | "hidden", stock: number | null) => ({
    availability,
    stock,
    lowStockThreshold: 3,
  });

  test("the label follows hidden, then out of stock by hand, then the count", () => {
    expect(stockStatus(product("hidden", 0))).toBe("hidden");
    expect(stockStatus(product("out_of_stock", 9))).toBe("out");
    expect(stockStatus(product("available", null))).toBe("in");
    expect(stockStatus(product("available", 0))).toBe("out");
    expect(stockStatus(product("available", 2))).toBe("low");
    expect(stockStatus(product("available", 3))).toBe("in");
  });

  test("selling the last one marks it out of stock; restocking brings it back", () => {
    expect(availabilityForStock("available", 1, 0)).toBe("out_of_stock");
    expect(availabilityForStock("out_of_stock", 0, 10)).toBe("available");
    expect(availabilityForStock("out_of_stock", null, 10)).toBe("available");
    expect(availabilityForStock("hidden", 0, 10)).toBe("hidden");
    expect(availabilityForStock("available", null, null)).toBe("available");
  });

  test("marking out of stock by hand survives a count change that isn't a restock", () => {
    expect(availabilityForStock("out_of_stock", 5, 6)).toBe("out_of_stock");
  });

  test("in the editor, a choice just made wins, except available with no stock", () => {
    expect(availabilityForSave("out_of_stock", "available", 0, 10)).toBe("out_of_stock");
    expect(availabilityForSave("available", "out_of_stock", 0, 0)).toBe("out_of_stock");
    expect(availabilityForSave("available", null, null, 0)).toBe("out_of_stock");
    expect(availabilityForSave("out_of_stock", null, null, 5)).toBe("out_of_stock");
    // An untouched choice follows the stock rules; one the admin picked again stays.
    expect(availabilityForSave("out_of_stock", "out_of_stock", 0, 4)).toBe("available");
    expect(availabilityForSave("out_of_stock", "out_of_stock", 0, 4, true)).toBe("out_of_stock");
    expect(availabilityForSave("available", "available", 3, 0, true)).toBe("out_of_stock");
  });
});
