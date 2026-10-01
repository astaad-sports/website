import { describe, expect, test } from "bun:test";

import type { StoreBat } from "@/lib/products/model";
import { DEFAULT_SETTINGS } from "@/lib/settings/model";

import { breadcrumbJsonLd, productJsonLd, realPhotos, serialiseJsonLd, storeJsonLd, type JsonLd } from "./structured-data";

const BASE = "https://astaadsports.com";

type DataProduct = Parameters<typeof productJsonLd>[0]["product"];

/** A product with one variant per price given. */
function product(prices: number[], changes: Partial<DataProduct> = {}): DataProduct {
  const variants = prices.map((price, index) => ({
    key: `S${index}`,
    size: `S${index}`,
    sizeLabel: `Size ${index}`,
    hand: null,
    left: null,
    price,
    regularPrice: price,
    mrp: price,
    off: 0,
  })) as StoreBat["variants"];
  return { images: ["https://blob.example/products/a.webp"], price: prices[0], variants, soldOut: false, offer: null, ...changes };
}

function data(of: DataProduct, reviews: Parameters<typeof productJsonLd>[0]["reviews"] = []): JsonLd {
  return productJsonLd({
    product: of,
    name: "Astaad G.O.A.T Grade 1 English Willow Cricket Bat",
    description: "A bat.",
    category: "Cricket Bats",
    path: "/bats/goat",
    reviews,
    deliveryFeePaise: 0,
    base: BASE,
  });
}

const offers = (of: JsonLd) => of.offers as Record<string, unknown>;

describe("a product's offers", () => {
  test("one price for every size is a single offer in rupees", () => {
    expect(offers(data(product([16499, 16499])))).toMatchObject({
      "@type": "Offer",
      price: 16499,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      url: "https://astaadsports.com/bats/goat",
    });
  });

  test("sizes with prices of their own run from the lowest to the highest", () => {
    expect(offers(data(product([16499, 12999, 16499])))).toMatchObject({
      "@type": "AggregateOffer",
      lowPrice: 12999,
      highPrice: 16499,
      offerCount: 2,
      priceCurrency: "INR",
    });
  });

  test("a product with no variants uses its own price", () => {
    expect(offers(data(product([], { price: 3499 })))).toMatchObject({ "@type": "Offer", price: 3499 });
  });

  test("sold out says so", () => {
    expect(offers(data(product([16499], { soldOut: true }))).availability).toBe("https://schema.org/OutOfStock");
  });

  test("a running offer's last day is the price's last day", () => {
    const offer = { name: "Diwali", percentOff: 10, endsAt: "2026-10-20T18:30:00.000Z" };
    expect(offers(data(product([14849], { offer }))).priceValidUntil).toBe("2026-10-20");
    expect(offers(data(product([16499])))).not.toHaveProperty("priceValidUntil");
  });

  test("the delivery charge is in rupees, to India", () => {
    const paid = productJsonLd({ product: product([16499]), name: "x", description: "x", category: "x", path: "/x", reviews: [], deliveryFeePaise: 9900, base: BASE });
    expect(offers(paid).shippingDetails).toMatchObject({
      shippingRate: { value: 99, currency: "INR" },
      shippingDestination: { addressCountry: "IN" },
    });
  });
});

describe("a product's photos and reviews", () => {
  test("a photo on the site gets the full address", () => {
    expect(data(product([1], { images: ["/images/helmet.png", "https://blob.example/a.webp"] })).image).toEqual([
      "https://astaadsports.com/images/helmet.png",
      "https://blob.example/a.webp",
    ]);
  });

  test("the rating counts only reviews with stars", () => {
    const rated = data(product([1]), [
      { name: "Rohit", rating: 5, body: "Superb" },
      { name: "Aman", rating: 4, body: null },
      { name: "Photo only", rating: null, body: null },
    ]);
    expect(rated.aggregateRating).toMatchObject({ ratingValue: 4.5, ratingCount: 2, bestRating: 5 });
  });

  test("no stars, no rating and no reviews", () => {
    const unrated = data(product([1]), [{ name: "Photo only", rating: null, body: null }]);
    expect(unrated).not.toHaveProperty("aggregateRating");
    expect(unrated).not.toHaveProperty("review");
    expect(data(product([1]))).not.toHaveProperty("aggregateRating");
  });

  test("listed reviews need a name and stars, and stop at five", () => {
    const many = Array.from({ length: 8 }, (_, index) => ({ name: `Player ${index}`, rating: 5, body: index ? "Good" : null }));
    const listed = data(product([1]), [{ name: null, rating: 5, body: "Anonymous" }, ...many]).review as Record<string, unknown>[];
    expect(listed).toHaveLength(5);
    expect(listed[0]).toEqual({
      "@type": "Review",
      author: { "@type": "Person", name: "Player 0" },
      reviewRating: { "@type": "Rating", ratingValue: 5, bestRating: 5 },
    });
    expect(listed[1].reviewBody).toBe("Good");
  });
});

test("realPhotos leaves out the built-in stand-in cut-outs", () => {
  expect(realPhotos(["/images/bat-english-willow.png"])).toEqual([]);
  expect(realPhotos(["https://blob.example/a.webp", "/uploads/products/b.webp"])).toHaveLength(2);
});

test("words a customer typed cannot end the script tag", () => {
  const written = serialiseJsonLd(data(product([1]), [{ name: "Eve", rating: 5, body: "</script><script>alert(1)</script>" }]));
  expect(written).not.toContain("<");
  expect(JSON.parse(written).review[0].reviewBody).toBe("</script><script>alert(1)</script>");
});

describe("the store", () => {
  test("settings left empty are left out", () => {
    const [store, site] = storeJsonLd(DEFAULT_SETTINGS, { base: BASE });
    expect(store).toEqual({
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      "@id": "https://astaadsports.com/#store",
      name: "Astaad Sports",
      url: BASE,
      logo: "https://astaadsports.com/brand/astaad-crest.png",
    });
    expect(site).toMatchObject({ "@type": "WebSite", name: "Astaad Sports", url: BASE });
  });

  test("contact details come from Settings", () => {
    const [store] = storeJsonLd(
      { ...DEFAULT_SETTINGS, supportEmail: "help@astaadsports.com", supportPhone: "98765 43210", storeAddress: "12 Sports Market, Jalandhar 144001" },
      { base: BASE, sameAs: ["https://www.instagram.com/astaad.sports/"] }
    );
    expect(store).toMatchObject({
      email: "help@astaadsports.com",
      telephone: "+919876543210",
      address: { "@type": "PostalAddress", streetAddress: "12 Sports Market, Jalandhar 144001", addressCountry: "IN" },
      sameAs: ["https://www.instagram.com/astaad.sports/"],
    });
  });
});

test("a trail numbers its steps and gives full addresses, home being the site itself", () => {
  const trail = breadcrumbJsonLd(
    [
      { name: "Home", path: "/" },
      { name: "Bats", path: "/shop/bats" },
      { name: "G.O.A.T", path: "/bats/goat" },
    ],
    BASE
  );
  expect(trail.itemListElement).toEqual([
    { "@type": "ListItem", position: 1, name: "Home", item: BASE },
    { "@type": "ListItem", position: 2, name: "Bats", item: "https://astaadsports.com/shop/bats" },
    { "@type": "ListItem", position: 3, name: "G.O.A.T", item: "https://astaadsports.com/bats/goat" },
  ]);
});
