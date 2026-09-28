import { describe, expect, test } from "bun:test";

import { seedProductRows, toStoreCatalogue } from "./products/model";
import { MAX_SAVED, parseWishlist, toggleSaved, wishlistEntries } from "./wishlist";

const catalogue = toStoreCatalogue(seedProductRows());
const bat = catalogue.bats[0];
const gear = catalogue.gear[0];

describe("parseWishlist", () => {
  test("keeps string ids once each, in order", () => {
    expect(parseWishlist(["a", "b", "a", "c"])).toEqual(["a", "b", "c"]);
  });

  test("drops anything that is not an id", () => {
    expect(parseWishlist(["a", 1, null, "", "x".repeat(65), { id: "b" }])).toEqual(["a"]);
  });

  test("reads a stored value that is not a list as empty", () => {
    expect(parseWishlist({ a: 1 })).toEqual([]);
    expect(parseWishlist(null)).toEqual([]);
  });

  test("keeps at most MAX_SAVED", () => {
    const ids = Array.from({ length: MAX_SAVED + 5 }, (_, index) => `id-${index}`);
    expect(parseWishlist(ids)).toHaveLength(MAX_SAVED);
  });
});

describe("toggleSaved", () => {
  test("saves a new id at the front", () => {
    expect(toggleSaved(["a", "b"], "c")).toEqual(["c", "a", "b"]);
  });

  test("takes out an id that was saved", () => {
    expect(toggleSaved(["a", "b", "c"], "b")).toEqual(["a", "c"]);
  });

  test("lets the oldest go past MAX_SAVED", () => {
    const ids = Array.from({ length: MAX_SAVED }, (_, index) => `id-${index}`);
    const next = toggleSaved(ids, "new");
    expect(next).toHaveLength(MAX_SAVED);
    expect(next[0]).toBe("new");
    expect(next).not.toContain(`id-${MAX_SAVED - 1}`);
  });
});

describe("wishlistEntries", () => {
  test("finds bats and gear in the saved order", () => {
    expect(wishlistEntries([gear.id, bat.id], catalogue)).toEqual([
      { kind: "gear", product: gear },
      { kind: "bat", product: bat },
    ]);
  });

  test("leaves out ids the store no longer shows", () => {
    expect(wishlistEntries(["gone", bat.id], catalogue)).toEqual([{ kind: "bat", product: bat }]);
  });
});
