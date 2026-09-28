"use client";

import type { Ref } from "react";

import type { VariantStock } from "@/db/schema";
import { sameCounts } from "@/lib/products/variants";
import { cn } from "@/lib/utils";

import { hasVariants, type ProductListItem } from "./product-row";
import { countValue, StockStepper } from "./stock-stepper";
import { FIELD_LABEL } from "./styles";

type Counted = Pick<ProductListItem, "variants" | "counts">;

/** The count of each size and hand as its field holds it, by variant key. "" is an empty field. */
export type CountFields = Record<string, string>;

/** The fields for a product's saved counts; all empty when it is not counted. */
export function countFields(item: Counted): CountFields {
  return Object.fromEntries(item.variants.map((variant) => [variant.key, item.counts?.[variant.key]?.toString() ?? ""]));
}

/**
 * The counts these fields stand for. With every field empty the product is
 * not counted (null); once one is filled in, an empty one counts as 0.
 */
export function fieldCounts(item: Pick<Counted, "variants">, fields: CountFields): VariantStock | null {
  if (item.variants.every((variant) => (fields[variant.key] ?? "") === "")) return null;
  return Object.fromEntries(item.variants.map((variant) => [variant.key, countValue(fields[variant.key] ?? "") ?? 0]));
}

export function fieldsChanged(item: Counted, fields: CountFields): boolean {
  return !sameCounts(fieldCounts(item, fields), item.counts);
}

/**
 * A product's stock count: one stepper, or for a product sold in several
 * sizes or hands, one for each with its name beside it. The first field gets
 * `id` and `inputRef`; `fieldName` gives each field the name it posts as.
 */
export function StockFields({
  id,
  item,
  subject,
  fields,
  onChange,
  fieldName,
  hasVisibleLabel,
  size,
  surface,
  invalid,
  describedBy,
  placeholder,
  inputRef,
  className,
}: {
  id: string;
  item: Pick<ProductListItem, "variants">;
  /** What is being counted, for the buttons: "stock for Run Machine", "new stock". */
  subject: string;
  fields: CountFields;
  onChange: (key: string, value: string) => void;
  fieldName?: (key: string) => string;
  /** A visible <label htmlFor={id}> names a lone field. */
  hasVisibleLabel?: boolean;
  size?: "md" | "lg";
  surface?: "sunken" | "raised";
  invalid?: boolean;
  describedBy?: string;
  placeholder?: string;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
}) {
  if (!hasVariants(item)) {
    const [only] = item.variants;
    return (
      <StockStepper
        id={id}
        name={fieldName?.(only.key)}
        value={fields[only.key] ?? ""}
        onChange={(value) => onChange(only.key, value)}
        label={subject}
        hasVisibleLabel={hasVisibleLabel}
        size={size}
        surface={surface}
        invalid={invalid}
        describedBy={describedBy}
        placeholder={placeholder}
        inputRef={inputRef}
      />
    );
  }
  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {item.variants.map((variant, index) => {
        const fieldId = index === 0 ? id : `${id}-${index}`;
        return (
          <li key={variant.key} className="flex items-center justify-between gap-3">
            <label htmlFor={fieldId} className={cn(FIELD_LABEL, "min-w-0")}>
              {variant.label}
            </label>
            <StockStepper
              id={fieldId}
              name={fieldName?.(variant.key)}
              value={fields[variant.key] ?? ""}
              onChange={(value) => onChange(variant.key, value)}
              // Named in full, since a page can have a "Large" for every product.
              label={`${subject}, ${variant.label}`}
              size={size}
              surface={surface}
              invalid={invalid}
              describedBy={describedBy}
              placeholder={placeholder}
              inputRef={index === 0 ? inputRef : undefined}
            />
          </li>
        );
      })}
    </ul>
  );
}
