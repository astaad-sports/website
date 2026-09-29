import { describe, expect, test } from "bun:test";

import { isProvenLink, ownReviewStanding, productsToReview } from "./customers";

describe("isProvenLink", () => {
  test("a signed-in customer or an admin's choice is proof; a matching contact is not", () => {
    expect(isProvenLink("customer")).toBe(true);
    expect(isProvenLink("admin")).toBe(true);
    expect(isProvenLink("contact")).toBe(false);
  });
});

describe("ownReviewStanding", () => {
  test("says where the review is, in the customer's words", () => {
    expect(ownReviewStanding({ status: "new", isPrivate: false })).toBe("checking");
    expect(ownReviewStanding({ status: "published", isPrivate: false })).toBe("on-site");
    expect(ownReviewStanding({ status: "hidden", isPrivate: false })).toBe("off-site");
  });

  test("private feedback is private whatever the admin has done with it", () => {
    expect(ownReviewStanding({ status: "new", isPrivate: true })).toBe("private");
    expect(ownReviewStanding({ status: "hidden", isPrivate: true })).toBe("private");
  });
});

describe("productsToReview", () => {
  const bought = (productSlug: string, status: "paid" | "shipped" | "delivered" | "confirmed" | "packed") => ({ productSlug, status });

  test("only what has been delivered", () => {
    expect(productsToReview([bought("goat", "shipped"), bought("run-machine", "delivered")], [])).toEqual([
      bought("run-machine", "delivered"),
    ]);
  });

  test("leaves out what they have reviewed", () => {
    expect(productsToReview([bought("goat", "delivered"), bought("run-machine", "delivered")], ["goat"])).toEqual([
      bought("run-machine", "delivered"),
    ]);
  });

  test("a product bought twice is asked about once, from its latest delivery", () => {
    const purchases = [
      { productSlug: "goat", status: "delivered" as const, orderNumber: 10009 },
      { productSlug: "goat", status: "delivered" as const, orderNumber: 10002 },
    ];
    expect(productsToReview(purchases, [])).toEqual([purchases[0]]);
  });

  test("nothing bought, nothing to review", () => {
    expect(productsToReview([], ["goat"])).toEqual([]);
  });
});
