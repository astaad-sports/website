import { describe, expect, test } from "bun:test";

import { findStoreBat, findStoreGear, seedProductRows, toStoreCatalogue, type StoreBat } from "@/lib/products/model";
import { DEFAULT_SETTINGS } from "@/lib/settings/model";

import {
  breadcrumbJsonLd,
  colourInName,
  productJsonLd,
  realPhotos,
  serialiseJsonLd,
  sizeListings,
  storeJsonLd,
  type JsonLd,
} from "./structured-data";

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

  test("sizes with prices of their own, and no sizes to list, fall back to the price the page shows", () => {
    expect(offers(data(product([16499, 12999, 16499])))).toMatchObject({ "@type": "Offer", price: 16499 });
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

describe("a bat's sizes as products of their own", () => {
  const goat = findStoreBat(
    toStoreCatalogue(
      seedProductRows().map((row) =>
        row.slug === "goat"
          ? {
              ...row,
              sizes: ["6", "SH", "LH"],
              sizePrices: { "6": { pricePaise: 799900, mrpPaise: null } },
              // Counted stock: none of Size 6 left.
              stock: 6,
              variantStock: { "6": 0, SH: 4, LH: 2 },
            }
          : row
      )
    ),
    "goat"
  )!;
  const sizes = sizeListings(goat, "/bats/goat");

  test("each size has its own identifier, address, price and stock", () => {
    expect(sizes).toEqual([
      { id: "goat-6", label: "Size 6", detail: expect.any(String), path: "/bats/goat?size=6", price: 7999, soldOut: true },
      { id: "goat-sh", label: "SH / Full Size", detail: expect.any(String), path: "/bats/goat?size=SH", price: 16499, soldOut: false },
      { id: "goat-lh", label: "LH / Long Handle", detail: expect.any(String), path: "/bats/goat?size=LH", price: 16499, soldOut: false },
    ]);
  });

  const grouped = productJsonLd({
    product: goat,
    name: "Astaad G.O.A.T Grade 1 English Willow Cricket Bat",
    description: "G.O.A.T · Grade 1 English Willow.",
    category: "Cricket Bats",
    path: "/bats/goat",
    reviews: [{ name: "Rohit", rating: 5, body: "Superb" }],
    deliveryFeePaise: 0,
    base: BASE,
    group: { id: goat.slug, sizes },
  });
  const variants = grouped.hasVariant as Record<string, unknown>[];

  test("the bat is a group that varies by size, with the rating and photos on the group", () => {
    expect(grouped).toMatchObject({
      "@type": "ProductGroup",
      name: "Astaad G.O.A.T Grade 1 English Willow Cricket Bat",
      productGroupID: "goat",
      variesBy: ["https://schema.org/size"],
      url: "https://astaadsports.com/bats/goat",
      brand: { "@type": "Brand", name: "Astaad" },
      aggregateRating: { ratingValue: 5, ratingCount: 1 },
    });
    expect(grouped).not.toHaveProperty("offers");
    expect(variants).toHaveLength(3);
  });

  test("each size is a product with one exact price, its stock and the address that opens on it", () => {
    expect(variants[0]).toMatchObject({
      "@type": "Product",
      sku: "goat-6",
      name: "Astaad G.O.A.T Grade 1 English Willow Cricket Bat, Size 6",
      size: "Size 6",
      offers: {
        "@type": "Offer",
        price: 7999,
        priceCurrency: "INR",
        availability: "https://schema.org/OutOfStock",
        url: "https://astaadsports.com/bats/goat?size=6",
        hasMerchantReturnPolicy: { merchantReturnDays: 7 },
      },
    });
    expect(variants[1]).toMatchObject({
      sku: "goat-sh",
      offers: { price: 16499, availability: "https://schema.org/InStock", url: "https://astaadsports.com/bats/goat?size=SH" },
    });
    // The size is named in the description, and the description's own full stop is not doubled.
    expect(variants[0].description).toStartWith("G.O.A.T · Grade 1 English Willow. Size: Size 6 (");
    expect(new Set(variants.map((variant) => variant.sku)).size).toBe(3);
  });

  test("a bat sold in one size stays a single product, in that size", () => {
    const single = productJsonLd({
      product: goat,
      name: "x",
      description: "x",
      category: "x",
      path: "/bats/goat",
      reviews: [],
      deliveryFeePaise: 0,
      base: BASE,
      group: { id: goat.slug, sizes: sizes.slice(1, 2) },
    });
    expect(single["@type"]).toBe("Product");
    expect(single.size).toBe("SH / Full Size");
    expect(single).toHaveProperty("offers");
  });
});

describe("gear sizes and colours", () => {
  const catalogue = toStoreCatalogue(
    seedProductRows().map((row) =>
      row.slug === "club-cricket-helmet"
        ? { ...row, sizes: ["Medium", "Large", "XL"], stock: 3, variantStock: { Medium: 2, Large: 0, XL: 1 } }
        : row.slug === "pro-batting-pads"
          ? { ...row, name: "Legacy Pro Pads Black", sizes: ["Men’s"], hands: true }
          : row
    )
  );
  const helmet = findStoreGear(catalogue, "helmets", "club-cricket-helmet")!;
  const pads = findStoreGear(catalogue, "batting-pads", "pro-batting-pads")!;
  const kitbag = findStoreGear(catalogue, "cricket-kitbags", "pro-cricket-kitbag")!;

  const gearData = (product: typeof helmet, path: string) =>
    productJsonLd({
      product,
      name: `Astaad ${product.name}`,
      description: "Gear.",
      category: "Cricket gear",
      path,
      reviews: [],
      deliveryFeePaise: 0,
      base: BASE,
      group: { id: product.slug, sizes: sizeListings(product, path) },
      color: colourInName(product.name),
    });

  test("a helmet in three shells is a group, one product per shell, at an address that opens on it", () => {
    const grouped = gearData(helmet, "/shop/helmets/club-cricket-helmet");
    const variants = grouped.hasVariant as { sku: string; size: string; offers: Record<string, unknown> }[];
    expect(grouped["@type"]).toBe("ProductGroup");
    expect(variants.map((variant) => variant.sku)).toEqual([
      "club-cricket-helmet-medium",
      "club-cricket-helmet-large",
      "club-cricket-helmet-xl",
    ]);
    expect(variants.map((variant) => variant.size)).toEqual(["Medium", "Large", "XL"]);
    expect(variants[1].offers).toMatchObject({
      price: helmet.price,
      availability: "https://schema.org/OutOfStock",
      url: "https://astaadsports.com/shop/helmets/club-cricket-helmet?size=Large",
    });
    expect(variants[0].offers.availability).toBe("https://schema.org/InStock");
  });

  test("gear in one size is one product in that size, with the colour its name states", () => {
    const single = gearData(pads, "/shop/batting-pads/pro-batting-pads");
    expect(single).toMatchObject({ "@type": "Product", size: "Men’s", color: "Black" });
    // Right and left hand are one listing, with a stable identifier for the size.
    expect(sizeListings(pads, "/x")).toEqual([
      { id: "pro-batting-pads-mens", label: "Men’s", detail: undefined, path: "/x?size=Men%E2%80%99s", price: pads.price, soldOut: false },
    ]);
  });

  test("gear with no sizes has no size, and no colour unless its name has one", () => {
    const plain = gearData(kitbag, "/shop/cricket-kitbags/pro-cricket-kitbag");
    expect(plain["@type"]).toBe("Product");
    expect(plain).not.toHaveProperty("size");
    expect(plain).not.toHaveProperty("color");
  });

  test("a group carries the colour on itself and on each size", () => {
    const blue = gearData({ ...helmet, name: "Legacy Pro Helmet Navy Blue" }, "/x");
    expect(blue.color).toBe("Blue/Navy");
    expect((blue.hasVariant as Record<string, unknown>[]).every((variant) => variant.color === "Blue/Navy")).toBe(true);
  });
});

describe("the colour in a name", () => {
  test("is a whole colour word, however it is typed", () => {
    expect(colourInName("Legacy Pro Pads Black")).toBe("Black");
    expect(colourInName("Classic Pro Red Gloves")).toBe("Red");
    expect(colourInName("Falcon Pro Players white")).toBe("White");
    expect(colourInName("Player Series Kitbag Black-Red")).toBe("Black/Red");
  });

  test("is not found where there is none", () => {
    expect(colourInName("Legacy Pro Helmet")).toBeUndefined();
    expect(colourInName("Player Series Kitbag RCB Edition")).toBeUndefined();
    // Part of another word is not a colour.
    expect(colourInName("Blackout Predator Gloves")).toBeUndefined();
    expect(colourInName("Goldsmith Pads")).toBeUndefined();
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

describe("the returns policy", () => {
  test("the store's says what /returns says: 7 days, by courier, unused, refunded in full", () => {
    const [store] = storeJsonLd(DEFAULT_SETTINGS, { base: BASE });
    expect(store.hasMerchantReturnPolicy).toEqual({
      "@type": "MerchantReturnPolicy",
      applicableCountry: "IN",
      returnPolicyCountry: "IN",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 7,
      itemCondition: "https://schema.org/NewCondition",
      returnMethod: "https://schema.org/ReturnByMail",
      returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
      customerRemorseReturnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
      itemDefectReturnFees: "https://schema.org/FreeReturn",
      refundType: "https://schema.org/FullRefund",
      merchantReturnLink: "https://astaadsports.com/returns",
    });
  });

  test("every offer repeats it in short", () => {
    expect(offers(data(product([16499]))).hasMerchantReturnPolicy).toEqual({
      "@type": "MerchantReturnPolicy",
      applicableCountry: "IN",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 7,
      returnMethod: "https://schema.org/ReturnByMail",
      returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
    });
  });
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
      description: store.description,
      logo: "https://astaadsports.com/brand/astaad-crest.png",
      areaServed: "IN",
      currenciesAccepted: "INR",
      hasMerchantReturnPolicy: store.hasMerchantReturnPolicy,
    });
    expect(store.description).toContain("across India");
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
