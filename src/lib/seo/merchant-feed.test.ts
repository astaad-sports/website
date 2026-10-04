import { describe, expect, test } from "bun:test";

import { NO_CUSTOMIZATION, seedProductRows, toStoreCatalogue, type ProductWithImages } from "@/lib/products/model";

import { feedItems, feedXml, type FeedItem } from "./merchant-feed";

const BASE = "https://astaadsports.com";
const photo = (name: string) => ({ url: `https://blob.example/products/${name}.webp`, position: 0 });

/** The seeded catalogue with a few products set up the way the live store has them. */
function items(changes: Record<string, Partial<ProductWithImages>> = {}): FeedItem[] {
  const live: Record<string, Partial<ProductWithImages>> = {
    goat: {
      images: [photo("goat-1"), { ...photo("goat-2"), position: 1 }],
      sizes: ["6", "SH", "LH"],
      sizePrices: { "6": { pricePaise: 799900, mrpPaise: null } },
      stock: 6,
      variantStock: { "6": 0, SH: 4, LH: 2 },
    },
    "run-machine": { images: [photo("run-machine")], sizes: ["SH"] },
    "club-cricket-helmet": { images: [photo("helmet")], sizes: ["Medium", "Large"] },
    "pro-batting-pads": { name: "Legacy Pro Pads Black", images: [photo("pads")], sizes: ["Men’s"], hands: true },
    "pro-cricket-kitbag": { images: [photo("kitbag")] },
  };
  return feedItems(
    toStoreCatalogue(seedProductRows().map((row) => ({ ...row, ...live[row.slug], ...changes[row.slug] }))),
    BASE
  );
}

const byId = (list: FeedItem[], id: string) => list.find((item) => item.id === id)!;

describe("the feed's items", () => {
  const feed = items();

  test("a product with no photo of its own is left out", () => {
    // Only the five products given photos above are in the feed.
    expect(new Set(feed.map((item) => item.itemGroupId ?? item.id.replace(/-(sh|mens)$/, "")))).toEqual(
      new Set(["goat", "run-machine", "club-cricket-helmet", "pro-batting-pads", "pro-cricket-kitbag"])
    );
  });

  test("a bat in several sizes is one item per size, each with its price, stock and address", () => {
    expect(feed.filter((item) => item.itemGroupId === "goat").map((item) => item.id)).toEqual(["goat-6", "goat-sh", "goat-lh"]);
    expect(byId(feed, "goat-6")).toMatchObject({
      title: "Astaad G.O.A.T Grade 1 English Willow Cricket Bat, Size 6",
      availability: "out_of_stock",
      link: "https://astaadsports.com/bats/goat?size=6",
      price: "7999.00 INR",
      size: "Size 6",
      material: "English willow",
      googleProductCategory: 3815,
      imageLink: "https://blob.example/products/goat-1.webp",
      additionalImageLinks: ["https://blob.example/products/goat-2.webp"],
    });
    expect(byId(feed, "goat-sh")).toMatchObject({ availability: "in_stock", price: "16499.00 INR", link: "https://astaadsports.com/bats/goat?size=SH" });
    expect(byId(feed, "goat-6").description).toEndWith("Size: Size 6 (10–12 yrs · 4'6\"–5'0\").");
  });

  test("a bat's highlights and details come from what it offers and the size guide", () => {
    const sized = byId(feed, "goat-sh");
    expect(sized.highlights).toEqual(["Grade 1 English Willow", "Choose your weight, profile and handle", "Free name engraving", "Free knocking"]);
    expect(sized.details).toEqual([
      { section: "Bat", name: "Willow", value: "Grade 1 English Willow" },
      { section: "Bat", name: "Length", value: "33.5 inches" },
      { section: "Bat", name: "Player age", value: "15+ years" },
      { section: "Bat", name: "Player height", value: "5 ft 4 in – 5 ft 10 in" },
    ]);
    const plain = byId(items({ goat: { customization: NO_CUSTOMIZATION } }), "goat-sh");
    expect(plain.highlights).toEqual(["Grade 1 English Willow"]);
  });

  test("a product in one size is one item at its own address, with no group", () => {
    const one = byId(feed, "run-machine-sh");
    expect(one.link).toBe("https://astaadsports.com/bats/run-machine");
    expect(one).not.toHaveProperty("itemGroupId");
    expect(one.size).toBe("SH / Full Size");
  });

  test("gear has its Google category, its colour from its name, and no size when it has none", () => {
    expect(byId(feed, "pro-batting-pads-mens")).toMatchObject({
      title: "Astaad Legacy Pro Pads Black - Cricket Batting Pads, Men’s",
      color: "Black",
      size: "Men’s",
      googleProductCategory: 499739,
    });
    expect(byId(feed, "club-cricket-helmet-large")).toMatchObject({
      itemGroupId: "club-cricket-helmet",
      googleProductCategory: 3543,
      link: "https://astaadsports.com/shop/helmets/club-cricket-helmet?size=Large",
    });
    const kitbag = byId(feed, "pro-cricket-kitbag");
    expect(kitbag.googleProductCategory).toBe(1087);
    expect(kitbag).not.toHaveProperty("size");
    expect(kitbag).not.toHaveProperty("color");
  });

  test("every identifier is unique", () => {
    expect(new Set(feed.map((item) => item.id)).size).toBe(feed.length);
  });
});

describe("the feed as XML", () => {
  const channel = { title: "Astaad Sports", link: BASE, description: "Bats & gear" };
  const written = feedXml(items(), channel);

  test("is Google's RSS 2.0, one <item> per item", () => {
    expect(written).toStartWith('<?xml version="1.0" encoding="UTF-8"?>\n<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">');
    expect(written.match(/<item>/g)).toHaveLength(items().length);
    expect(written).toContain("<g:id>goat-6</g:id>");
    expect(written).toContain("<g:price>7999.00 INR</g:price>");
    expect(written).toContain("<g:item_group_id>goat</g:item_group_id>");
    expect(written).toContain("<g:google_product_category>3815</g:google_product_category>");
    expect(written).toContain("<g:identifier_exists>no</g:identifier_exists>");
    expect(written).toContain(
      "<g:product_detail><g:section_name>Bat</g:section_name><g:attribute_name>Willow</g:attribute_name><g:attribute_value>Grade 1 English Willow</g:attribute_value></g:product_detail>"
    );
  });

  test("repeats a tag for each extra photo and highlight", () => {
    expect(written.match(/<g:additional_image_link>/g)!.length).toBeGreaterThanOrEqual(3);
    expect(written).toContain("<g:product_highlight>Free name engraving</g:product_highlight>");
  });

  test("escapes what XML reserves, wherever it turns up", () => {
    expect(written).toContain("<description>Bats &amp; gear</description>");
    const odd = feedXml(
      [{ ...byId(items(), "pro-cricket-kitbag"), title: 'Kit <bag> & "more"', description: "a\u0001b" }],
      channel
    );
    expect(odd).toContain('<g:title>Kit &lt;bag&gt; &amp; "more"</g:title>');
    expect(odd).toContain("<g:description>ab</g:description>");
  });
});
