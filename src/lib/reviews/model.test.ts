import { describe, expect, test } from "bun:test";

import {
  formatAverage,
  normaliseContact,
  parseAdminReview,
  parseCustomerReview,
  photoAltText,
  ratingBreakdown,
  ratingLabel,
  ratingsByProduct,
  reviewByline,
  reviewCount,
  reviewsOfProduct,
  summariseReviews,
} from "./model";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

const PRODUCT = "5b1f0c1e-8a4d-4c7e-9d2a-3f6b8e1c2d4a";

describe("customer review form", () => {
  test("a complete review is tidied and kept", () => {
    const parsed = parseCustomerReview(
      form({
        rating: "5",
        body: "  Great   bat.\r\n\r\n\r\n\r\nPings off the middle.  ",
        name: " Rohit  S. ",
        place: "Mumbai",
        contact: "+91 98765 43210",
        productId: PRODUCT,
      })
    );
    expect(parsed).toEqual({
      ok: true,
      values: {
        rating: 5,
        body: "Great bat.\n\nPings off the middle.",
        name: "Rohit S.",
        place: "Mumbai",
        contact: "9876543210",
        productId: PRODUCT,
        isPrivate: false,
      },
    });
  });

  test("optional fields may be empty, and private is a tick", () => {
    const parsed = parseCustomerReview(form({ rating: "3", body: "Okay", name: "Aman", private: "on" }));
    expect(parsed.ok && parsed.values).toMatchObject({ place: null, contact: null, productId: null, isPrivate: true });
  });

  test("stars, words and a name are required", () => {
    const parsed = parseCustomerReview(form({ rating: "6", body: "ok", name: "" }));
    expect(parsed.ok).toBe(false);
    expect(!parsed.ok && Object.keys(parsed.fieldErrors).sort()).toEqual(["body", "name", "rating"]);
  });

  test("a contact must be an email or a mobile, and a product one of the list", () => {
    const parsed = parseCustomerReview(
      form({ rating: "4", body: "Nice gloves", name: "Aman", contact: "12345", productId: "run-machine" })
    );
    expect(!parsed.ok && Object.keys(parsed.fieldErrors).sort()).toEqual(["contact", "productId"]);
  });

  test("too long is refused", () => {
    const parsed = parseCustomerReview(form({ rating: "4", body: "a".repeat(1001), name: "b".repeat(61) }));
    expect(!parsed.ok && Object.keys(parsed.fieldErrors).sort()).toEqual(["body", "name"]);
  });
});

describe("contacts", () => {
  test("emails are lower-cased and mobiles kept as 10 digits", () => {
    expect(normaliseContact("Rohit@Example.com")).toBe("rohit@example.com");
    expect(normaliseContact("098765 43210")).toBe("9876543210");
    expect(normaliseContact("(+91) 98765-43210")).toBe("9876543210");
    expect(normaliseContact("")).toBe("");
  });

  test("anything else is refused", () => {
    expect(normaliseContact("rohit@")).toBeNull();
    expect(normaliseContact("12345 67890")).toBeNull();
  });
});

describe("admin review form", () => {
  test("a photo on its own is a review", () => {
    const parsed = parseAdminReview(form({ rating: "", body: "" }), { hasPhoto: true });
    expect(parsed).toEqual({
      ok: true,
      values: { rating: null, body: null, name: null, place: null, productId: null, photoAlt: null },
    });
  });

  test("without a photo it needs words", () => {
    const parsed = parseAdminReview(form({ rating: "5" }), { hasPhoto: false });
    expect(!parsed.ok && parsed.fieldErrors).toEqual({ body: "Add the review's words or a photo" });
  });

  test("a rating is 1 to 5 or none", () => {
    const parsed = parseAdminReview(form({ rating: "0", body: "Good" }), { hasPhoto: false });
    expect(!parsed.ok && Object.keys(parsed.fieldErrors)).toEqual(["rating"]);
  });
});

describe("showing reviews", () => {
  test("the average counts only rated reviews", () => {
    expect(summariseReviews([{ rating: 5 }, { rating: 4 }, { rating: null }])).toEqual({ average: 4.5, rated: 2 });
    expect(summariseReviews([{ rating: null }])).toEqual({ average: null, rated: 0 });
    expect(formatAverage(4.86)).toBe("4.9");
  });

  test("the byline joins what is known", () => {
    expect(reviewByline({ name: "Rohit S.", place: "Mumbai" })).toBe("Rohit S. · Mumbai");
    expect(reviewByline({ name: null, place: "Mumbai" })).toBe("Mumbai");
    expect(reviewByline({ name: null, place: null })).toBeNull();
  });

  test("a photo always has a description", () => {
    expect(photoAltText("A batter at the crease", "Rohit")).toBe("A batter at the crease");
    expect(photoAltText(null, "Rohit")).toBe("Photo from Rohit");
    expect(photoAltText(null, null)).toBe("Photo from a customer");
  });
});

describe("a product's reviews", () => {
  const product = (id: string) => ({ id, name: id, href: null });
  const reviews = [
    { id: "a", rating: 5, product: product("run-machine") },
    { id: "b", rating: 4, product: product("goat") },
    { id: "c", rating: 5, product: product("run-machine") },
    { id: "d", rating: null, product: product("run-machine") },
    { id: "e", rating: 3, product: null },
  ];

  test("only the reviews that name the product", () => {
    expect(reviewsOfProduct(reviews, "run-machine").map((review) => review.id)).toEqual(["a", "c", "d"]);
    expect(reviewsOfProduct(reviews, "legacy-one")).toEqual([]);
  });

  test("the stars are counted five first, leaving out reviews without stars", () => {
    expect(ratingBreakdown(reviewsOfProduct(reviews, "run-machine"))).toEqual([
      { stars: 5, count: 2 },
      { stars: 4, count: 0 },
      { stars: 3, count: 0 },
      { stars: 2, count: 0 },
      { stars: 1, count: 0 },
    ]);
  });

  test("the count reads as words", () => {
    expect(reviewCount(1)).toBe("1 review");
    expect(reviewCount(3)).toBe("3 reviews");
  });

  test("each reviewed product gets its average and count; reviews naming no product are left out", () => {
    expect(ratingsByProduct(reviews)).toEqual({
      "run-machine": { average: 5, count: 3 },
      goat: { average: 4, count: 1 },
    });
    expect(ratingsByProduct([{ rating: null, product: product("goat") }])).toEqual({ goat: { average: null, count: 1 } });
  });

  test("an average is read out to one decimal", () => {
    expect(ratingLabel(14 / 3)).toBe("4.7 out of 5 stars");
    expect(ratingLabel(4)).toBe("4 out of 5 stars");
  });
});
