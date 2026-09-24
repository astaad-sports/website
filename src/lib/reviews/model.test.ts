import { describe, expect, test } from "bun:test";

import {
  formatAverage,
  normaliseContact,
  parseAdminReview,
  parseCustomerReview,
  photoAltText,
  reviewByline,
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
