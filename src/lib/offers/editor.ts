// The offer form: the field names it posts, and how they are checked and
// turned into an offer. Shared by the form (client) and its Server Action.
import type { OfferScope } from "@/db/schema";
import { isCategorySlug, type CategorySlug } from "@/lib/products/model";

import { CODE_PATTERN, endOfDayInIndia, isDay, MAX_PERCENT_OFF, normaliseCode, startOfDayInIndia } from "./model";

export const OFFER_NAME_MAX = 40;

/** Names offered as one-tap picks above the name field. */
export const SUGGESTED_OFFER_NAMES = ["Diwali Sale", "New Year Sale", "Republic Day Sale", "Special Sale"];

export const SCOPE_OPTIONS: { value: OfferScope; label: string; help: string }[] = [
  { value: "store", label: "Entire store", help: "Every product" },
  { value: "categories", label: "Category", help: "One or more categories" },
  { value: "products", label: "Specific products", help: "Pick products one by one" },
];

export type OfferField = "name" | "percentOff" | "dates" | "scope" | "code";

export type OfferFieldErrors = Partial<Record<OfferField, string>>;

export interface OfferValues {
  name: string;
  percentOff: number;
  startsAt: Date;
  endsAt: Date;
  scope: OfferScope;
  categories: CategorySlug[];
  productIds: string[];
  code: string | null;
}

export type ParsedOfferForm = { ok: true; values: OfferValues } | { ok: false; fieldErrors: OfferFieldErrors };

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

/**
 * Check the offer form. Fields: name, percentOff, startDate and endDate
 * (YYYY-MM-DD, India days), scope, categories and productIds (repeated),
 * code. `now` decides whether a new offer's dates have already passed.
 */
export function parseOfferForm(form: FormData, { isNew, now = new Date() }: { isNew: boolean; now?: Date }): ParsedOfferForm {
  const errors: OfferFieldErrors = {};

  const name = text(form, "name");
  if (!name) errors.name = "Enter an offer name";
  else if (name.length > OFFER_NAME_MAX) errors.name = `Keep the name under ${OFFER_NAME_MAX} characters`;

  const percentText = text(form, "percentOff").replace(/%$/, "").trim();
  const percentOff = /^\d+$/.test(percentText) ? Number(percentText) : Number.NaN;
  if (!(percentOff >= 1 && percentOff <= MAX_PERCENT_OFF)) errors.percentOff = `Enter a discount between 1 and ${MAX_PERCENT_OFF}`;

  const startDate = text(form, "startDate");
  const endDate = text(form, "endDate");
  if (!isDay(startDate) || !isDay(endDate)) errors.dates = "Choose a start and an end date";
  else if (endDate < startDate) errors.dates = "The end date can't be before the start date";
  else if (isNew && endOfDayInIndia(endDate) < now) errors.dates = "The end date has already passed";

  const scopeValue = text(form, "scope");
  const scope: OfferScope | null = scopeValue === "store" || scopeValue === "categories" || scopeValue === "products" ? scopeValue : null;
  const chosen = (field: string) =>
    [...new Set(form.getAll(field).filter((value): value is string => typeof value === "string"))];
  const categories = scope === "categories" ? chosen("categories").filter(isCategorySlug) : [];
  const productIds = scope === "products" ? chosen("productIds").filter((id) => /^[0-9a-f-]{36}$/i.test(id)) : [];
  if (!scope) errors.scope = "Choose what the offer applies to";
  else if (scope === "categories" && categories.length === 0) errors.scope = "Choose at least one category";
  else if (scope === "products" && productIds.length === 0) errors.scope = "Choose at least one product";

  const code = normaliseCode(text(form, "code"));
  if (code && !CODE_PATTERN.test(code)) errors.code = "Use 3 to 20 letters and numbers, like DIWALI20";

  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  return {
    ok: true,
    values: {
      name,
      percentOff,
      startsAt: startOfDayInIndia(startDate),
      endsAt: endOfDayInIndia(endDate),
      scope: scope!,
      categories,
      productIds,
      code: code || null,
    },
  };
}
