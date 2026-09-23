// The cart model, shared by the browser (to show the cart) and the server
// (to price an order). Prices always come from the catalogue: the browser
// stores only what was chosen, never what it costs.
import { z } from "zod";

import {
  BAT_HANDLES,
  BAT_IMAGE,
  BAT_PROFILES,
  BAT_SIZES,
  BAT_WEIGHTS,
  DEFAULT_BAT_CONFIG,
  ENGRAVING_MAX,
  GEAR_CATEGORY_CONTENT,
  gearHref,
  getBat,
  getGear,
  HANDS,
  type BatConfig,
  type GearProduct,
  type Hand,
} from "./catalogue";

export const MAX_QUANTITY = 10;
export const MAX_LINES = 20;

/** Letters, digits, spaces and . ' & - — what the engraver can cut. */
const ENGRAVING_PATTERN = /^[A-Z0-9 .'&-]*$/;
const ENGRAVING_UNSUPPORTED = /[^A-Z0-9 .'&-]/g;

const quantity = z.number().int().min(1).max(MAX_QUANTITY);

const batItemSchema = z.object({
  kind: z.literal("bat"),
  slug: z.string().max(64),
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
  slug: z.string().max(64),
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
  unitPricePaise: number;
  lineTotalPaise: number;
}

export interface PricedCart {
  lines: PricedLine[];
  /** Items that no longer match the catalogue (a removed model or option). */
  invalid: number;
  count: number;
  subtotalPaise: number;
  /** Delivery is free across India. */
  shippingPaise: number;
  totalPaise: number;
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

/** A bat as configured in a builder, or the standard build. */
export function batCartItem(slug: string, config: BatConfig = DEFAULT_BAT_CONFIG, qty = 1): BatCartItem {
  return {
    kind: "bat",
    slug,
    options: {
      size: BAT_SIZES[config.size]?.code ?? "",
      weight: BAT_WEIGHTS[config.weight]?.label ?? "",
      profile: BAT_PROFILES[config.profile]?.label ?? "",
      handle: BAT_HANDLES[config.handle]?.label ?? "",
      engraving: normaliseEngraving(config.name),
      knocking: config.knock,
      scuffSheet: config.scuff,
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

function priceBat(item: BatCartItem): Omit<PricedLine, "key" | "item" | "lineTotalPaise"> | null {
  const bat = getBat(item.slug);
  const { options } = item;
  const size = BAT_SIZES.find((entry) => entry.code === options.size);
  const valid =
    bat &&
    size &&
    BAT_WEIGHTS.some((entry) => entry.label === options.weight) &&
    BAT_PROFILES.some((entry) => entry.label === options.profile) &&
    BAT_HANDLES.some((entry) => entry.label === options.handle) &&
    options.engraving === normaliseEngraving(options.engraving) &&
    ENGRAVING_PATTERN.test(options.engraving);
  if (!valid) return null;

  return {
    name: `Astaad ${bat.name}`,
    href: `/bats/${bat.slug}`,
    image: BAT_IMAGE,
    options: [
      { label: "Willow", value: bat.grade },
      { label: "Size", value: size.label },
      { label: "Weight", value: options.weight },
      { label: "Profile", value: options.profile },
      { label: "Handle", value: options.handle },
      ...(options.engraving ? [{ label: "Engraving", value: options.engraving }] : []),
      { label: "Knocking", value: options.knocking ? "Yes" : "No" },
      { label: "Scuff sheet", value: options.scuffSheet ? "Yes" : "No" },
    ],
    summary: [
      size.label,
      options.weight,
      options.profile,
      `${options.handle} handle`,
      options.engraving ? `Engraved \u201c${options.engraving}\u201d` : null,
      options.knocking ? "Knocked in" : null,
      options.scuffSheet ? "Scuff sheet" : null,
    ]
      .filter(Boolean)
      .join(" \u00b7 "),
    // Customisation is included in the price.
    unitPricePaise: rupeesToPaise(bat.price),
  };
}

function priceGear(item: GearCartItem): Omit<PricedLine, "key" | "item" | "lineTotalPaise"> | null {
  const product = getGear(item.slug);
  if (!product) return null;
  const content = GEAR_CATEGORY_CONTENT[product.categorySlug];
  const { size, hand } = item.options;

  // A sized category needs one of its sizes; an unsized one takes none. Same for hands.
  const sizeOk = content.sizes ? size !== undefined && content.sizes.includes(size) : size === undefined;
  const handOk = content.hands ? hand !== undefined : hand === undefined;
  if (!sizeOk || !handOk) return null;

  return {
    name: `Astaad ${product.name}`,
    href: gearHref(product),
    image: product.image,
    options: [
      ...(size ? [{ label: "Size", value: size }] : []),
      ...(hand ? [{ label: "Hand", value: hand }] : []),
    ],
    summary: [size, hand].filter(Boolean).join(" \u00b7 "),
    unitPricePaise: rupeesToPaise(product.price),
  };
}

/** Resolve one item against the catalogue, or null if it no longer matches. */
export function priceCartItem(item: CartItem): PricedLine | null {
  const priced = item.kind === "bat" ? priceBat(item) : priceGear(item);
  if (!priced) return null;
  return {
    ...priced,
    key: lineKey(item),
    item,
    lineTotalPaise: priced.unitPricePaise * item.quantity,
  };
}

/** Price a whole cart. Lines that no longer match the catalogue are dropped and counted. */
export function priceCart(items: CartItem[]): PricedCart {
  const lines: PricedLine[] = [];
  let invalid = 0;
  for (const item of items) {
    const line = priceCartItem(item);
    if (line) lines.push(line);
    else invalid += 1;
  }
  const subtotalPaise = lines.reduce((sum, line) => sum + line.lineTotalPaise, 0);
  const shippingPaise = 0;
  return {
    lines,
    invalid,
    count: lines.reduce((sum, line) => sum + line.item.quantity, 0),
    subtotalPaise,
    shippingPaise,
    totalPaise: subtotalPaise + shippingPaise,
  };
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
