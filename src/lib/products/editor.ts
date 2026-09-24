// The product editor's form: the field names it posts, and how they are
// checked and turned into a product. Shared by the editor (client) and its
// Server Action, so both use the same rules and messages.
import type { BatCustomization, ProductAvailability } from "@/db/schema";

import {
  HANDLE_OPTIONS,
  isBatSubcategory,
  isCategorySlug,
  normaliseCustomization,
  NO_CUSTOMIZATION,
  PROFILE_OPTIONS,
  TOE_OPTIONS,
  WEIGHT_OPTIONS,
  type BatSubcategory,
  type CategorySlug,
} from "./model";

export const AVAILABILITY_OPTIONS: { value: ProductAvailability; label: string; help: string }[] = [
  { value: "available", label: "Available", help: "Shown on the store and can be bought" },
  { value: "out_of_stock", label: "Out of stock", help: "Visible on the store, can't be bought" },
  { value: "hidden", label: "Hidden", help: "Not shown on the store" },
];

/** The rule the editor states under Availability. */
export const AVAILABILITY_RULE = "Stock 0 sets Out of stock. Restocking makes it available again unless it's hidden.";

export const PRODUCT_LIMITS = {
  name: 60,
  tagline: 40,
  line: 30,
  grade: 60,
  shortDescription: 160,
  description: 600,
  sku: 32,
  maxPriceRupees: 1_000_000,
  maxStock: 9999,
  maxThreshold: 999,
  /** A product photo, after the browser has shrunk it (see shrink-image.ts and storage.ts). */
  maxPhotoBytes: 4 * 1024 * 1024,
} as const;

export type ProductField =
  | "name"
  | "category"
  | "subcategory"
  | "tagline"
  | "line"
  | "grade"
  | "price"
  | "mrp"
  | "stock"
  | "lowStockThreshold"
  | "sku"
  | "availability"
  | "shortDescription"
  | "description"
  | "customization";

export type ProductFieldErrors = Partial<Record<ProductField, string>>;

/** What the editor saves. Money in paise; `stock` null means not counted. */
export interface ProductValues {
  kind: "bat" | "gear";
  category: CategorySlug;
  subcategory: BatSubcategory | null;
  name: string;
  tagline: string | null;
  /** Gear range, e.g. "Elite". */
  line: string | null;
  grade: string | null;
  /** Bats: the willow grade note. Gear: the short note under the name (stored as `note`). */
  shortDescription: string | null;
  description: string | null;
  pricePaise: number;
  mrpPaise: number | null;
  stock: number | null;
  lowStockThreshold: number;
  sku: string | null;
  availability: ProductAvailability;
  customization: BatCustomization | null;
}

export type ParsedProductForm = { ok: true; values: ProductValues } | { ok: false; fieldErrors: ProductFieldErrors };

const AVAILABILITY_VALUES = AVAILABILITY_OPTIONS.map((option) => option.value);

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

/** "₹ 7,699", "7699" or "7,699.00" → 7699; null when empty; NaN when not a whole number of rupees. */
export function parseRupees(value: string): number | null {
  const cleaned = value.replace(/[₹,\s]/g, "").replace(/\.0+$/, "");
  if (cleaned === "") return null;
  return /^\d+$/.test(cleaned) ? Number(cleaned) : Number.NaN;
}

/** A whole number from a field, null when empty, NaN when not a whole number. */
export function parseCount(value: string): number | null {
  const cleaned = value.replace(/[,\s]/g, "");
  if (cleaned === "") return null;
  return /^\d+$/.test(cleaned) ? Number(cleaned) : Number.NaN;
}

/** SKUs are upper case letters, digits and dashes: "AST-RM-G4". */
export function normaliseSku(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "-");
}

/**
 * Check the editor's fields. Field names match ProductField, plus the
 * customisation group: `customEnabled`, `customWeights`, `customProfiles`,
 * `customToes`, `customHandles` (each repeated) and `customEngraving`,
 * `customMatchReady`, `customScuffSheet` (checkboxes).
 */
export function parseProductForm(form: FormData): ParsedProductForm {
  const errors: ProductFieldErrors = {};

  const name = text(form, "name");
  if (!name) errors.name = "Enter the product name.";
  else if (name.length > PRODUCT_LIMITS.name) errors.name = `Keep the name under ${PRODUCT_LIMITS.name} characters.`;

  const category = text(form, "category");
  if (!isCategorySlug(category)) errors.category = "Choose a category.";
  const kind = category === "bats" ? "bat" : "gear";

  const subcategoryValue = text(form, "subcategory");
  let subcategory: BatSubcategory | null = null;
  if (kind === "bat") {
    if (isBatSubcategory(subcategoryValue)) subcategory = subcategoryValue;
    else errors.subcategory = "Choose the willow type.";
  }

  const optional = (field: "tagline" | "line" | "grade" | "shortDescription" | "description") => {
    const value = text(form, field);
    if (value.length > PRODUCT_LIMITS[field]) errors[field] = `Keep this under ${PRODUCT_LIMITS[field]} characters.`;
    return value || null;
  };
  const tagline = kind === "bat" ? optional("tagline") : null;
  const line = kind === "gear" ? optional("line") : null;
  const grade = kind === "bat" ? optional("grade") : null;
  const shortDescription = optional("shortDescription");
  const description = kind === "bat" ? optional("description") : null;

  const price = parseRupees(text(form, "price"));
  if (price === null) errors.price = "Enter the price.";
  else if (Number.isNaN(price) || price < 1 || price > PRODUCT_LIMITS.maxPriceRupees) {
    errors.price = "Enter the price in whole rupees, for example 7699.";
  }

  const mrp = parseRupees(text(form, "mrp"));
  if (mrp !== null) {
    if (Number.isNaN(mrp) || mrp > PRODUCT_LIMITS.maxPriceRupees) errors.mrp = "Enter the MRP in whole rupees, for example 10999.";
    else if (price !== null && !Number.isNaN(price) && mrp < price) errors.mrp = "The MRP can't be lower than the price.";
  }

  const stock = parseCount(text(form, "stock"));
  if (stock !== null && (Number.isNaN(stock) || stock > PRODUCT_LIMITS.maxStock)) {
    errors.stock = `Enter a whole number from 0 to ${PRODUCT_LIMITS.maxStock}, or leave it empty.`;
  }

  const threshold = parseCount(text(form, "lowStockThreshold"));
  if (threshold === null || Number.isNaN(threshold) || threshold > PRODUCT_LIMITS.maxThreshold) {
    errors.lowStockThreshold = "Enter a whole number, for example 3.";
  }

  const sku = normaliseSku(text(form, "sku"));
  if (sku && !/^[A-Z0-9][A-Z0-9-]*$/.test(sku)) errors.sku = "Use letters, numbers and dashes only.";
  else if (sku.length > PRODUCT_LIMITS.sku) errors.sku = `Keep the SKU under ${PRODUCT_LIMITS.sku} characters.`;

  const availability = text(form, "availability") as ProductAvailability;
  if (!AVAILABILITY_VALUES.includes(availability)) errors.availability = "Choose Available, Out of stock or Hidden.";

  let customization: BatCustomization | null = null;
  if (kind === "bat") {
    const enabled = subcategory === "english-willow" && form.get("customEnabled") === "on";
    if (enabled) {
      const chosen = (field: string) => form.getAll(field).filter((value): value is string => typeof value === "string");
      const weights = chosen("customWeights").filter((value) => WEIGHT_OPTIONS.includes(value));
      const profiles = chosen("customProfiles").filter((value) => PROFILE_OPTIONS.includes(value));
      const handles = chosen("customHandles").filter((value) => HANDLE_OPTIONS.includes(value));
      if (!weights.length || !profiles.length || !handles.length) {
        errors.customization = "Pick at least one weight, profile and handle, or turn customization off.";
      }
      customization = normaliseCustomization({
        enabled: true,
        weights,
        profiles,
        // None ticked is allowed: the bat then has no toe choice.
        toes: chosen("customToes").filter((value) => TOE_OPTIONS.includes(value)),
        handles,
        engraving: form.get("customEngraving") === "on",
        matchReady: form.get("customMatchReady") === "on",
        scuffSheet: form.get("customScuffSheet") === "on",
      });
    } else {
      customization = NO_CUSTOMIZATION;
    }
  }

  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };

  return {
    ok: true,
    values: {
      kind,
      category: category as CategorySlug,
      subcategory,
      name,
      tagline,
      line,
      grade,
      shortDescription,
      description,
      pricePaise: price! * 100,
      mrpPaise: mrp === null ? null : mrp * 100,
      stock,
      lowStockThreshold: threshold!,
      sku: sku || null,
      availability,
      customization,
    },
  };
}

/** The database columns for these values (gear keeps its short note in `note`). */
export function productColumns(values: ProductValues) {
  const { kind, shortDescription, ...rest } = values;
  return kind === "bat"
    ? { ...rest, shortDescription, note: null }
    : { ...rest, shortDescription: null, note: shortDescription };
}
