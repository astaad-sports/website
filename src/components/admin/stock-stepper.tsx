"use client";

import type { Ref } from "react";
import { Minus, Plus } from "lucide-react";

import { PRODUCT_LIMITS } from "@/lib/products/editor";
import { cn } from "@/lib/utils";

/** Digits only, never above the largest count the store accepts. "" means not counted. */
export function cleanCount(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, String(PRODUCT_LIMITS.maxStock).length);
  return digits === "" ? "" : String(Math.min(Number(digits), PRODUCT_LIMITS.maxStock));
}

/** The field's value as a count: null when empty. */
export function countValue(value: string): number | null {
  return value === "" ? null : Number(value);
}

const SIZES = {
  md: { box: "h-11", button: "size-11", input: "h-11 w-12 text-[15px] font-semibold" },
  lg: { box: "h-12", button: "size-12", input: "h-12 w-18 text-xl font-bold" },
} as const;

/**
 * [ − ] 10 [ + ]: a count that never goes below 0. The field takes typed
 * numbers too; `label` names the count for the buttons ("Decrease new
 * stock", "Increase stock for Run Machine") and, capitalised, the field
 * when no visible label does. At 0 the − button stays focusable but does
 * nothing, so holding it down never drops keyboard focus.
 */
export function StockStepper({
  id,
  name,
  value,
  onChange,
  label,
  hasVisibleLabel,
  size = "md",
  surface = "sunken",
  invalid,
  describedBy,
  placeholder,
  inputRef,
}: {
  id?: string;
  /** Set when the field posts with its form. */
  name?: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  /** A visible <label htmlFor={id}> names the field; otherwise `label` does. */
  hasVisibleLabel?: boolean;
  size?: keyof typeof SIZES;
  /** Sunken grey on a white page; raised white inside a grey panel. */
  surface?: "sunken" | "raised";
  invalid?: boolean;
  describedBy?: string;
  placeholder?: string;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const count = countValue(value);
  const atMin = count === null || count <= 0;
  const atMax = count !== null && count >= PRODUCT_LIMITS.maxStock;
  const sizing = SIZES[size];
  const buttonClass = cn(
    sizing.button,
    "flex shrink-0 cursor-pointer items-center justify-center rounded-sm text-foreground transition-colors hover:bg-border/60 aria-disabled:cursor-not-allowed aria-disabled:text-ink-subtle aria-disabled:hover:bg-transparent"
  );
  const iconClass = size === "lg" ? "size-5" : "size-4";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-sm",
        sizing.box,
        surface === "sunken" ? "bg-surface-sunken" : "bg-surface-raised",
        invalid && "ring-1 ring-danger"
      )}
    >
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        aria-disabled={atMin || undefined}
        onClick={() => {
          if (!atMin) onChange(String((count ?? 0) - 1));
        }}
        className={buttonClass}
      >
        <Minus className={iconClass} strokeWidth={2} aria-hidden="true" />
      </button>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label={hasVisibleLabel ? undefined : `${label.charAt(0).toUpperCase()}${label.slice(1)}`}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(cleanCount(event.target.value))}
        onFocus={(event) => event.target.select()}
        className={cn(
          sizing.input,
          "min-w-0 bg-transparent p-0 text-center text-foreground tabular-nums placeholder:font-normal placeholder:text-ink-subtle focus-visible:outline-offset-0"
        )}
      />
      <button
        type="button"
        aria-label={`Increase ${label}`}
        aria-disabled={atMax || undefined}
        onClick={() => {
          if (!atMax) onChange(String((count ?? 0) + 1));
        }}
        className={buttonClass}
      >
        <Plus className={iconClass} strokeWidth={2} aria-hidden="true" />
      </button>
    </span>
  );
}
