"use client";

import type { ProductAvailability } from "@/db/schema";
import { AVAILABILITY_OPTIONS, AVAILABILITY_RULE } from "@/lib/products/editor";
import { cn } from "@/lib/utils";

import { FieldError, FieldHelp } from "./product-editor-fields";

/** Why the choice shown differs from the one the admin made, or null. */
export function availabilityNote(chosen: ProductAvailability, shown: ProductAvailability): string | null {
  if (chosen === shown) return null;
  if (shown === "out_of_stock") return "Stock is 0, so it's set to Out of stock.";
  if (shown === "available") return "Back in stock, so it's set to Available.";
  return null;
}

/**
 * Available, Out of stock or Hidden as three radio rows, each with its help
 * line, then the stock rule. `value` is what will be saved, which the stock
 * count can change (see availabilityForSave); `note` says so when it does.
 * Available cannot be picked while the counted stock is 0.
 */
export function AvailabilityChoice({
  labelledBy,
  value,
  onChange,
  noStock,
  note,
  error,
}: {
  labelledBy: string;
  value: ProductAvailability;
  onChange: (value: ProductAvailability) => void;
  noStock: boolean;
  note: string | null;
  error?: string;
}) {
  const errorId = error ? "availability-error" : undefined;
  return (
    <div className="flex flex-col gap-3">
      <div
        role="radiogroup"
        aria-labelledby={labelledBy}
        aria-describedby={errorId}
        aria-invalid={error ? true : undefined}
        className="flex flex-col gap-1"
      >
        {AVAILABILITY_OPTIONS.map((option) => {
          const checked = value === option.value;
          const disabled = option.value === "available" && noStock;
          const helpId = `availability-${option.value}-help`;
          return (
            <label
              key={option.value}
              className={cn(
                "flex min-h-14 items-center gap-3 rounded-sm px-3 py-2 transition-colors",
                checked && "bg-surface-sunken",
                disabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-surface-sunken"
              )}
            >
              <input
                type="radio"
                name="availability"
                value={option.value}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(option.value)}
                aria-describedby={helpId}
                className="size-5 shrink-0 cursor-[inherit] appearance-none rounded-full border-[1.5px] border-ink-subtle bg-surface-raised checked:border-2 checked:border-foreground checked:bg-foreground checked:shadow-[inset_0_0_0_3px_var(--surface-raised)] disabled:border-border"
              />
              <span className="flex min-w-0 flex-col">
                <span className={cn("text-[15px] leading-[22px] font-semibold", disabled && "text-ink-subtle")}>
                  {option.label}
                </span>
                <span id={helpId} className={cn("text-[13px] leading-[18px]", disabled ? "text-ink-subtle" : "text-ink-muted")}>
                  {disabled ? "Add stock first to sell it" : option.help}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <FieldError id={errorId} message={error} />
      <FieldHelp>{AVAILABILITY_RULE}</FieldHelp>
      <p aria-live="polite" className={cn("text-[13px] leading-[18px] font-semibold", !note && "sr-only")}>
        {note}
      </p>
    </div>
  );
}
