import { describe, expect, test } from "bun:test";

import type { BatCustomization } from "@/db/schema";
import { BAT_WEIGHTS, DEFAULT_BAT_CONFIG } from "@/lib/catalogue";

import {
  batCounts,
  batsInSubcategory,
  builderBat,
  countInWords,
  entryBat,
  findStoreBat,
  findStoreGear,
  FULL_CUSTOMIZATION,
  gearInCategory,
  gearLine,
  kitGear,
  listInWords,
  NO_CUSTOMIZATION,
  normaliseCustomization,
  offeredWeightGroups,
  seedProductRows,
  standardBatConfig,
  startingBatConfig,
  startingWeight,
  stockNote,
  toStoreCatalogue,
  type ProductWithImages,
  type StoreCatalogue,
} from "./model";

/** The seeded catalogue, with some products changed the way an admin would. */
function catalogueWith(changes: Record<string, Partial<ProductWithImages>> = {}): StoreCatalogue {
  return toStoreCatalogue(seedProductRows().map((row) => ({ ...row, ...changes[row.slug] })));
}

const seeded = catalogueWith();
const slugs = (products: { slug: string }[]) => products.map((product) => product.slug);

describe("finding products", () => {
  test("a visible bat or gear product is found by slug", () => {
    expect(findStoreBat(seeded, "goat")?.name).toBe("G.O.A.T");
    expect(findStoreGear(seeded, "helmets", "club-cricket-helmet")?.name).toBe("Club Cricket Helmet");
  });

  test("hidden, unknown or misfiled products are not found", () => {
    const hidden = catalogueWith({ goat: { availability: "hidden" } });
    expect(findStoreBat(hidden, "goat")).toBeUndefined();
    expect(findStoreBat(seeded, "no-such-bat")).toBeUndefined();
    expect(findStoreGear(seeded, "batting-pads", "club-cricket-helmet")).toBeUndefined();
  });

  test("out-of-stock products are still found", () => {
    const out = catalogueWith({ goat: { availability: "out_of_stock" } });
    expect(findStoreBat(out, "goat")?.soldOut).toBe(true);
  });

  test("category and subcategory lists keep catalogue order and skip hidden products", () => {
    expect(slugs(gearInCategory(seeded, "helmets"))).toEqual([
      "club-cricket-helmet",
      "pro-cricket-helmet",
      "elite-cricket-helmet",
    ]);
    const hidden = catalogueWith({ "pro-cricket-helmet": { availability: "hidden" } });
    expect(slugs(gearInCategory(hidden, "helmets"))).toEqual(["club-cricket-helmet", "elite-cricket-helmet"]);
    expect(batsInSubcategory(seeded, "english-willow")).toHaveLength(6);
    expect(batsInSubcategory(seeded, "kashmir-willow")).toHaveLength(0);
  });

  test("bats are counted by subcategory, leaving out hidden ones", () => {
    expect(batCounts(seeded)).toEqual({ "english-willow": 6, "kashmir-willow": 0, "tennis-bats": 0 });
    const ranges = catalogueWith({
      "run-machine": { subcategory: "kashmir-willow" },
      "combat-pro": { subcategory: "kashmir-willow", availability: "hidden" },
      "black-edition": { subcategory: "tennis-bats", availability: "out_of_stock" },
    });
    expect(slugs(batsInSubcategory(ranges, "kashmir-willow"))).toEqual(["run-machine"]);
    expect(slugs(batsInSubcategory(ranges, "tennis-bats"))).toEqual(["black-edition"]);
    expect(batCounts(ranges)).toEqual({ "english-willow": 3, "kashmir-willow": 1, "tennis-bats": 1 });
  });
});

describe("complete your kit", () => {
  test("one featured product per gear category, gloves first", () => {
    expect(slugs(kitGear(seeded))).toEqual([
      "elite-batting-gloves",
      "pro-batting-pads",
      "club-cricket-helmet",
      "pro-cricket-kitbag",
    ]);
  });

  test("the category being browsed is left out", () => {
    expect(slugs(kitGear(seeded, "helmets"))).toEqual(["elite-batting-gloves", "pro-batting-pads", "pro-cricket-kitbag"]);
  });

  test("a hidden featured product gives way to the next one in its category", () => {
    const hidden = catalogueWith({ "club-cricket-helmet": { availability: "hidden" } });
    expect(slugs(kitGear(hidden))).toContain("pro-cricket-helmet");
  });

  test("a category with nothing visible is skipped", () => {
    const allHidden = Object.fromEntries(
      slugs(gearInCategory(seeded, "cricket-kitbags")).map((slug) => [slug, { availability: "hidden" as const }])
    );
    expect(slugs(kitGear(catalogueWith(allHidden)))).toEqual([
      "elite-batting-gloves",
      "pro-batting-pads",
      "club-cricket-helmet",
    ]);
  });
});

describe("featured bats", () => {
  test("the entry English willow bat is the cheapest one", () => {
    expect(entryBat(seeded)?.slug).toBe("run-machine");
    expect(entryBat(catalogueWith({ "run-machine": { availability: "hidden" } }))?.slug).toBe("combat-pro");
  });

  test("the home builder shows the dearest customisable bat on sale", () => {
    expect(builderBat(seeded)?.slug).toBe("legacy-one");
    expect(builderBat(catalogueWith({ "legacy-one": { stock: 0 } }))?.slug).toBe("the-godfather");
    expect(builderBat(catalogueWith({ "legacy-one": { customization: NO_CUSTOMIZATION } }))?.slug).toBe("the-godfather");
  });

  test("when every customisable bat is sold out, the dearest is still shown", () => {
    const allOut = Object.fromEntries(
      slugs(seeded.bats).map((slug) => [slug, { availability: "out_of_stock" as const }])
    );
    expect(builderBat(catalogueWith(allOut))?.slug).toBe("legacy-one");
  });

  test("no customisable bat, no builder", () => {
    const none = Object.fromEntries(slugs(seeded.bats).map((slug) => [slug, { customization: NO_CUSTOMIZATION }]));
    expect(builderBat(catalogueWith(none))).toBeUndefined();
  });
});

describe("the builder's starting choices", () => {
  test("a bat with every option starts on the usual build", () => {
    expect(startingBatConfig(FULL_CUSTOMIZATION)).toEqual(DEFAULT_BAT_CONFIG);
  });

  test("an option the bat does not offer moves to the first one it does", () => {
    const config = startingBatConfig({
      ...FULL_CUSTOMIZATION,
      weights: ["1180–1220 g"],
      profiles: ["Mid to Low", "Full Spine"],
      handles: ["Round", "Oval"],
    });
    // Indexes into the full lists: weight 2 of 3, profile 1 of 3, handle stays on Oval (2).
    expect(config.weight).toBe(2);
    expect(config.profile).toBe(1);
    expect(config.handle).toBe(2);
    expect(config.size).toBe(DEFAULT_BAT_CONFIG.size);
  });

  test("knocking and the scuff sheet start off when the bat does not offer them", () => {
    const config = startingBatConfig({ ...FULL_CUSTOMIZATION, matchReady: false, scuffSheet: false });
    expect(config.knock).toBe(false);
    expect(config.scuff).toBe(false);
  });

  test("a standard bat keeps only the size", () => {
    const config = startingBatConfig(NO_CUSTOMIZATION, { ...DEFAULT_BAT_CONFIG, name: "RAHUL" });
    expect(config).toMatchObject({ name: "", knock: false, scuff: false, size: DEFAULT_BAT_CONFIG.size });
  });

  test("the toe starts semi-round, or on the first toe the bat offers", () => {
    expect(startingBatConfig(FULL_CUSTOMIZATION).toe).toBe(1);
    expect(startingBatConfig({ ...FULL_CUSTOMIZATION, toes: ["Flat"] }).toe).toBe(2);
  });

  test("the weight is chosen among the ranges of the build's size", () => {
    // Balanced in every size: the index means the same whichever size is chosen.
    expect(startingBatConfig(FULL_CUSTOMIZATION, { ...DEFAULT_BAT_CONFIG, size: "6" }).weight).toBe(1);
    expect(startingWeight(FULL_CUSTOMIZATION, "H", 2)).toBe(2);
    // Only the heavy Size 6 range offered: Size 6 starts there, SH stays balanced, Harrow (nothing offered) stays put.
    const heavyJunior = { ...FULL_CUSTOMIZATION, weights: ["1000–1025 g", ...BAT_WEIGHTS.map((option) => option.label)] };
    expect(startingWeight(heavyJunior, "6", 1)).toBe(2);
    expect(startingWeight(heavyJunior, "SH", 1)).toBe(1);
    expect(startingWeight(heavyJunior, "H", 1)).toBe(1);
  });

  test("a standard build in the first size that can be bought takes that size's weight", () => {
    // Only Size 6 left: the standard build is a Size 6 bat, in its heavy range (the one offered).
    const heavyJunior = { ...FULL_CUSTOMIZATION, weights: ["1000–1025 g", ...BAT_WEIGHTS.map((option) => option.label)] };
    const goat = findStoreBat(
      catalogueWith({ goat: { stock: 2, variantStock: { "6": 2, H: 0, SH: 0, LH: 0 }, customization: heavyJunior } }),
      "goat"
    )!;
    expect(standardBatConfig(goat)).toMatchObject({ size: "6", weight: 2 });
    expect(standardBatConfig(findStoreBat(seeded, "goat")!)).toMatchObject({ size: "SH", weight: 1 });
  });
});

describe("weight ranges by size", () => {
  test("the ranges of every size are kept, in size order", () => {
    const custom = normaliseCustomization({ ...FULL_CUSTOMIZATION, weights: ["1150–1180 g", "975–1000 g", "900 g"] });
    expect(custom.weights).toEqual(["975–1000 g", "1150–1180 g"]);
  });

  test("the ranges a bat offers are grouped by the sizes it is sold in", () => {
    expect(offeredWeightGroups(findStoreBat(seeded, "goat")!).map((group) => group.name)).toEqual(["Size 6", "Harrow", "SH and LH"]);
    const shOnly = findStoreBat(catalogueWith({ goat: { sizes: ["SH"] } }), "goat")!;
    expect(offeredWeightGroups(shOnly)).toEqual([{ name: "SH", weights: BAT_WEIGHTS.map((option) => option.label) }]);
    // Nothing offered in Size 6 or Harrow: those groups are left out.
    const balancedOnly = findStoreBat(catalogueWith({ goat: { customization: { ...FULL_CUSTOMIZATION, weights: ["1150–1180 g"] } } }), "goat")!;
    expect(offeredWeightGroups(balancedOnly)).toEqual([{ name: "SH and LH", weights: ["1150–1180 g"] }]);
  });
});

describe("toe shapes on saved bats", () => {
  const savedBeforeToes: Partial<BatCustomization> = { ...FULL_CUSTOMIZATION };
  delete savedBeforeToes.toes;

  test("a build saved before toe shapes existed offers every toe", () => {
    expect(normaliseCustomization(savedBeforeToes).toes).toEqual(["Round", "Semi Round", "Flat"]);
  });

  test("a saved choice keeps only known toes, and may offer none", () => {
    expect(normaliseCustomization({ ...savedBeforeToes, toes: ["Flat", "Pointed"] }).toes).toEqual(["Flat"]);
    expect(normaliseCustomization({ ...savedBeforeToes, toes: [] }).toes).toEqual([]);
  });
});

describe("drafts", () => {
  test("a product with no price is never on the store, whatever its availability", () => {
    const draft = catalogueWith({ goat: { pricePaise: 0, availability: "available" } });
    expect(findStoreBat(draft, "goat")).toBeUndefined();
    expect(findStoreBat(seeded, "goat")).toBeDefined();
  });
});

describe("ratings on the cards", () => {
  test("a product carries its rating from the context, and one nobody reviewed has none", () => {
    const rows = seedProductRows();
    const goat = rows.find((row) => row.slug === "goat")!;
    const catalogue = toStoreCatalogue(rows, { ratings: { [goat.id]: { average: 4.5, count: 2 } } });
    expect(findStoreBat(catalogue, "goat")?.rating).toEqual({ average: 4.5, count: 2 });
    expect(findStoreBat(catalogue, "run-machine")?.rating).toBeNull();
    expect(catalogue.gear.every((product) => product.rating === null)).toBe(true);
  });
});

describe("words on the page", () => {
  test("low stock with a count reads Only N left", () => {
    const low = findStoreBat(catalogueWith({ goat: { stock: 2 } }), "goat")!;
    expect(low.stockStatus).toBe("low");
    expect(stockNote(low)).toBe("Only 2 left");
  });

  test("in stock, uncounted or sold out has no note", () => {
    expect(stockNote(findStoreBat(seeded, "goat")!)).toBeNull();
    expect(stockNote(findStoreBat(catalogueWith({ goat: { stock: 20 } }), "goat")!)).toBeNull();
    expect(stockNote(findStoreBat(catalogueWith({ goat: { stock: 0 } }), "goat")!)).toBeNull();
  });

  test("a gear line leaves out what is missing", () => {
    expect(gearLine({ line: "Elite", note: "Pro sheepskin palm" })).toBe("Elite · Pro sheepskin palm");
    expect(gearLine({ line: "Elite", note: undefined })).toBe("Elite");
    expect(gearLine({ line: "", note: "Wheelie" })).toBe("Wheelie");
  });

  test("counts up to twelve are words", () => {
    expect(countInWords(6)).toBe("Six");
    expect(countInWords(1)).toBe("One");
    expect(countInWords(12)).toBe("Twelve");
    expect(countInWords(13)).toBe("13");
  });

  test("lists read naturally", () => {
    expect(listInWords(["Round", "Semi Oval", "Oval"], "or")).toBe("Round, Semi Oval or Oval");
    expect(listInWords(["a", "b"])).toBe("a and b");
    expect(listInWords(["a"])).toBe("a");
    expect(listInWords([])).toBe("");
  });
});

describe("the builder's photo", () => {
  test("the face photo is engraved, or the first one", () => {
    const photos = [
      { url: "/angled.webp", position: 0 },
      { url: "/back.webp", position: 1 },
      { url: "/face.webp", position: 2, face: true },
    ];
    expect(findStoreBat(catalogueWith({ goat: { images: photos } }), "goat")!.faceImage).toBe("/face.webp");
    expect(findStoreBat(catalogueWith({ goat: { images: photos.slice(0, 2) } }), "goat")!.faceImage).toBe("/angled.webp");
    expect(findStoreBat(seeded, "goat")!.faceImage).toBe(findStoreBat(seeded, "goat")!.images[0]);
  });
});
