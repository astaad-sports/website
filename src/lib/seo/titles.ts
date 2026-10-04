// The titles and descriptions search results show for products and
// categories, and the descriptions of their photos (alt text), which is what
// image search goes by. Pure. Titles go through the root layout's
// "%s | Astaad Sports".
import {
  BAT_SIDE_LABELS,
  GEAR_CATEGORY_CONTENT,
  type BatRange,
  type GearCategorySlug,
  type StoreCategory,
} from "@/lib/catalogue";
import { formatPrice } from "@/lib/format";
import {
  countInWords,
  gearLine,
  gearOffered,
  listInWords,
  subcategoryName,
  type BatSubcategory,
  type StoreBat,
  type StoreGear,
} from "@/lib/products/model";

import { SITE_NAME } from "./metadata";

/** Past this, the whole title (with " | Astaad Sports") drops the willow grade for the range. */
const LONGEST_TITLE = 75;
/** Search results cut a description off at about this many characters. */
const LONGEST_DESCRIPTION = 160;

/** What a bat of each range is called. A tennis bat is a "tennis ball cricket bat" to the people searching for one. */
const RANGE_KIND: Record<BatSubcategory, string> = {
  "english-willow": "English Willow",
  "kashmir-willow": "Kashmir Willow",
  "tennis-bats": "Tennis Ball",
};

type TitledBat = Pick<StoreBat, "name" | "grade" | "subcategory">;

/**
 * "Grade 1 English Willow", "Kashmir Willow", "Tennis Ball": the bat's willow
 * grade, or its range when it has none (the catalogue then puts the range's
 * name in `grade`) and for tennis bats.
 */
function batKind(bat: TitledBat): string {
  const grade = bat.grade.trim();
  const graded = grade !== "" && grade !== subcategoryName(bat.subcategory) && bat.subcategory !== "tennis-bats";
  return graded ? grade : RANGE_KIND[bat.subcategory];
}

/**
 * "Grade 1 English Willow Cricket Bat": what kind of bat it is, after its
 * name in the title. A grade that would make the title run long ("Top 1% of
 * Grade 1+ Players English Willow") gives way to the range.
 */
export function batDescriptor(bat: TitledBat): string {
  const full = `${batKind(bat)} Cricket Bat`;
  const length = `${bat.name} — ${full} | ${SITE_NAME}`.length;
  return length > LONGEST_TITLE ? `${RANGE_KIND[bat.subcategory]} Cricket Bat` : full;
}

export function batTitle(bat: TitledBat): string {
  return `${bat.name} — ${batDescriptor(bat)}`;
}

/** "Astaad G.O.A.T Grade 1 English Willow Cricket Bat": a photo of the bat, wherever it is shown. */
export function batAlt(bat: TitledBat): string {
  return `Astaad ${bat.name} ${batDescriptor(bat)}`;
}

/**
 * One of a bat's own photos, in its gallery. A photo whose side is marked in
 * the admin says which: "…, back", "…, right edge". The others are numbered,
 * and a bat with one photo needs neither.
 */
export function batPhotoAlt(bat: TitledBat & Pick<StoreBat, "images" | "turn">, index: number): string {
  const count = bat.images.length;
  if (count < 2) return batAlt(bat);
  const side = bat.turn.find((view) => view.url === bat.images[index])?.side;
  return `${batAlt(bat)}, ${side ? BAT_SIDE_LABELS[side].toLowerCase() : `photo ${index + 1} of ${count}`}`;
}

type Priced = Pick<StoreBat, "price" | "variants">;

/** The lowest price among the product's sizes, and whether any size costs more. */
function lowestPrice(product: Priced): { lowest: number; varies: boolean } {
  const prices = [product.price, ...product.variants.map((variant) => variant.price)];
  const lowest = Math.min(...prices);
  return { lowest, varies: prices.some((price) => price !== lowest) };
}

const article = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");

/**
 * The bat's meta description: what it is and what it costs first, since
 * search results cut a description off at about 160 characters, then only
 * the choices this bat offers.
 */
export function batDescription(
  bat: TitledBat & Priced & Pick<StoreBat, "customization" | "sizes">
): string {
  // "tennis ball" reads as words, a willow grade as a name.
  const kind = bat.subcategory === "tennis-bats" ? batKind(bat).toLowerCase() : batKind(bat);
  const what = `Astaad ${bat.name}, ${article(kind)} ${kind} cricket bat`;
  const { lowest, varies } = lowestPrice(bat);
  const price = `${varies ? "from" : "at"} ${formatPrice(lowest)}`;
  const { customization } = bat;
  if (!customization.enabled) {
    const sizes = bat.sizes.length > 1 ? ` in ${countInWords(bat.sizes.length).toLowerCase()} sizes,` : "";
    return `${what}${sizes} ${price}. Delivered across India.`;
  }
  const extras = [
    ...(customization.engraving ? ["free name engraving"] : []),
    ...(customization.matchReady ? ["knocking"] : []),
  ];
  const choices = `Choose your weight, profile and handle${extras.length ? `, with ${listInWords(extras)}` : ""}`;
  const words = `${what} ${price}. ${choices}.`;
  const delivered = `${words} Delivered across India.`;
  return delivered.length <= LONGEST_DESCRIPTION ? delivered : words;
}

/** What each gear category's products are, for titles whose product name doesn't say. */
const GEAR_DESCRIPTOR: Record<GearCategorySlug, string> = {
  "batting-pads": "Cricket Batting Pads",
  "batting-gloves": "Cricket Batting Gloves",
  helmets: "Cricket Helmet",
  "cricket-kitbags": "Cricket Kitbag",
};

/**
 * "Legacy Pro Helmet — Cricket Helmet"; a name that already says it is
 * cricket or batting gear ("Elite Batting Gloves") stands alone.
 */
export function gearTitle(product: Pick<StoreGear, "name" | "categorySlug">): string {
  if (/cricket|batting/i.test(product.name)) return product.name;
  return `${product.name} — ${GEAR_DESCRIPTOR[product.categorySlug]}`;
}

/** "Astaad Legacy Pro Helmet, cricket helmet": a photo of the product, saying what it is where its name doesn't. */
export function gearAlt(product: Pick<StoreGear, "name" | "categorySlug">): string {
  if (/cricket|batting/i.test(product.name)) return `Astaad ${product.name}`;
  return `Astaad ${product.name}, ${GEAR_DESCRIPTOR[product.categorySlug].toLowerCase()}`;
}

/** One of a gear product's photos, in its gallery: numbered when there are several. */
export function gearPhotoAlt(product: Pick<StoreGear, "name" | "categorySlug" | "images">, index: number): string {
  const count = product.images.length;
  return count < 2 ? gearAlt(product) : `${gearAlt(product)}, photo ${index + 1} of ${count}`;
}

type DescribedGear = Pick<StoreGear, "name" | "categorySlug" | "line" | "note" | "sizes" | "hands">;

/** "Astaad Club Cricket Helmet: Club · Steel grille. A cricket helmet with …, in medium and large shells." */
function gearWords(product: DescribedGear, withLine: boolean): string {
  // A note the admin ended with a full stop must not give "..".
  const line = withLine ? gearLine(product).replace(/[.\s]+$/, "") : "";
  const summary = GEAR_CATEGORY_CONTENT[product.categorySlug].summary(gearOffered(product));
  return `Astaad ${product.name}${line ? `: ${line}` : ""}. ${summary}`;
}

/** Everything the store says about a gear product, however long its note: for its structured data. */
export function gearDetails(product: DescribedGear): string {
  return gearWords(product, true);
}

/**
 * A gear product's meta description: what it is, the sizes it comes in and
 * its price. Its range and note come first when they are short; a note that
 * runs to paragraphs would push the rest out of sight, so it is left to the page.
 */
export function gearDescription(product: DescribedGear & Priced): string {
  const { lowest, varies } = lowestPrice(product);
  const price = `${varies ? "From " : ""}${formatPrice(lowest)}, delivered across India.`;
  const full = `${gearWords(product, true)} ${price}`;
  return full.length <= LONGEST_DESCRIPTION ? full : `${gearWords(product, false)} ${price}`;
}

/**
 * A category or bat range in the middle of a sentence, saying "cricket"
 * where the name alone doesn't: "cricket helmets", "cricket kitbags",
 * "Kashmir willow bats".
 */
export function categoryWords(category: Pick<StoreCategory, "name"> | Pick<BatRange, "noun">): string {
  const named = "noun" in category ? category.noun : category.name.toLowerCase();
  return /cricket|willow|tennis/i.test(named) ? named : `cricket ${named}`;
}

/** "Astaad cricket helmets": the photo that stands for a category or range. */
export function categoryAlt(category: Pick<StoreCategory, "name"> | Pick<BatRange, "noun">): string {
  return `Astaad ${categoryWords(category)}`;
}

/** "Astaad cricket helmets: …. 4 models from ₹ 2,499, delivered across India." `from` is null while nothing is on sale. */
export function categoryDescription(
  category: Pick<StoreCategory, "name" | "tagline"> | Pick<BatRange, "noun" | "tagline">,
  count: number,
  from: number | null
): string {
  const onSale =
    from === null ? "" : ` ${count} ${count === 1 ? "model" : "models"} from ${formatPrice(from)}, delivered across India.`;
  return `Astaad ${categoryWords(category)}: ${category.tagline}${onSale}`;
}
