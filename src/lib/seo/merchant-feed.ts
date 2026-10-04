// The product feed Google Merchant Center fetches from /feeds/google.xml: one
// item for every size of every product the public can see, with the names,
// identifiers, prices and addresses the site's own product data gives Google
// (see structured-data.ts). Pure: the route is src/app/feeds/google.xml.
import { BAT_SIZES, type GearCategorySlug } from "@/lib/catalogue";
import type { StoreBat, StoreCatalogue, StoreGear } from "@/lib/products/model";
import { absoluteUrl } from "@/lib/site";

import { colourInName, realPhotos, sizeListings, type SizeListing } from "./structured-data";
import { batAlt, gearDetails, gearTitle } from "./titles";

/** Google's own categories (its product taxonomy), by number, so cricket gear is not taken for clothing. */
const CRICKET = 1087;
const CRICKET_BATS = 3815;
const GEAR_CATEGORY: Record<GearCategorySlug, number> = {
  "batting-gloves": 3339, // Cricket Gloves
  helmets: 3543, // Cricket Helmets
  "batting-pads": 499739, // Cricket Leg Guards
  // Google has no category for a cricket kitbag.
  "cricket-kitbags": CRICKET,
};

/** How many photos an item may carry beside its main one. */
const MORE_PHOTOS = 10;

export interface FeedDetail {
  section: string;
  name: string;
  value: string;
}

/** One thing a shopper can buy: a product in one size. */
export interface FeedItem {
  /** Must never change for a size of a product: "goat-6", "player-series-kitbag-black". */
  id: string;
  title: string;
  description: string;
  availability: "in_stock" | "out_of_stock";
  link: string;
  imageLink: string;
  additionalImageLinks: string[];
  /** The regular price while an offer runs (the offer's is `salePrice`), otherwise what the customer pays. "16499.00 INR". */
  price: string;
  salePrice?: string;
  googleProductCategory: number;
  /** The product's identifier, for a product sold in several sizes. */
  itemGroupId?: string;
  color?: string;
  size?: string;
  material?: string;
  highlights: string[];
  details: FeedDetail[];
}

const money = (rupees: number) => `${rupees.toFixed(2)} INR`;
/** One line with no full stop at the end, so a sentence can follow. */
const tidy = (text: string) => text.replace(/\s+/g, " ").replace(/[.\s]+$/, "");

/**
 * A product's items: one for each size, or one for a product with no sizes.
 * A product with no photo of its own is left out; Google needs a real photo.
 */
function productItems(
  product: StoreBat | StoreGear,
  path: string,
  base: string,
  fields: Pick<FeedItem, "title" | "description" | "googleProductCategory" | "highlights"> &
    Pick<FeedItem, "color" | "material"> & { details: (size?: SizeListing) => FeedDetail[] }
): FeedItem[] {
  const photos = realPhotos(product.images).map((src) => absoluteUrl(src, base));
  if (photos.length === 0) return [];
  const sizes = sizeListings(product, path);
  const listings: (SizeListing | undefined)[] = sizes.length ? sizes : [undefined];
  return listings.map((size) => {
    const code = size && product.sizes.find((entry) => entry.label === size.label)?.code;
    const variant = product.variants.find((entry) => entry.size === code);
    const price = size ? size.price : product.price;
    const regular = variant ? variant.regularPrice : product.regularPrice;
    const onOffer = Boolean(product.offer) && regular > price;
    return {
      id: size ? size.id : product.slug,
      title: size ? `${fields.title}, ${size.label}` : fields.title,
      description: size
        ? `${tidy(fields.description)}. Size: ${size.label}${size.detail ? ` (${size.detail})` : ""}.`
        : `${tidy(fields.description)}.`,
      availability: (size ? size.soldOut : product.soldOut) ? "out_of_stock" : "in_stock",
      // A size of a product sold in several opens the page on itself.
      link: absoluteUrl(size && sizes.length > 1 ? size.path : path, base),
      imageLink: photos[0],
      additionalImageLinks: photos.slice(1, 1 + MORE_PHOTOS),
      price: money(onOffer ? regular : price),
      ...(onOffer ? { salePrice: money(price) } : {}),
      googleProductCategory: fields.googleProductCategory,
      ...(sizes.length > 1 ? { itemGroupId: product.slug } : {}),
      ...(fields.color ? { color: fields.color } : {}),
      ...(size ? { size: size.label } : {}),
      ...(fields.material ? { material: fields.material } : {}),
      highlights: fields.highlights,
      details: fields.details(size),
    };
  });
}

function batItems(bat: StoreBat, base: string): FeedItem[] {
  const custom = bat.customization;
  const willow =
    bat.subcategory === "english-willow" ? "English willow" : bat.subcategory === "kashmir-willow" ? "Kashmir willow" : undefined;
  return productItems(bat, `/bats/${bat.slug}`, base, {
    title: batAlt(bat),
    description: bat.details,
    googleProductCategory: CRICKET_BATS,
    material: willow,
    highlights: [
      ...(bat.grade ? [bat.grade] : []),
      ...(custom.enabled ? ["Choose your weight, profile and handle"] : []),
      ...(custom.enabled && custom.engraving ? ["Free name engraving"] : []),
      ...(custom.enabled && custom.matchReady ? ["Free knocking"] : []),
    ],
    details: (size) => {
      // The size guide's figures, for a willow size.
      const guide = size && BAT_SIZES.find((entry) => entry.label === size.label);
      return [
        ...(bat.grade ? [{ section: "Bat", name: "Willow", value: bat.grade }] : []),
        ...(guide
          ? [
              { section: "Bat", name: "Length", value: guide.length.replace('"', " inches") },
              { section: "Bat", name: "Player age", value: guide.age },
              { section: "Bat", name: "Player height", value: guide.height.replace(/"/g, " in").replace(/'/g, " ft ") },
            ]
          : []),
      ];
    },
  });
}

function gearItems(product: StoreGear, base: string): FeedItem[] {
  return productItems(product, `/shop/${product.categorySlug}/${product.slug}`, base, {
    title: `Astaad ${gearTitle(product).replace(" — ", " - ")}`,
    description: gearDetails(product),
    googleProductCategory: GEAR_CATEGORY[product.categorySlug] ?? CRICKET,
    color: colourInName(product.name),
    highlights: [],
    details: () => [],
  });
}

/** Every item on sale, bats first, in catalogue order. */
export function feedItems(catalogue: StoreCatalogue, base: string): FeedItem[] {
  return [
    ...catalogue.bats.flatMap((bat) => batItems(bat, base)),
    ...catalogue.gear.flatMap((product) => gearItems(product, base)),
  ];
}

/** Text safe inside an XML element: the three characters XML reserves, and no control characters it forbids. */
function xml(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const tag = (name: string, value: string | number) => `<g:${name}>${xml(String(value))}</g:${name}>`;

/** The feed as Google's RSS 2.0 format, one <item> per FeedItem. */
export function feedXml(items: FeedItem[], channel: { title: string; link: string; description: string }): string {
  const entries = items.map((item) =>
    [
      "<item>",
      tag("id", item.id),
      tag("title", item.title),
      tag("description", item.description),
      tag("link", item.link),
      tag("image_link", item.imageLink),
      ...item.additionalImageLinks.map((src) => tag("additional_image_link", src)),
      tag("availability", item.availability),
      tag("price", item.price),
      ...(item.salePrice ? [tag("sale_price", item.salePrice)] : []),
      tag("brand", "Astaad"),
      tag("condition", "new"),
      tag("adult", "no"),
      // The store's own goods: none has a barcode or a maker's part number.
      tag("identifier_exists", "no"),
      tag("google_product_category", item.googleProductCategory),
      ...(item.itemGroupId ? [tag("item_group_id", item.itemGroupId)] : []),
      ...(item.color ? [tag("color", item.color)] : []),
      ...(item.size ? [tag("size", item.size)] : []),
      ...(item.material ? [tag("material", item.material)] : []),
      ...item.highlights.map((text) => tag("product_highlight", text)),
      ...item.details.map(
        (detail) =>
          `<g:product_detail>${tag("section_name", detail.section)}${tag("attribute_name", detail.name)}${tag("attribute_value", detail.value)}</g:product_detail>`
      ),
      "</item>",
    ].join("\n")
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">',
    "<channel>",
    `<title>${xml(channel.title)}</title>`,
    `<link>${xml(channel.link)}</link>`,
    `<description>${xml(channel.description)}</description>`,
    ...entries,
    "</channel>",
    "</rss>",
    "",
  ].join("\n");
}
