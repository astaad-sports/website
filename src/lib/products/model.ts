// Products as the store sees them: stock and availability rules, the build
// options a bat offers, and the mapping from database rows to the shapes the
// storefront components read (Bat and GearProduct from src/lib/catalogue.ts).
// Pure and client-safe; the database lives in src/db/products.ts.
import type { BatCustomization, Offer, Product, ProductAvailability, ProductImage } from "@/db/schema";
import {
  BAT_HANDLES,
  BAT_IMAGE,
  BAT_PROFILES,
  BAT_TOES,
  BAT_WEIGHT_GROUPS,
  BATS,
  batWeightsFor,
  DEFAULT_BAT_CONFIG,
  GEAR,
  STORE_CATEGORIES,
  weightGroupName,
  type Bat,
  type BatConfig,
  type GearCategorySlug,
  type GearOffered,
  type GearProduct,
} from "@/lib/catalogue";
import { bestOffer, offerPrice, type OfferTerms } from "@/lib/offers/model";
import type { ProductRating } from "@/lib/reviews/model";

import {
  countedStock,
  defaultOffered,
  sizeOptions,
  sizePrice,
  startingVariant,
  storeOffered,
  type Sellable,
  type StoreOffered,
  type VariantPricing,
} from "./variants";

export { countInWords, listInWords } from "@/lib/words";

// ---------------------------------------------------------------------------
// Categories

export type CategorySlug = "bats" | GearCategorySlug;

export const CATEGORY_SLUGS = STORE_CATEGORIES.map((category) => category.slug as CategorySlug);

export function isCategorySlug(value: unknown): value is CategorySlug {
  return typeof value === "string" && (CATEGORY_SLUGS as string[]).includes(value);
}

export function categoryName(slug: string): string {
  return STORE_CATEGORIES.find((category) => category.slug === slug)?.name ?? slug;
}

/** Bat subcategories. English Willow bats can be customised; the others cannot. */
export const BAT_SUBCATEGORIES = [
  { slug: "english-willow", name: "English Willow" },
  { slug: "kashmir-willow", name: "Kashmir Willow" },
  { slug: "tennis-bats", name: "Tennis Bats" },
] as const;

export type BatSubcategory = (typeof BAT_SUBCATEGORIES)[number]["slug"];

export function isBatSubcategory(value: unknown): value is BatSubcategory {
  return BAT_SUBCATEGORIES.some((entry) => entry.slug === value);
}

export function subcategoryName(slug: string | null | undefined): string | null {
  return BAT_SUBCATEGORIES.find((entry) => entry.slug === slug)?.name ?? null;
}

/** How a gear category reads on a product card: "Helmet", "Cricket Kitbag". */
const GEAR_CARD_CATEGORY: Record<GearCategorySlug, string> = {
  "batting-pads": "Batting Pads",
  "batting-gloves": "Batting Gloves",
  helmets: "Helmet",
  "cricket-kitbags": "Cricket Kitbag",
};

// ---------------------------------------------------------------------------
// Stock and availability

/** What the admin and the store show for a product. */
export type StockStatus = "in" | "low" | "out" | "hidden";

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  in: "In stock",
  low: "Low stock",
  out: "Out of stock",
  hidden: "Hidden",
};

type StockFields = Pick<Product, "availability" | "stock" | "lowStockThreshold">;

/**
 * Hidden wins; then the admin's "Out of stock"; then the count. A product
 * whose stock has not been counted yet (null) stays on sale.
 */
export function stockStatus(product: StockFields): StockStatus {
  if (product.availability === "hidden") return "hidden";
  if (product.availability === "out_of_stock") return "out";
  if (product.stock === null) return "in";
  if (product.stock <= 0) return "out";
  if (product.stock < product.lowStockThreshold) return "low";
  return "in";
}

export function isPurchasable(product: StockFields): boolean {
  const status = stockStatus(product);
  return status === "in" || status === "low";
}

/**
 * The availability to store with a new stock count. Reaching 0 makes an
 * available product out of stock; restocking an out-of-stock product (from 0,
 * or from not counted) makes it available again. Hidden stays hidden.
 */
export function availabilityForStock(
  availability: ProductAvailability,
  previousStock: number | null,
  nextStock: number | null
): ProductAvailability {
  if (availability === "hidden") return "hidden";
  if (nextStock !== null && nextStock <= 0) return "out_of_stock";
  const restocked = (previousStock === null || previousStock <= 0) && nextStock !== null && nextStock > 0;
  if (availability === "out_of_stock" && restocked) return "available";
  return availability;
}

/**
 * The availability the editor saves. A choice the admin made wins (`chosen`
 * differs from what is saved, or `explicit` says they picked it even though it
 * is the same), except that a counted product with no stock cannot be
 * available. An untouched choice follows the stock rules above.
 */
export function availabilityForSave(
  chosen: ProductAvailability,
  saved: ProductAvailability | null,
  previousStock: number | null,
  nextStock: number | null,
  explicit = false
): ProductAvailability {
  if (saved === null || chosen !== saved || explicit) {
    return chosen === "available" && nextStock !== null && nextStock <= 0 ? "out_of_stock" : chosen;
  }
  return availabilityForStock(chosen, previousStock, nextStock);
}

/** The customer-facing price cut: MRP ₹10,999, price ₹7,699 → 30. */
export function percentOff(price: number, mrp: number | null | undefined): number {
  if (!mrp || mrp <= price) return 0;
  return Math.floor(((mrp - price) * 100) / mrp);
}

// ---------------------------------------------------------------------------
// Bat customisation

/** Every weight range, across sizes (see BAT_WEIGHT_GROUPS). */
export const WEIGHT_OPTIONS = BAT_WEIGHT_GROUPS.flatMap((group) => group.weights.map((option) => option.label));
export const PROFILE_OPTIONS = BAT_PROFILES.map((option) => option.label);
export const TOE_OPTIONS = BAT_TOES.map((option) => option.label);
export const HANDLE_OPTIONS = BAT_HANDLES.map((option) => option.label);

/** Every option on: what the English willow bats offered before the admin existed. */
export const FULL_CUSTOMIZATION: BatCustomization = {
  enabled: true,
  weights: [...WEIGHT_OPTIONS],
  profiles: [...PROFILE_OPTIONS],
  toes: [...TOE_OPTIONS],
  handles: [...HANDLE_OPTIONS],
  engraving: true,
  matchReady: true,
  scuffSheet: true,
};

export const NO_CUSTOMIZATION: BatCustomization = {
  enabled: false,
  weights: [],
  profiles: [],
  toes: [],
  handles: [],
  engraving: false,
  matchReady: false,
  scuffSheet: false,
};

/**
 * Only known labels, in their usual order. An enabled build needs at least one
 * weight, profile and handle; otherwise it is treated as not customisable. The
 * weights span every size: in each size it is sold in, the bat offers that
 * size's ranges listed here (see BAT_WEIGHT_GROUPS; the editor sees to it that
 * each size sold has one). The toe is optional: with none offered, the bat has
 * no toe choice. A build saved before toe shapes existed has no `toes` at all,
 * and offers every one.
 */
export function normaliseCustomization(input: Partial<BatCustomization> | null | undefined): BatCustomization {
  if (!input?.enabled) return NO_CUSTOMIZATION;
  const pick = (allowed: string[], chosen: unknown) =>
    allowed.filter((label) => Array.isArray(chosen) && chosen.includes(label));
  const weights = pick(WEIGHT_OPTIONS, input.weights);
  const profiles = pick(PROFILE_OPTIONS, input.profiles);
  const handles = pick(HANDLE_OPTIONS, input.handles);
  if (!weights.length || !profiles.length || !handles.length) return NO_CUSTOMIZATION;
  return {
    enabled: true,
    weights,
    profiles,
    toes: input.toes === undefined ? [...TOE_OPTIONS] : pick(TOE_OPTIONS, input.toes),
    handles,
    engraving: Boolean(input.engraving),
    matchReady: Boolean(input.matchReady),
    scuffSheet: Boolean(input.scuffSheet),
  };
}

/** Only English willow bats can be customised. */
export function customizationFor(kind: string, subcategory: string | null, stored: BatCustomization | null): BatCustomization {
  if (kind !== "bat" || subcategory !== "english-willow") return NO_CUSTOMIZATION;
  return normaliseCustomization(stored);
}

/** The weight ranges a bat of this size is made in, as labels (see batWeightsFor). */
export function weightLabelsFor(size: string | null | undefined): string[] {
  return batWeightsFor(size).map((option) => option.label);
}

/**
 * The weight ranges a bat offers, grouped by the sizes it is sold in, for the
 * words about them: each group named for its sizes ("Size 6", "SH and LH"),
 * leaving out any the bat offers nothing of.
 */
export function offeredWeightGroups(bat: Pick<StoreBat, "sizes" | "customization">): { name: string; weights: string[] }[] {
  const sold = bat.sizes.map((size) => size.code);
  return BAT_WEIGHT_GROUPS.flatMap((group) => {
    if (!group.sizes.some((code) => sold.includes(code))) return [];
    const weights = group.weights.map((option) => option.label).filter((label) => bat.customization.weights.includes(label));
    return weights.length ? [{ name: weightGroupName(group, sold), weights }] : [];
  });
}

// ---------------------------------------------------------------------------
// URLs and names

/** The longest slug the cart accepts (see cartItemSchema). */
export const MAX_SLUG_LENGTH = 64;

/** "Run Machine" → "run-machine"; "G.O.A.T" → "goat". */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function productHref(product: { kind: string; category: string; slug: string }): string {
  return product.kind === "bat" ? `/bats/${product.slug}` : `/shop/${product.category}/${product.slug}`;
}

// ---------------------------------------------------------------------------
// The storefront catalogue

/** A bat as the storefront shows it: the Bat fields plus stock, photos and build options. */
/** The offer taking money off a product on the store now (one that needs no code). */
export interface StoreOffer {
  name: string;
  percentOff: number;
  /** ISO time of the offer's end. */
  endsAt: string;
}

/** Offer fields shared by bats and gear on the store. `price` is what the customer pays now. */
interface OfferPricing {
  /** The price before any offer, in rupees. */
  regularPrice: number;
  offer: StoreOffer | null;
}

/**
 * The "% OFF" chip. Against a real MRP it is the saving on the MRP. Without
 * one, during an offer, it is the offer's own percentage: the price is
 * rounded to the rupee, so working it back out can read one percent low.
 */
function chipPercent(price: number, mrp: number, offer: StoreOffer | null, hasMrp: boolean): number {
  if (!hasMrp) return offer ? offer.percentOff : 0;
  return percentOff(price, mrp);
}

/**
 * The Bat's `rating` and `reviews` were placeholders from the design and are
 * left out: a bat's rating comes from its published reviews (see ProductReviews).
 */
export interface StoreBat extends Omit<Bat, "rating" | "reviews">, OfferPricing, StoreOffered {
  id: string;
  /** From its published reviews; null while it has none (or where reviews aren't loaded, as at checkout). */
  rating: ProductRating | null;
  subcategory: BatSubcategory;
  stockStatus: Exclude<StockStatus, "hidden">;
  /** Nothing of it can be bought, in any size. One size can run out while the bat stays on sale (see `variants`). */
  soldOut: boolean;
  /** Counted stock across its sizes, or null when not counted. */
  stockLeft: number | null;
  images: string[];
  /**
   * The straight view of the face, which the builders engrave a name on: the
   * photo marked as the face in the admin, or the first photo.
   */
  faceImage: string;
  customization: BatCustomization;
}

/** A gear product as the storefront shows it. */
export interface StoreGear extends GearProduct, OfferPricing, StoreOffered {
  id: string;
  /** From its published reviews; null while it has none (or where reviews aren't loaded, as at checkout). */
  rating: ProductRating | null;
  /** The "% OFF" chip; 0 when no offer is running. */
  off: number;
  stockStatus: Exclude<StockStatus, "hidden">;
  /** Nothing of it can be bought, in any size or hand (see `variants` for each one). */
  soldOut: boolean;
  /** Counted stock across its sizes and hands, or null when not counted. */
  stockLeft: number | null;
  images: string[];
}

/** Every product the public can see (hidden ones are left out), in category order. */
export interface StoreCatalogue {
  bats: StoreBat[];
  gear: StoreGear[];
  /** Charged per order; 0 while delivery is free (see Settings). */
  deliveryFeePaise: number;
}

/** What else shapes the catalogue: offers that need no code, delivery, and the time now. */
export interface CatalogueContext {
  offers?: (OfferTerms & Pick<Offer, "endsAt">)[];
  deliveryFeePaise?: number;
  now?: Date;
  /** Each reviewed product's rating, by product id (see ratingsByProduct). */
  ratings?: Record<string, ProductRating>;
}

/**
 * The regular price and the best running offer for a product row, at the
 * product's own price or at `amounts`, a size's price and MRP.
 */
function pricing(
  row: ProductWithImages,
  context: CatalogueContext,
  amounts: { pricePaise: number; mrpPaise: number | null } = row
): OfferPricing & VariantPricing & { hasMrp: boolean } {
  const regularPrice = rupees(amounts.pricePaise);
  const best = bestOffer(context.offers ?? [], { id: row.id, category: row.category }, context.now);
  const offer = best && { name: best.name, percentOff: best.percentOff, endsAt: best.endsAt.toISOString() };
  const price = best ? offerPrice(regularPrice, best.percentOff) : regularPrice;
  const hasMrp = Boolean(amounts.mrpPaise);
  // With no MRP, an offer is shown against the regular price.
  const mrp = amounts.mrpPaise ? rupees(amounts.mrpPaise) : regularPrice;
  return { regularPrice, price, offer, mrp, off: chipPercent(price, mrp, offer, hasMrp), hasMrp };
}

/** What each size of a row costs on the store (see storeOffered). */
function sizePricing(row: ProductWithImages, context: CatalogueContext): (size: string | null) => VariantPricing {
  return (size) => {
    const { price, regularPrice, mrp, off } = pricing(row, context, sizePrice(row, size));
    return { price, regularPrice, mrp, off };
  };
}

export type ProductWithImages = Product & {
  images: (Pick<ProductImage, "url" | "position"> & Partial<Pick<ProductImage, "face">>)[];
};

/** The built-in cut-out for a gear category, standing in for a product with no photos. */
function sampleImage(category: GearCategorySlug): string {
  return GEAR.find((item) => item.categorySlug === category)!.image;
}

/**
 * The box a gear product's photo fits in on a card, for products added in the
 * admin: a pair of gloves or pads from the front, a helmet three-quarter on,
 * an upright wheelie kitbag.
 */
const GEAR_LAYOUT: Record<GearCategorySlug, Pick<GearProduct, "image" | "imageWidth" | "imageHeight" | "imageTop">> = {
  "batting-gloves": { image: sampleImage("batting-gloves"), imageWidth: 192, imageHeight: 178, imageTop: 56 },
  "batting-pads": { image: sampleImage("batting-pads"), imageWidth: 168, imageHeight: 212, imageTop: 36 },
  helmets: { image: sampleImage("helmets"), imageWidth: 176, imageHeight: 172, imageTop: 60 },
  "cricket-kitbags": { image: sampleImage("cricket-kitbags"), imageWidth: 124, imageHeight: 236, imageTop: 24 },
};

const rupees = (paise: number) => Math.round(paise / 100);

/** The row's status on the store, judged on the total of its sizes and hands. */
function storeStock(row: ProductWithImages): { status: Exclude<StockStatus, "hidden">; stockLeft: number | null } {
  const stockLeft = countedStock(row);
  return { status: stockStatus({ ...row, stock: stockLeft }) as Exclude<StockStatus, "hidden">, stockLeft };
}

function toStoreBat(row: ProductWithImages, context: CatalogueContext): StoreBat {
  const seeded = BATS.find((bat) => bat.slug === row.slug);
  const { status, stockLeft } = storeStock(row);
  const { regularPrice, price, offer, mrp, off } = pricing(row, context);
  const sorted = [...row.images].sort((a, b) => a.position - b.position);
  const images = sorted.map((image) => image.url);
  const grade = row.grade ?? subcategoryName(row.subcategory) ?? "";
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline ?? undefined,
    grade,
    price,
    regularPrice,
    offer,
    mrp,
    off,
    badges: row.badges.length ? row.badges : undefined,
    dark: seeded?.dark,
    details: row.description ?? `${row.name} · ${grade}`,
    willow: row.shortDescription ?? grade,
    subcategory: (isBatSubcategory(row.subcategory) ? row.subcategory : "english-willow"),
    stockStatus: status,
    soldOut: status === "out",
    stockLeft,
    images: images.length ? images : [BAT_IMAGE],
    faceImage: sorted.find((image) => image.face)?.url ?? images[0] ?? BAT_IMAGE,
    rating: context.ratings?.[row.id] ?? null,
    customization: customizationFor(row.kind, row.subcategory, row.customization),
    ...storeOffered(row, sizePricing(row, context)),
  };
}

function toStoreGear(row: ProductWithImages, context: CatalogueContext): StoreGear {
  const category = row.category as GearCategorySlug;
  const seeded = GEAR.find((item) => item.slug === row.slug);
  const layout = seeded ?? GEAR_LAYOUT[category];
  const { status, stockLeft } = storeStock(row);
  const images = [...row.images].sort((a, b) => a.position - b.position).map((image) => image.url);
  const { regularPrice, price, offer, mrp, off } = pricing(row, context);
  return {
    id: row.id,
    slug: row.slug,
    categorySlug: category,
    category: GEAR_CARD_CATEGORY[category] ?? categoryName(category),
    line: row.line ?? "",
    name: row.name,
    note: row.note ?? undefined,
    price,
    regularPrice,
    offer,
    // Struck through beside the price: the MRP, or the regular price during an offer.
    mrp: mrp > price ? mrp : undefined,
    // Gear shows a % OFF chip only while an offer runs.
    off: offer ? off : 0,
    badge: row.badges[0],
    href: `/shop/${category}/${row.slug}`,
    image: images[0] ?? layout.image,
    imageWidth: layout.imageWidth,
    imageHeight: layout.imageHeight,
    imageTop: layout.imageTop,
    featured: row.featured,
    stockStatus: status,
    soldOut: status === "out",
    stockLeft,
    images: images.length ? images : [layout.image],
    rating: context.ratings?.[row.id] ?? null,
    ...storeOffered(row, sizePricing(row, context)),
  };
}

/**
 * The public catalogue from database rows: hidden products are left out, and
 * so are drafts with no price yet, whatever their availability says; bats
 * first, then gear by category. Prices include the best running offer that
 * needs no code.
 */
export function toStoreCatalogue(rows: ProductWithImages[], context: CatalogueContext = {}): StoreCatalogue {
  const visible = rows
    .filter((row) => row.availability !== "hidden" && row.pricePaise > 0)
    .sort(
      (a, b) =>
        CATEGORY_SLUGS.indexOf(a.category as CategorySlug) - CATEGORY_SLUGS.indexOf(b.category as CategorySlug) ||
        a.sortOrder - b.sortOrder ||
        a.name.localeCompare(b.name)
    );
  return {
    bats: visible.filter((row) => row.kind === "bat").map((row) => toStoreBat(row, context)),
    gear: visible.filter((row) => row.kind === "gear" && row.category !== "bats").map((row) => toStoreGear(row, context)),
    deliveryFeePaise: context.deliveryFeePaise ?? 0,
  };
}

/**
 * The products that ship in src/lib/catalogue.ts, as rows. They seed the
 * database and stand in for it when no database is configured (local
 * development before Neon is set up).
 */
export function seedProductRows(): ProductWithImages[] {
  const now = new Date(0);
  const base = {
    subcategory: null,
    line: null,
    tagline: null,
    note: null,
    grade: null,
    shortDescription: null,
    description: null,
    mrpPaise: null,
    sku: null,
    stock: null,
    sizes: [] as string[],
    hands: false,
    variantStock: {},
    sizePrices: {},
    lowStockThreshold: 3,
    availability: "available" as const,
    customization: null,
    badges: [] as string[],
    featured: false,
    createdAt: now,
    updatedAt: now,
  };
  const bats: ProductWithImages[] = BATS.map((bat, index) => ({
    ...base,
    id: `seed-${bat.slug}`,
    slug: bat.slug,
    kind: "bat",
    category: "bats",
    subcategory: "english-willow",
    // Every size, as the bats were sold when they were seeded.
    sizes: sizeOptions("bats", "english-willow").map((size) => size.code),
    name: bat.name,
    tagline: bat.tagline ?? null,
    grade: bat.grade,
    shortDescription: bat.willow,
    description: bat.details,
    pricePaise: bat.price * 100,
    mrpPaise: bat.mrp * 100,
    customization: FULL_CUSTOMIZATION,
    badges: bat.badges ?? [],
    sortOrder: index,
    images: [{ url: BAT_IMAGE, position: 0 }],
  }));
  const gear: ProductWithImages[] = GEAR.map((item, index) => ({
    ...base,
    id: `seed-${item.slug}`,
    slug: item.slug,
    kind: "gear",
    category: item.categorySlug,
    ...defaultOffered(item.categorySlug, null),
    name: item.name,
    line: item.line,
    note: item.note ?? null,
    pricePaise: item.price * 100,
    mrpPaise: item.mrp ? item.mrp * 100 : null,
    badges: item.badge ? [item.badge] : [],
    featured: Boolean(item.featured),
    sortOrder: index,
    images: [{ url: item.image, position: 0 }],
  }));
  return [...bats, ...gear];
}

// ---------------------------------------------------------------------------
// Storefront selections
// Which catalogue products each storefront section shows, the builder's
// starting choices, and the words around them. Added with the storefront's
// move to the products table.

/** A bat the public can see, or undefined when it is hidden or unknown. */
export function findStoreBat(catalogue: StoreCatalogue, slug: string): StoreBat | undefined {
  return catalogue.bats.find((bat) => bat.slug === slug);
}

/** A gear product the public can see in `category`, or undefined when it is hidden, unknown or elsewhere. */
export function findStoreGear(catalogue: StoreCatalogue, category: string, slug: string): StoreGear | undefined {
  return catalogue.gear.find((product) => product.categorySlug === category && product.slug === slug);
}

/** One gear category's products, in catalogue order. */
export function gearInCategory(catalogue: StoreCatalogue, category: string): StoreGear[] {
  return catalogue.gear.filter((product) => product.categorySlug === category);
}

/** One bat subcategory's bats, in catalogue order. */
export function batsInSubcategory(catalogue: StoreCatalogue, subcategory: BatSubcategory): StoreBat[] {
  return catalogue.bats.filter((bat) => bat.subcategory === subcategory);
}

/** Every bat, range by range as BAT_SUBCATEGORIES has them (English willow first), each range in catalogue order. */
export function batsByRange(catalogue: StoreCatalogue): StoreBat[] {
  return BAT_SUBCATEGORIES.flatMap(({ slug }) => batsInSubcategory(catalogue, slug));
}

/** A home page category tile's count and starting price; `from` is null while nothing is on sale. */
export interface CategoryStats {
  models: number;
  from: number | null;
}

/** Each category's models on sale and its lowest price, offers included, for the home page tiles. */
export function categoryStats(catalogue: StoreCatalogue): Record<CategorySlug, CategoryStats> {
  return Object.fromEntries(
    CATEGORY_SLUGS.map((slug) => {
      const prices = (slug === "bats" ? catalogue.bats : gearInCategory(catalogue, slug)).map((product) => product.price);
      return [slug, { models: prices.length, from: prices.length ? Math.min(...prices) : null }];
    })
  ) as Record<CategorySlug, CategoryStats>;
}

/** How many bats the public can see in each subcategory, for the home page collection tiles. */
export function batCounts(catalogue: StoreCatalogue): Record<BatSubcategory, number> {
  const counts = Object.fromEntries(BAT_SUBCATEGORIES.map(({ slug }) => [slug, 0])) as Record<BatSubcategory, number>;
  for (const bat of catalogue.bats) counts[bat.subcategory] += 1;
  return counts;
}

/** The order "Complete your kit" shows the gear categories in: gloves first, as designed. */
const KIT_ORDER: GearCategorySlug[] = ["batting-gloves", "batting-pads", "helmets", "cricket-kitbags"];

/**
 * "Complete your kit": each gear category's featured product (its entry
 * model), or its first product when that one is hidden. `except` leaves out
 * the category the customer is already looking at.
 */
export function kitGear(catalogue: StoreCatalogue, except?: string): StoreGear[] {
  return KIT_ORDER.filter((category) => category !== except).flatMap((category) => {
    const products = gearInCategory(catalogue, category);
    const pick = products.find((product) => product.featured) ?? products[0];
    return pick ? [pick] : [];
  });
}

function byPrice(bats: StoreBat[], direction: 1 | -1): StoreBat | undefined {
  return bats.reduce<StoreBat | undefined>(
    (best, bat) => (!best || (bat.price - best.price) * direction < 0 ? bat : best),
    undefined
  );
}

/** The entry English willow bat (the lowest price), cross-sold on the gear pages. */
export function entryBat(catalogue: StoreCatalogue): StoreBat | undefined {
  return byPrice(batsInSubcategory(catalogue, "english-willow"), 1);
}

/**
 * The bat the home page builder shows off: the dearest customisable bat that
 * can be bought, or the dearest customisable one when none can.
 */
export function builderBat(catalogue: StoreCatalogue): StoreBat | undefined {
  const customisable = catalogue.bats.filter((bat) => bat.customization.enabled);
  return byPrice(customisable.filter((bat) => !bat.soldOut), -1) ?? byPrice(customisable, -1);
}

/**
 * A bat's standard build, which its builder starts on and its cart buttons
 * add: in SH if that can be bought, otherwise the first size that can, with
 * the usual build options in that size (see startingBatConfig).
 */
export function standardBatConfig(bat: Pick<StoreBat, "customization"> & Sellable): BatConfig {
  const size = startingVariant(bat).size ?? DEFAULT_BAT_CONFIG.size;
  return startingBatConfig(bat.customization, { ...DEFAULT_BAT_CONFIG, size });
}

/** `index` when its label is offered, otherwise the first label offered, otherwise `index` as it is. */
function firstOffered(labels: string[], offered: string[], index: number): number {
  if (offered.includes(labels[index])) return index;
  const first = labels.findIndex((label) => offered.includes(label));
  return first === -1 ? index : first;
}

/**
 * The weight a builder starts on in a size: `current` (an index into the
 * size's ranges, see BatConfig) when the bat offers that range in the size,
 * otherwise the first range it does offer in it.
 */
export function startingWeight(customization: BatCustomization, size: string | null | undefined, current: number): number {
  return firstOffered(weightLabelsFor(size), customization.weights, current);
}

/**
 * A builder's first choices for a bat's build: the usual one wherever the bat
 * offers it, otherwise the first option it does offer. Indexes refer to the
 * weight ranges of `base`'s size and the full BAT_PROFILES, BAT_TOES and
 * BAT_HANDLES lists; extras the bat does not offer start switched off. The
 * size is left as it is.
 */
export function startingBatConfig(customization: BatCustomization, base: BatConfig = DEFAULT_BAT_CONFIG): BatConfig {
  const on = customization.enabled;
  return {
    ...base,
    weight: startingWeight(customization, base.size, base.weight),
    profile: firstOffered(PROFILE_OPTIONS, customization.profiles, base.profile),
    toe: firstOffered(TOE_OPTIONS, customization.toes, base.toe),
    handle: firstOffered(HANDLE_OPTIONS, customization.handles, base.handle),
    name: on && customization.engraving ? base.name : "",
    knock: on && customization.matchReady && base.knock,
    scuff: on && customization.scuffSheet && base.scuff,
  };
}

/** "Only 2 left" on a product page when a counted product is running low; null otherwise. */
export function stockNote(product: Pick<StoreGear, "stockStatus" | "stockLeft">): string | null {
  return product.stockStatus === "low" && product.stockLeft !== null ? `Only ${product.stockLeft} left` : null;
}

/** The sizes (as the customer reads them) and hands a gear product is sold in, for the words about it. */
export function gearOffered(product: Pick<StoreGear, "sizes" | "hands">): GearOffered {
  return { sizes: product.sizes.map((size) => size.label), hands: product.hands };
}

/**
 * The sizes a gear category is on sale in, across its products, in their
 * usual order, and whether any comes left- and right-handed. With nothing on
 * sale, what a new product of the category starts with.
 */
export function categoryOffered(catalogue: StoreCatalogue, category: GearCategorySlug): GearOffered {
  const products = gearInCategory(catalogue, category);
  if (products.length === 0) return defaultOffered(category, null);
  const onSale = new Set(products.flatMap((product) => product.sizes.map((size) => size.label)));
  return {
    sizes: sizeOptions(category, null)
      .map((size) => size.label)
      .filter((label) => onSale.has(label)),
    hands: products.some((product) => product.hands),
  };
}

/** A gear product's range and note on one line, "Elite · Pro sheepskin palm", leaving out whichever is missing. */
export function gearLine(product: Pick<StoreGear, "line" | "note">): string {
  return [product.line, product.note].filter(Boolean).join(" · ");
}
