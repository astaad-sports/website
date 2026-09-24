// The cart model, shared by the browser (to show the cart) and the server
// (to price an order). Prices always come from the store catalogue: the
// browser stores only what was chosen, never what it costs.
import { z } from "zod";

import type { BatCustomization } from "@/db/schema";
import {
  BAT_HANDLES,
  BAT_PROFILES,
  BAT_SIZES,
  BAT_WEIGHTS,
  DEFAULT_BAT_CONFIG,
  ENGRAVING_MAX,
  GEAR_CATEGORY_CONTENT,
  HANDS,
  type BatConfig,
  type GearProduct,
  type Hand,
} from "./catalogue";
import {
  couponTerms,
  offerApplies,
  offerPrice,
  offerStatus,
  type AppliedCoupon,
  type OfferTarget,
} from "./offers/model";
import { FULL_CUSTOMIZATION, MAX_SLUG_LENGTH, type StoreBat, type StoreCatalogue, type StoreGear } from "./products/model";

export const MAX_QUANTITY = 10;
export const MAX_LINES = 20;

/** Letters, digits, spaces and . ' & - — what the engraver can cut. */
const ENGRAVING_PATTERN = /^[A-Z0-9 .'&-]*$/;
const ENGRAVING_UNSUPPORTED = /[^A-Z0-9 .'&-]/g;

const quantity = z.number().int().min(1).max(MAX_QUANTITY);

const batItemSchema = z.object({
  kind: z.literal("bat"),
  slug: z.string().max(MAX_SLUG_LENGTH),
  options: z.object({
    /** A BAT_SIZES code, e.g. "SH". */
    size: z.string().max(8),
    /** BAT_WEIGHTS, BAT_PROFILES and BAT_HANDLES labels. */
    weight: z.string().max(40),
    profile: z.string().max(40),
    handle: z.string().max(40),
    engraving: z.string().max(ENGRAVING_MAX),
    knocking: z.boolean(),
    scuffSheet: z.boolean(),
  }),
  quantity,
});

const gearItemSchema = z.object({
  kind: z.literal("gear"),
  slug: z.string().max(MAX_SLUG_LENGTH),
  options: z.object({
    size: z.string().max(40).optional(),
    hand: z.enum(HANDS).optional(),
  }),
  quantity,
});

export const cartItemSchema = z.discriminatedUnion("kind", [batItemSchema, gearItemSchema]);

export type CartItem = z.infer<typeof cartItemSchema>;
export type BatCartItem = z.infer<typeof batItemSchema>;
export type GearCartItem = z.infer<typeof gearItemSchema>;

export interface CartLineOption {
  label: string;
  value: string;
}

/** A cart item resolved against the catalogue: what to show and what it costs. */
export interface PricedLine {
  key: string;
  item: CartItem;
  name: string;
  href: string;
  image: string;
  /** Every choice as label and value, for order records and detail pages. */
  options: CartLineOption[];
  /** The choices in one short line for the cart, e.g. "SH / Full Size · 1150–1180 g · Knocked in". */
  summary: string;
  /** What one costs now, after the best offer or coupon. */
  unitPricePaise: number;
  /** What one costs without any offer. */
  regularUnitPricePaise: number;
  /** The offer or coupon that set `unitPricePaise`, if any. */
  offer: LineOffer | null;
  lineTotalPaise: number;
  /**
   * Why this line cannot be bought right now: the product is out of stock, or
   * the cart asks for more than are left. Null when it can.
   */
  problem: "sold_out" | "not_enough" | null;
  /** Counted stock for this product, or null when it is not counted. */
  stockLeft: number | null;
}

/** The offer behind a line's price: one that applies by itself, or the customer's coupon (`code`). */
export interface LineOffer {
  name: string;
  percentOff: number;
  code: string | null;
}

export interface PricedCart {
  lines: PricedLine[];
  /** Items that no longer match the catalogue (a removed or hidden model, or an option it no longer offers). */
  invalid: number;
  /** Lines that match but cannot be bought now (see PricedLine.problem). */
  unavailable: number;
  count: number;
  /** The lines' totals, after offers. */
  subtotalPaise: number;
  /** What offers and coupons took off the regular prices (already out of the subtotal). */
  discountPaise: number;
  /** Free, or the charge set in Settings. */
  shippingPaise: number;
  totalPaise: number;
  /**
   * The coupon the customer entered: whether it covers anything in the cart
   * right now, and whether it took anything off (a better offer may already apply).
   */
  coupon: { code: string; name: string; covered: boolean; applied: boolean } | null;
}

const rupeesToPaise = (rupees: number) => Math.round(rupees * 100);

/** Engraving as it is cut: upper case, supported characters only, single spaces, at most 15. */
export function normaliseEngraving(text: string): string {
  return text
    .toUpperCase()
    .replace(ENGRAVING_UNSUPPORTED, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, ENGRAVING_MAX)
    .trim();
}

/** For the engraving box: drops characters the engraver cannot cut, as the customer types. */
export function cleanEngravingInput(value: string): string {
  return value.replace(/[^A-Za-z0-9 .'&-]/g, "").slice(0, ENGRAVING_MAX);
}

/** Two items with the same product and options share a line; their key is equal. */
export function lineKey(item: CartItem): string {
  const options = Object.entries(item.options)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `${item.kind}:${item.slug}:${JSON.stringify(options)}`;
}

/**
 * A bat as configured in a builder, or the standard build. Options the bat
 * does not offer are left out (a bat that cannot be customised is sold in its
 * standard build, choosing only the size); a choice it no longer offers falls
 * back to the first one it does.
 */
export function batCartItem(
  slug: string,
  config: BatConfig = DEFAULT_BAT_CONFIG,
  qty = 1,
  customization: BatCustomization = FULL_CUSTOMIZATION
): BatCartItem {
  const pick = (labels: string[], allowed: string[], index: number) => {
    const label = labels[index];
    return label && allowed.includes(label) ? label : (allowed[0] ?? "");
  };
  const on = customization.enabled;
  return {
    kind: "bat",
    slug,
    options: {
      size: BAT_SIZES[config.size]?.code ?? "",
      weight: on ? pick(BAT_WEIGHTS.map((entry) => entry.label), customization.weights, config.weight) : "",
      profile: on ? pick(BAT_PROFILES.map((entry) => entry.label), customization.profiles, config.profile) : "",
      handle: on ? pick(BAT_HANDLES.map((entry) => entry.label), customization.handles, config.handle) : "",
      engraving: on && customization.engraving ? normaliseEngraving(config.name) : "",
      knocking: on && customization.matchReady ? config.knock : false,
      scuffSheet: on && customization.scuffSheet ? config.scuff : false,
    },
    quantity: qty,
  };
}

/** A gear product with its size and hand, defaulting to the category's usual choice. */
export function gearCartItem(
  product: Pick<GearProduct, "slug" | "categorySlug">,
  choice: { size?: string; hand?: Hand } = {},
  qty = 1
): GearCartItem {
  const content = GEAR_CATEGORY_CONTENT[product.categorySlug];
  return {
    kind: "gear",
    slug: product.slug,
    options: {
      size: content.sizes ? (choice.size ?? content.defaultSize ?? content.sizes[0]) : undefined,
      hand: content.hands ? (choice.hand ?? HANDS[0]) : undefined,
    },
    quantity: qty,
  };
}

type PricedFields = Omit<PricedLine, "key" | "item" | "lineTotalPaise" | "problem" | "unitPricePaise" | "regularUnitPricePaise" | "offer"> & {
  soldOut: boolean;
  product: Pick<StoreBat | StoreGear, "price" | "regularPrice" | "offer">;
  target: OfferTarget;
};

/** Whether the chosen build is one this bat offers. */
function batOptionsValid(options: BatCartItem["options"], customization: BatCustomization): boolean {
  if (options.engraving !== normaliseEngraving(options.engraving) || !ENGRAVING_PATTERN.test(options.engraving)) {
    return false;
  }
  if (!customization.enabled) {
    return !options.weight && !options.profile && !options.handle && !options.engraving && !options.knocking && !options.scuffSheet;
  }
  return (
    customization.weights.includes(options.weight) &&
    customization.profiles.includes(options.profile) &&
    customization.handles.includes(options.handle) &&
    (customization.engraving || !options.engraving) &&
    (customization.matchReady || !options.knocking) &&
    (customization.scuffSheet || !options.scuffSheet)
  );
}

function priceBat(item: BatCartItem, catalogue: StoreCatalogue): PricedFields | null {
  const bat = catalogue.bats.find((entry) => entry.slug === item.slug);
  const { options } = item;
  const size = BAT_SIZES.find((entry) => entry.code === options.size);
  if (!bat || !size || !batOptionsValid(options, bat.customization)) return null;
  const custom = bat.customization.enabled;

  return {
    name: `Astaad ${bat.name}`,
    href: `/bats/${bat.slug}`,
    image: bat.images[0],
    options: [
      { label: "Willow", value: bat.grade },
      { label: "Size", value: size.label },
      ...(options.weight ? [{ label: "Weight", value: options.weight }] : []),
      ...(options.profile ? [{ label: "Profile", value: options.profile }] : []),
      ...(options.handle ? [{ label: "Handle", value: options.handle }] : []),
      ...(options.engraving ? [{ label: "Engraving", value: options.engraving }] : []),
      ...(custom && bat.customization.matchReady ? [{ label: "Knocking", value: options.knocking ? "Yes" : "No" }] : []),
      ...(custom && bat.customization.scuffSheet ? [{ label: "Scuff sheet", value: options.scuffSheet ? "Yes" : "No" }] : []),
    ],
    summary: [
      size.label,
      options.weight,
      options.profile,
      options.handle ? `${options.handle} handle` : null,
      options.engraving ? `Engraved \u201c${options.engraving}\u201d` : null,
      options.knocking ? "Knocked in" : null,
      options.scuffSheet ? "Scuff sheet" : null,
    ]
      .filter(Boolean)
      .join(" \u00b7 "),
    // Customisation is included in the price.
    product: bat,
    target: { id: bat.id, category: "bats" },
    soldOut: bat.soldOut,
    stockLeft: bat.stockLeft,
  };
}

function priceGear(item: GearCartItem, catalogue: StoreCatalogue): PricedFields | null {
  const product = catalogue.gear.find((entry) => entry.slug === item.slug);
  if (!product) return null;
  const content = GEAR_CATEGORY_CONTENT[product.categorySlug];
  const { size, hand } = item.options;

  // A sized category needs one of its sizes; an unsized one takes none. Same for hands.
  const sizeOk = content.sizes ? size !== undefined && content.sizes.includes(size) : size === undefined;
  const handOk = content.hands ? hand !== undefined : hand === undefined;
  if (!sizeOk || !handOk) return null;

  return {
    name: `Astaad ${product.name}`,
    href: product.href ?? `/shop/${product.categorySlug}/${product.slug}`,
    image: product.images[0] ?? product.image,
    options: [
      ...(size ? [{ label: "Size", value: size }] : []),
      ...(hand ? [{ label: "Hand", value: hand }] : []),
    ],
    summary: [size, hand].filter(Boolean).join(" \u00b7 "),
    product,
    target: { id: product.id, category: product.categorySlug },
    soldOut: product.soldOut,
    stockLeft: product.stockLeft,
  };
}

/**
 * Whether the coupon is running at `now`. With `now` null its dates are
 * taken as checked already: the browser trusts the server, which checked the
 * code when it was entered and checks it again for the order, rather than a
 * device clock that may be wrong.
 */
function couponRunning(coupon: AppliedCoupon, now: Date | null): boolean {
  return now === null || offerStatus(couponTerms(coupon), now) === "active";
}

/**
 * The price of one: the product's price on the store (which includes its best
 * offer that needs no code), or the coupon's, whichever is lower. Offers never
 * add up.
 */
function unitPrice(
  fields: Pick<PricedFields, "product" | "target">,
  coupon: AppliedCoupon | null,
  now: Date | null
): Pick<PricedLine, "unitPricePaise" | "regularUnitPricePaise" | "offer"> {
  const { product, target } = fields;
  const regularUnitPricePaise = rupeesToPaise(product.regularPrice);
  let unitPricePaise = rupeesToPaise(product.price);
  let offer: LineOffer | null = product.offer
    ? { name: product.offer.name, percentOff: product.offer.percentOff, code: null }
    : null;
  if (coupon) {
    const terms = couponTerms(coupon);
    if (couponRunning(coupon, now) && offerApplies(terms, target)) {
      const couponPaise = rupeesToPaise(offerPrice(product.regularPrice, coupon.percentOff));
      if (couponPaise < unitPricePaise) {
        unitPricePaise = couponPaise;
        offer = { name: coupon.name, percentOff: coupon.percentOff, code: coupon.code };
      }
    }
  }
  return { unitPricePaise, regularUnitPricePaise, offer };
}

/**
 * Resolve one item against the catalogue, or null if it no longer matches.
 * Stock is judged for this line alone; priceCart also adds up lines of the same product.
 */
export function priceCartItem(
  item: CartItem,
  catalogue: StoreCatalogue,
  coupon: AppliedCoupon | null = null,
  now: Date | null = new Date()
): PricedLine | null {
  const priced = item.kind === "bat" ? priceBat(item, catalogue) : priceGear(item, catalogue);
  if (!priced) return null;
  const { soldOut, product, target, ...fields } = priced;
  const price = unitPrice({ product, target }, coupon, now);
  const tooMany = fields.stockLeft !== null && item.quantity > fields.stockLeft;
  return {
    ...fields,
    ...price,
    key: lineKey(item),
    item,
    lineTotalPaise: price.unitPricePaise * item.quantity,
    problem: soldOut ? "sold_out" : tooMany ? "not_enough" : null,
  };
}

/** The product behind a cart item, as offers see it. */
function lineTarget(item: CartItem, catalogue: StoreCatalogue): OfferTarget | undefined {
  if (item.kind === "bat") {
    const bat = catalogue.bats.find((entry) => entry.slug === item.slug);
    return bat && { id: bat.id, category: "bats" };
  }
  const product = catalogue.gear.find((entry) => entry.slug === item.slug);
  return product && { id: product.id, category: product.categorySlug };
}

/** Whether a running coupon covers any product in these lines. */
function couponCovers(coupon: AppliedCoupon, lines: PricedLine[], catalogue: StoreCatalogue, now: Date | null): boolean {
  const terms = couponTerms(coupon);
  if (!couponRunning(coupon, now)) return false;
  return lines.some((line) => {
    const target = lineTarget(line.item, catalogue);
    return target !== undefined && offerApplies(terms, target);
  });
}

/**
 * Price a whole cart, with the customer's coupon if they entered one. Lines
 * that no longer match the catalogue are dropped and counted; lines that
 * match but cannot be bought now (sold out, or more than are left across all
 * lines of that product) are kept and flagged.
 */
export function priceCart(
  items: CartItem[],
  catalogue: StoreCatalogue,
  coupon: AppliedCoupon | null = null,
  /** When to check the coupon's dates; null in the browser (see couponRunning). */
  now: Date | null = new Date()
): PricedCart {
  const lines: PricedLine[] = [];
  let invalid = 0;
  for (const item of items) {
    const line = priceCartItem(item, catalogue, coupon, now);
    if (line) lines.push(line);
    else invalid += 1;
  }

  // Different builds of one bat share its stock.
  const wanted = new Map<string, number>();
  for (const line of lines) wanted.set(line.item.slug, (wanted.get(line.item.slug) ?? 0) + line.item.quantity);
  for (const line of lines) {
    if (!line.problem && line.stockLeft !== null && (wanted.get(line.item.slug) ?? 0) > line.stockLeft) {
      line.problem = "not_enough";
    }
  }

  const subtotalPaise = lines.reduce((sum, line) => sum + line.lineTotalPaise, 0);
  const discountPaise = lines.reduce(
    (sum, line) => sum + (line.regularUnitPricePaise - line.unitPricePaise) * line.item.quantity,
    0
  );
  const shippingPaise = lines.length ? catalogue.deliveryFeePaise : 0;
  return {
    lines,
    invalid,
    unavailable: lines.filter((line) => line.problem).length,
    count: lines.reduce((sum, line) => sum + line.item.quantity, 0),
    subtotalPaise,
    discountPaise,
    shippingPaise,
    totalPaise: subtotalPaise + shippingPaise,
    coupon: coupon
      ? {
          code: coupon.code,
          name: coupon.name,
          covered: couponCovers(coupon, lines, catalogue, now),
          applied: lines.some((line) => line.offer?.code === coupon.code),
        }
      : null,
  };
}

/** What the cart says under a line that cannot be bought, or null. */
export function lineProblemText(line: Pick<PricedLine, "problem" | "stockLeft" | "item">): string | null {
  if (line.problem === "sold_out") return "Out of stock. Remove it to check out.";
  if (line.problem !== "not_enough") return null;
  // This line fits on its own; only together with another line of the same product does it not.
  if (line.stockLeft !== null && line.item.quantity <= line.stockLeft) {
    return `Only ${line.stockLeft} left in total. Remove one to check out.`;
  }
  return `Only ${line.stockLeft} left. Lower the quantity to check out.`;
}

/** Add an item to a list of items, merging it into a matching line. */
export function addToItems(items: CartItem[], item: CartItem): CartItem[] {
  const key = lineKey(item);
  const existing = items.find((entry) => lineKey(entry) === key);
  if (existing) {
    return items.map((entry) =>
      entry === existing
        ? { ...entry, quantity: Math.min(MAX_QUANTITY, entry.quantity + item.quantity) }
        : entry
    );
  }
  if (items.length >= MAX_LINES) return items;
  return [...items, item];
}
