"use client";

import { parseRupees, sizeMrpField, sizePriceField } from "@/lib/products/editor";
import type { SizeOption } from "@/lib/products/variants";
import { cn } from "@/lib/utils";

import { FieldError, FieldHelp } from "./product-editor-fields";
import { FIELD, FIELD_LABEL } from "./styles";

/** One size's own price and MRP as typed; both empty when it sells at the bat's price. */
export interface SizePriceFields {
  price: string;
  mrp: string;
}

const EMPTY: SizePriceFields = { price: "", mrp: "" };
const rupeeFormat = new Intl.NumberFormat("en-IN");

/** "7699" reads as "7,699"; anything that is not an amount stays as typed. */
function tidy(value: string): string {
  const amount = parseRupees(value);
  return amount === null || Number.isNaN(amount) ? value : rupeeFormat.format(amount);
}

function MoneyInput({
  name,
  label,
  value,
  placeholder,
  invalid,
  describedBy,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  placeholder: string;
  invalid: boolean;
  describedBy: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative min-w-0">
      <span aria-hidden="true" className="pointer-events-none absolute top-[13px] left-3 text-[15px] leading-[22px] text-ink-muted">
        ₹
      </span>
      <input
        name={name}
        value={value}
        placeholder={placeholder}
        inputMode="numeric"
        autoComplete="off"
        aria-label={label}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => onChange(tidy(value))}
        className={cn(FIELD, "pl-[30px] tabular-nums")}
      />
    </div>
  );
}

/**
 * A bat's price by size: each size it is sold in, with an MRP and a price of
 * its own. A size left empty sells at the bat's price, which shows greyed in
 * its fields. Posts sizePrice:<size> and sizeMrp:<size> (see parseProductForm).
 */
export function ProductSizePrices({
  sizes,
  values,
  usual,
  onChange,
  error,
}: {
  sizes: SizeOption[];
  values: Record<string, SizePriceFields>;
  /** The bat's own price and MRP, as typed. */
  usual: SizePriceFields;
  onChange: (values: Record<string, SizePriceFields>) => void;
  error?: string;
}) {
  const describedBy = error ? "size-prices-error" : "size-prices-help";
  const columnLabel = "text-[13px] leading-[18px] text-ink-muted";
  return (
    <div role="group" aria-labelledby="size-prices-label" className="flex flex-col gap-2 border-t border-border pt-4">
      <span id="size-prices-label" className={FIELD_LABEL}>
        Price by size
        <span className="font-normal text-ink-muted"> (optional)</span>
      </span>
      <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
        <span />
        <span aria-hidden="true" className={columnLabel}>
          MRP
        </span>
        <span aria-hidden="true" className={columnLabel}>
          Price
        </span>
        {sizes.map((size) => {
          const entry = values[size.code] ?? EMPTY;
          const set = (patch: Partial<SizePriceFields>) => onChange({ ...values, [size.code]: { ...entry, ...patch } });
          return (
            <div key={size.code} className="contents">
              <span className="text-sm leading-5 font-semibold">{size.label}</span>
              <MoneyInput
                name={sizeMrpField(size.code)}
                label={`${size.label} MRP`}
                value={entry.mrp}
                placeholder={tidy(usual.mrp)}
                invalid={Boolean(error)}
                describedBy={describedBy}
                onChange={(mrp) => set({ mrp })}
              />
              <MoneyInput
                name={sizePriceField(size.code)}
                label={`${size.label} price`}
                value={entry.price}
                placeholder={tidy(usual.price)}
                invalid={Boolean(error)}
                describedBy={describedBy}
                onChange={(price) => set({ price })}
              />
            </div>
          );
        })}
      </div>
      {error ? (
        <FieldError id="size-prices-error" message={error} />
      ) : (
        <FieldHelp id="size-prices-help">A size left empty sells at the price above.</FieldHelp>
      )}
    </div>
  );
}
