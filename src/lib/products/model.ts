// Products as the store sees them: stock and availability rules, the build
// options a bat offers, and the mapping from database rows to the shapes the
// storefront components read (Bat and GearProduct from src/lib/catalogue.ts).
// Pure and client-safe; the database lives in src/db/products.ts.
import type { BatCustomization, Offer, Product, ProductAvailability, ProductImage } from "@/db/schema";
import {
  BAT_HANDLES,
  BAT_IMAGE,
  BAT_PROFILES,
  BAT_WEIGHTS,
  BATS,
  DEFAULT_BAT_CONFIG,
  GEAR,
  STORE_CATEGORIES,
  type Bat,
  type BatConfig,
  type GearCategorySlug,
  type GearProduct,
} from "@/lib/catalogue";
import { bestOffer, offerPrice, type OfferTerms } from "@/lib/offers/model";

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

export const WEIGHT_OPTIONS = BAT_WEIGHTS.map((option) => option.label);
export const PROFILE_OPTIONS = BAT_PROFILES.map((option) => option.label);
export const HANDLE_OPTIONS = BAT_HANDLES.map((option) => option.label);

/** Every option on: what the English willow bats offered before the admin existed. */
export const FULL_CUSTOMIZATION: BatCustomization = {
  enabled: true,
  weights: [...WEIGHT_OPTIONS],
  profiles: [...PROFILE_OPTIONS],
  handles: [...HANDLE_OPTIONS],
  engraving: true,
  matchReady: true,
  scuffSheet: true,
};

export const NO_CUSTOMIZATION: BatCustomization = {
  enabled: false,
  weights: [],
  profiles: [],
  handles: [],
  engraving: false,
  matchReady: false,
  scuffSheet: false,
};

/**
 * Only known labels, in their usual order. An enabled build needs at least one
 * weight, profile and handle; otherwise it is treated as not customisable.
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

export interface StoreBat extends Bat, OfferPricing {
  id: string;
  subcategory: BatSubcategory;
  stockStatus: Exclude<StockStatus, "hidden">;
  soldOut: boolean;
  /** Counted stock, or null when not counted. */
  stockLeft: number | null;
  images: string[];
  customization: BatCustomization;
}

/** A gear product as the storefront shows it. */
export interface StoreGear extends GearProduct, OfferPricing {
  id: string;
  stockStatus: Exclude<StockStatus, "hidden">;
  soldOut: boolean;
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
}

/** The regular price and the best running offer for a product row. */
function pricing(row: ProductWithImages, context: CatalogueContext): OfferPricing & { price: number } {
  const regularPrice = rupees(row.pricePaise);
  const offer = bestOffer(context.offers ?? [], { id: row.id, category: row.category }, context.now);
  if (!offer) return { regularPrice, price: regularPrice, offer: null };
  return {
    regularPrice,
    price: offerPrice(regularPrice, offer.percentOff),
    offer: { name: offer.name, percentOff: offer.percentOff, endsAt: offer.endsAt.toISOString() },
  };
}

export type ProductWithImages = Product & { images: Pick<ProductImage, "url" | "position">[] };

/** How each gear category's cut-out sits in a card, for products added later. */
const GEAR_LAYOUT: Record<GearCategorySlug, Pick<GearProduct, "image" | "imageWidth" | "imageHeight" | "imageTop">> =
  Object.fromEntries(
    (Object.keys(GEAR_CARD_CATEGORY) as GearCategorySlug[]).map((slug) => {
      const sample = GEAR.find((item) => item.categorySlug === slug)!;
      return [slug, { image: sample.image, imageWidth: sample.imageWidth, imageHeight: sample.imageHeight, imageTop: sample.imageTop }];
    })
  ) as Record<GearCategorySlug, Pick<GearProduct, "image" | "imageWidth" | "imageHeight" | "imageTop">>;

const rupees = (paise: number) => Math.round(paise / 100);

function toStoreBat(row: ProductWithImages, context: CatalogueContext): StoreBat {
  const seeded = BATS.find((bat) => bat.slug === row.slug);
  const status = stockStatus(row) as Exclude<StockStatus, "hidden">;
  const { regularPrice, price, offer } = pricing(row, context);
  // With no MRP, an offer is shown against the regular price.
  const mrp = row.mrpPaise ? rupees(row.mrpPaise) : regularPrice;
  const images = [...row.images].sort((a, b) => a.position - b.position).map((image) => image.url);
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
    off: percentOff(price, mrp),
    badges: row.badges.length ? row.badges : undefined,
    dark: seeded?.dark,
    rating: seeded?.rating,
    reviews: seeded?.reviews,
    details: row.description ?? `${row.name} · ${grade}`,
    willow: row.shortDescription ?? grade,
    subcategory: (isBatSubcategory(row.subcategory) ? row.subcategory : "english-willow"),
    stockStatus: status,
    soldOut: status === "out",
    stockLeft: row.stock,
    images: images.length ? images : [BAT_IMAGE],
    customization: customizationFor(row.kind, row.subcategory, row.customization),
  };
}

function toStoreGear(row: ProductWithImages, context: CatalogueContext): StoreGear {
  const category = row.category as GearCategorySlug;
  const seeded = GEAR.find((item) => item.slug === row.slug);
  const layout = seeded ?? GEAR_LAYOUT[category];
  const status = stockStatus(row) as Exclude<StockStatus, "hidden">;
  const images = [...row.images].sort((a, b) => a.position - b.position).map((image) => image.url);
  const { regularPrice, price, offer } = pricing(row, context);
  const mrp = row.mrpPaise ? rupees(row.mrpPaise) : regularPrice;
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
    badge: row.badges[0],
    href: `/shop/${category}/${row.slug}`,
    image: images[0] ?? layout.image,
    imageWidth: layout.imageWidth,
    imageHeight: layout.imageHeight,
    imageTop: layout.imageTop,
    featured: row.featured,
    stockStatus: status,
    soldOut: status === "out",
    stockLeft: row.stock,
    images: images.length ? images : [layout.image],
  };
}

/**
 * The public catalogue from database rows: hidden products are left out;
 * bats first, then gear by category. Prices include the best running offer
 * that needs no code.
 */
export function toStoreCatalogue(rows: ProductWithImages[], context: CatalogueContext = {}): StoreCatalogue {
  const visible = rows
    .filter((row) => stockStatus(row) !== "hidden")
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
 * A builder's first choices for a bat: the usual build wherever the bat
 * offers it, otherwise the first option it does offer. Indexes still refer to
 * the full BAT_WEIGHTS, BAT_PROFILES and BAT_HANDLES lists; extras the bat
 * does not offer start switched off.
 */
export function startingBatConfig(customization: BatCustomization, base: BatConfig = DEFAULT_BAT_CONFIG): BatConfig {
  const start = (labels: string[], offered: string[], index: number) => {
    if (offered.includes(labels[index])) return index;
    const first = labels.findIndex((label) => offered.includes(label));
    return first === -1 ? index : first;
  };
  const on = customization.enabled;
  return {
    ...base,
    weight: start(WEIGHT_OPTIONS, customization.weights, base.weight),
    profile: start(PROFILE_OPTIONS, customization.profiles, base.profile),
    handle: start(HANDLE_OPTIONS, customization.handles, base.handle),
    name: on && customization.engraving ? base.name : "",
    knock: on && customization.matchReady && base.knock,
    scuff: on && customization.scuffSheet && base.scuff,
  };
}

/** "Only 2 left" on a product page when a counted product is running low; null otherwise. */
export function stockNote(product: Pick<StoreGear, "stockStatus" | "stockLeft">): string | null {
  return product.stockStatus === "low" && product.stockLeft !== null ? `Only ${product.stockLeft} left` : null;
}

/** A gear product's range and note on one line, "Elite · Pro sheepskin palm", leaving out whichever is missing. */
export function gearLine(product: Pick<StoreGear, "line" | "note">): string {
  return [product.line, product.note].filter(Boolean).join(" · ");
}

const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

/** 6 → "Six", for headings that count models; beyond twelve, digits. */
export function countInWords(count: number): string {
  return NUMBER_WORDS[count] ?? String(count);
}

/** ["a", "b", "c"] → "a, b and c" (or "a, b or c"). */
export function listInWords(items: string[], conjunction: "and" | "or" = "and"): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${conjunction} ${items[items.length - 1]}`;
}
