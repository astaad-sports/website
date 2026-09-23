"use client";

import Link from "next/link";
import { Radio as RadioPrimitive } from "@base-ui/react/radio";

import { RadioGroup } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export interface SizeOption {
  /** "6", "H", "SH", "LH" */
  value: string;
  /** "(Harrow)", "(Full Size)", "Sold out" */
  hint?: string;
  /** Sold-out sizes stay visible, struck through. */
  disabled?: boolean;
}

export interface SizeSelectorProps {
  label?: string;
  sizes: SizeOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  guideHref?: string;
  className?: string;
}

/**
 * A radio group of bat sizes rendered as `rounded-sm` cells with a bold value
 * and a small hint; the chosen cell gets a `border-strong` outline. A "Size
 * Guide" link sits at the right of the label.
 */
export function SizeSelector({
  label = "Size",
  sizes,
  value,
  defaultValue,
  onChange,
  guideHref,
  className,
}: SizeSelectorProps) {
  return (
    <RadioGroup
      aria-label={label}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => onChange?.(String(next))}
      className={cn("flex w-auto flex-wrap gap-2", className)}
    >
      <div className="mb-1 flex w-full items-baseline justify-between">
        <span className="text-[15px] leading-[22px] font-semibold text-foreground">
          {label}
        </span>
        {guideHref && (
          <Link
            href={guideHref}
            className="text-[13px] leading-[18px] font-medium text-foreground underline underline-offset-[3px]"
          >
            Size Guide
          </Link>
        )}
      </div>
      {sizes.map((size) => (
        <RadioPrimitive.Root
          key={size.value}
          value={size.value}
          disabled={size.disabled}
          className="flex min-h-12 min-w-14 cursor-pointer flex-col items-center justify-center rounded-sm border-[1.5px] border-border bg-surface-raised px-3 py-1.5 text-sm leading-[18px] font-semibold text-foreground data-checked:border-border-strong data-disabled:cursor-not-allowed data-disabled:text-ink-muted data-disabled:line-through"
        >
          {size.value}
          {size.hint && (
            <small className="text-[11px] leading-[14px] font-medium text-ink-muted">
              {size.hint}
            </small>
          )}
        </RadioPrimitive.Root>
      ))}
    </RadioGroup>
  );
}
