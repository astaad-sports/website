// What a product is sold in: its sizes, whether it comes left- and
// right-handed, and how many of each are in stock. One size and hand is a
// "variant", with its own count. Pure and client-safe.
import type { OrderStockShortfall, Product, SizePrice, VariantStock } from "@/db/schema";
import {
  BAT_SIZES,
  DEFAULT_BAT_SIZE,
  GEAR_CATEGORY_CONTENT,
  HANDS,
  TENNIS_BAT_SIZES,
  type GearCategorySlug,
  type Hand,
} from "@/lib/catalogue";

/** A size a product can be sold in. */
export interface SizeOption {
  /** What is stored and ordered: a bat size code ("SH"), or the gear size itself ("Medium"). */
  code: string;
  /** As the customer reads it: "SH / Full Size". */
  label: string;
  /** Under the label in a bat size picker: who it suits, or how long it is. */
  hint?: string;
}

const WILLOW_SIZES: SizeOption[] = BAT_SIZES.map((size) => ({
  code: size.code,
  label: size.label,
  hint: `${size.age.replace(" years", " yrs")} · ${size.height.replace(/ /g, "")}`,
}));

const TENNIS_SIZES: SizeOption[] = TENNIS_BAT_SIZES.map((size) => ({
  code: size.code,
  label: size.label,
  hint: `${size.length.replace('"', "")} inches long`,
}));

function gearContent(category: string) {
  return Object.hasOwn(GEAR_CATEGORY_CONTENT, category) ? GEAR_CATEGORY_CONTENT[category as GearCategorySlug] : undefined;
}

/** Every size a product of this category (and willow type) can come in, in order: what the admin ticks from. */
export function sizeOptions(category: string, subcategory: string | null): SizeOption[] {
  if (category === "bats") return subcategory === "tennis-bats" ? TENNIS_SIZES : WILLOW_SIZES;
  return (gearContent(category)?.sizes ?? []).map((size) => ({ code: size, label: size }));
}

/** Pads and gloves can come left- and right-handed. */
export function canHaveHands(category: string): boolean {
  return Boolean(gearContent(category)?.hands);
}

/** What a new product is sold in: SH for a willow bat, both lengths for a tennis bat, and the category's usual sizes for gear. */
export function defaultOffered(category: string, subcategory: string | null): { sizes: string[]; hands: boolean } {
  const all = sizeOptions(category, subcategory).map((size) => size.code);
  if (category === "bats") {
    return { sizes: subcategory === "tennis-bats" ? all : [DEFAULT_BAT_SIZE], hands: false };
  }
  return { sizes: gearContent(category)?.newSizes ?? all, hands: canHaveHands(category) };
}

/** The size a picker starts on, when the product has it. */
function usualSize(category: string): string | undefined {
  return category === "bats" ? DEFAULT_BAT_SIZE : gearContent(category)?.defaultSize;
}

/** The columns that say what a product is sold in. */
export type OfferedFields = Pick<Product, "category" | "subcategory" | "sizes" | "hands">;

/**
 * Only sizes this kind of product comes in, in their usual order. A bat always
 * has a size: with none ticked it is sold in SH.
 */
export function offeredSizes(product: Pick<OfferedFields, "category" | "subcategory"> & { sizes: unknown }): SizeOption[] {
  const chosen = Array.isArray(product.sizes) ? product.sizes : [];
  const options = sizeOptions(product.category, product.subcategory);
  const offered = options.filter((size) => chosen.includes(size.code));
  if (offered.length === 0 && product.category === "bats") return options.filter((size) => size.code === DEFAULT_BAT_SIZE);
  return offered;
}

export function offersHands(product: Pick<OfferedFields, "category" | "hands">): boolean {
  return Boolean(product.hands) && canHaveHands(product.category);
}

/** One size and hand of a product. */
export interface Variant {
  /** Names the variant in stock counts and on order lines: "SH", "Men’s|Left hand", "" for a product sold one way. */
  key: string;
  size: string | null;
  /** "SH / Full Size" */
  sizeLabel: string | null;
  hand: Hand | null;
  /** For the admin's stock counts: "Large", "Left hand", "Men’s · Left hand". Empty for a product sold one way. */
  label: string;
}

export function variantKey(size?: string | null, hand?: string | null): string {
  return [size, hand].filter(Boolean).join("|");
}

/** Every size and hand the product is sold in: sizes in order, right hand before left. At least one. */
export function productVariants(product: OfferedFields): Variant[] {
  const sizes: (SizeOption | null)[] = offeredSizes(product);
  const hands: (Hand | null)[] = offersHands(product) ? [...HANDS] : [null];
  if (sizes.length === 0) sizes.push(null);
  return sizes.flatMap((size) =>
    hands.map((hand) => ({
      key: variantKey(size?.code, hand),
      size: size?.code ?? null,
      sizeLabel: size?.label ?? null,
      hand,
      // With one size, the hand alone tells the variants apart.
      label: [sizes.length > 1 || !hand ? size?.label : null, hand].filter(Boolean).join(" · "),
    }))
  );
}

// ---------------------------------------------------------------------------
// Prices by size

type PriceFields = OfferedFields & Pick<Product, "kind" | "pricePaise" | "mrpPaise" | "sizePrices">;

const wholePaise = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value > 0;

/**
 * The sizes of a bat sold at their own price: only sizes it is sold in, each
 * with a price and, if it has one, an MRP no lower than it. Gear has one price.
 */
export function sizePricesFor(product: Omit<PriceFields, "pricePaise" | "mrpPaise">): Record<string, SizePrice> {
  if (product.kind !== "bat") return {};
  const saved = product.sizePrices ?? {};
  const prices: Record<string, SizePrice> = {};
  for (const size of offeredSizes(product)) {
    const entry = Object.hasOwn(saved, size.code) ? saved[size.code] : undefined;
    if (!entry || !wholePaise(entry.pricePaise)) continue;
    const mrpPaise = wholePaise(entry.mrpPaise) && entry.mrpPaise >= entry.pricePaise ? entry.mrpPaise : null;
    prices[size.code] = { pricePaise: entry.pricePaise, mrpPaise };
  }
  return prices;
}

/** What one size costs before any offer: its own price and MRP, or the product's. */
export function sizePrice(product: PriceFields, size: string | null): SizePrice {
  const own = size === null ? undefined : sizePricesFor(product)[size];
  return own ?? { pricePaise: product.pricePaise, mrpPaise: product.mrpPaise };
}

// ---------------------------------------------------------------------------
// Stock

type StockFields = OfferedFields & Pick<Product, "stock" | "variantStock">;

const wholeCount = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0);

/**
 * These counts for exactly the product's variants: others are dropped, and a
 * variant without one has 0.
 */
export function countsFor(product: OfferedFields, counts: VariantStock): VariantStock {
  return Object.fromEntries(productVariants(product).map((variant) => [variant.key, wholeCount(counts[variant.key])]));
}

/**
 * How many of each variant are in stock, or null for a product that is not
 * counted. A product sold one way keeps its count in `stock` alone.
 */
export function variantCounts(product: StockFields): VariantStock | null {
  if (product.stock === null) return null;
  const variants = productVariants(product);
  if (variants.length === 1) return { [variants[0].key]: wholeCount(product.stock) };
  const saved = product.variantStock ?? {};
  if (variants.some((variant) => Object.hasOwn(saved, variant.key))) return countsFor(product, saved);
  // A count taken before the product had sizes of its own is of its usual one.
  const usual = variants.find((variant) => variant.size === usualSize(product.category)) ?? variants[0];
  return countsFor(product, { [usual.key]: product.stock });
}

export function totalStock(counts: VariantStock | null): number | null {
  return counts === null ? null : Object.values(counts).reduce((sum, count) => sum + count, 0);
}

/** The total in stock, from each variant's count; null when not counted. */
export function countedStock(product: StockFields): number | null {
  return totalStock(variantCounts(product));
}

/** The columns to store for these counts (null: not counted). */
export function stockColumns(product: OfferedFields, counts: VariantStock | null): Pick<Product, "stock" | "variantStock"> {
  if (counts === null) return { stock: null, variantStock: {} };
  const kept = countsFor(product, counts);
  return { stock: totalStock(kept), variantStock: Object.keys(kept).length > 1 ? kept : {} };
}

/** A counted product that still has stock, but none of one size or hand. */
export function hasVariantOut(counts: VariantStock | null): boolean {
  if (counts === null) return false;
  const values = Object.values(counts);
  return values.some((count) => count > 0) && values.some((count) => count <= 0);
}

export function sameCounts(a: VariantStock | null, b: VariantStock | null): boolean {
  if (a === null || b === null) return a === b;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
}

/**
 * Take `quantity` of one variant out of the counts, never below 0. An order
 * placed before each size had its own stock names no variant (and a size may
 * have been removed since): it is taken from whichever has the most. Returns
 * how many were missing.
 */
export function takeFromCounts(counts: VariantStock, key: string | null, quantity: number): number {
  let wanted = quantity;
  if (key !== null && Object.hasOwn(counts, key)) {
    const taken = Math.min(counts[key], wanted);
    counts[key] -= taken;
    return wanted - taken;
  }
  while (wanted > 0) {
    const [fullest] = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    if (fullest === undefined || counts[fullest] <= 0) break;
    const taken = Math.min(counts[fullest], wanted);
    counts[fullest] -= taken;
    wanted -= taken;
  }
  return wanted;
}

/**
 * Put `quantity` of one variant back into the counts, for a cancelled order.
 * An order placed before each size had its own stock names no variant (or a
 * size may have been removed since): it goes back only when the product has
 * a single count to go to. Returns whether it went back.
 */
export function returnToCounts(counts: VariantStock, key: string | null, quantity: number): boolean {
  const keys = Object.keys(counts);
  const target = key !== null && Object.hasOwn(counts, key) ? key : keys.length === 1 ? keys[0] : null;
  if (target === null || quantity <= 0) return false;
  counts[target] += quantity;
  return true;
}

/** What ran short on a paid order: "Legacy Pro Helmet, Large". */
export function shortfallName(line: Pick<OrderStockShortfall, "name" | "variant">): string {
  return [line.name, line.variant].filter(Boolean).join(", ");
}

// ---------------------------------------------------------------------------
// On the store

/** What a size costs on the store, in rupees, as on StoreBat. */
export interface VariantPricing {
  /** What the customer pays now, after any running offer. */
  price: number;
  /** The price before any offer. */
  regularPrice: number;
  /** Struck through beside the price: the size's MRP, or its regular price when it has none. */
  mrp: number;
  /** The "% OFF" chip. */
  off: number;
}

/** A variant as the store shows it, with what it costs and what is left of it. */
export interface StoreVariant extends Omit<Variant, "label">, VariantPricing {
  /** Counted stock of this size and hand, or null when the product is not counted. */
  left: number | null;
}

/** What a store product is sold in (part of StoreBat and StoreGear). */
export interface StoreOffered {
  /** The sizes to choose from; empty when there is no size choice. */
  sizes: SizeOption[];
  /** Whether there is a hand to choose. */
  hands: boolean;
  /** Every size and hand, with what is left of each. */
  variants: StoreVariant[];
  /** The size a picker starts on when it can be bought: SH, Medium, Men's. */
  usualSize: string | null;
  /** A size and hand with fewer left than this reads "Only 2 left". */
  lowStockThreshold: number;
}

/** `priceOf` prices one size (null for a product with no size choice): see toStoreBat and toStoreGear. */
export function storeOffered(
  product: StockFields & Pick<Product, "lowStockThreshold">,
  priceOf: (size: string | null) => VariantPricing
): StoreOffered {
  const counts = variantCounts(product);
  return {
    sizes: offeredSizes(product),
    hands: offersHands(product),
    variants: productVariants(product).map((variant) => ({
      key: variant.key,
      size: variant.size,
      sizeLabel: variant.sizeLabel,
      hand: variant.hand,
      left: counts ? counts[variant.key] : null,
      ...priceOf(variant.size),
    })),
    usualSize: usualSize(product.category) ?? null,
    lowStockThreshold: product.lowStockThreshold,
  };
}

/** A store product, as far as choosing a size and hand goes. `regularPrice` is that of its usual sizes. */
export type Sellable = Pick<StoreOffered, "variants" | "usualSize"> & { soldOut: boolean; regularPrice: number };

export function findVariant(product: Pick<StoreOffered, "variants">, size?: string | null, hand?: string | null): StoreVariant | undefined {
  const key = variantKey(size, hand);
  return product.variants.find((variant) => variant.key === key);
}

/** Whether this size and hand cannot be bought: the product is out of stock, or none of this one are left. */
export function variantSoldOut(product: Pick<Sellable, "soldOut">, variant: Pick<StoreVariant, "left"> | undefined): boolean {
  return product.soldOut || !variant || (variant.left !== null && variant.left <= 0);
}

/** Whether no hand of this size can be bought. */
export function sizeSoldOut(product: Sellable, size: string): boolean {
  return product.variants.filter((variant) => variant.size === size).every((variant) => variantSoldOut(product, variant));
}

/**
 * The size and hand a picker starts on, and a product card's cart button
 * adds: the usual one (SH, Medium, Men's; right hand) if it can be bought,
 * otherwise the first that can, otherwise the usual one. Sizes at the price
 * the card shows come before sizes with a price of their own.
 */
export function startingVariant(product: Sellable): StoreVariant {
  const inUsualSize = product.variants.filter((variant) => variant.size === product.usualSize);
  const atUsualPrice = product.variants.filter((variant) => variant.regularPrice === product.regularPrice);
  const candidates = [...inUsualSize, ...atUsualPrice, ...product.variants];
  return candidates.find((variant) => !variantSoldOut(product, variant)) ?? candidates[0];
}

/** The sizes sold at a price of their own, once each, for a line such as "Size 6 ₹ 6,999". */
export function otherPrices(product: Sellable): StoreVariant[] {
  const seen = new Set<string | null>();
  return product.variants.filter((variant) => {
    if (variant.regularPrice === product.regularPrice || seen.has(variant.size)) return false;
    seen.add(variant.size);
    return true;
  });
}

/** "Only 2 left", "Out of stock" or null, for the size and hand chosen on a product page. */
export function variantNote(
  product: Pick<Sellable, "soldOut"> & Pick<StoreOffered, "lowStockThreshold">,
  variant: StoreVariant | undefined
): string | null {
  if (variantSoldOut(product, variant)) return "Out of stock";
  if (variant && variant.left !== null && variant.left < product.lowStockThreshold) return `Only ${variant.left} left`;
  return null;
}
