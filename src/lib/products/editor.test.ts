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
  stock: "",
  lowStockThreshold: "3",
  sku: "ast-rm g4",
  availability: "available",
  customEnabled: "on",
  customWeights: FULL_CUSTOMIZATION.weights,
  customProfiles: FULL_CUSTOMIZATION.profiles,
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
      stock: null,
      sku: "AST-RM-G4",
      customization: FULL_CUSTOMIZATION,
    });
  });

  test("customisation is only kept for English willow", () => {
    const parsed = parseProductForm(form({ ...BAT, subcategory: "kashmir-willow" }));
    expect(parsed.ok && parsed.values.customization).toEqual(NO_CUSTOMIZATION);
  });

  test("an enabled build needs a weight, a profile and a handle", () => {
    const parsed = parseProductForm(form({ ...BAT, customWeights: [] }));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.fieldErrors.customization).toContain("at least one weight");
  });

  test("missing and malformed fields are reported one by one", () => {
    const parsed = parseProductForm(
      form({ ...BAT, name: " ", price: "76.99", mrp: "500", stock: "-2", sku: "A/B", availability: "sold" })
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(Object.keys(parsed.fieldErrors).sort()).toEqual(["availability", "name", "price", "sku", "stock"]);
  });

  test("the MRP can't be below the price", () => {
    const parsed = parseProductForm(form({ ...BAT, mrp: "5000" }));
    expect(!parsed.ok && parsed.fieldErrors.mrp).toBe("The MRP can't be lower than the price.");
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
    expect(gear.values).toMatchObject({ kind: "gear", subcategory: null, grade: null, customization: null, stock: 6 });
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
    // An unchanged choice follows the stock rules.
    expect(availabilityForSave("out_of_stock", "out_of_stock", 0, 4)).toBe("available");
  });
});
