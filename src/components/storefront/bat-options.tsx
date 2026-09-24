"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Radio as RadioPrimitive } from "@base-ui/react/radio";

import { RadioGroup } from "@/components/ui/radio-group";
import { DEFAULT_BAT_CONFIG, type BatConfig, type BatOption } from "@/lib/catalogue";
import { cn } from "@/lib/utils";

export type { BatConfig };

export function useBatConfig(initial?: Partial<BatConfig>) {
  const [config, setConfig] = useState<BatConfig>({ ...DEFAULT_BAT_CONFIG, ...initial });
  function update<K extends keyof BatConfig>(key: K, value: BatConfig[K]) {
    setConfig((current) => ({ ...current, [key]: value }));
  }
  return { config, update };
}

/** A labelled group of options; `badge` is the black "Free" chip. */
export function OptionGroup({
  label,
  hint,
  badge,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  badge?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  const Label = htmlFor ? "label" : "span";
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2.5">
          <Label htmlFor={htmlFor} className="text-xs leading-4 font-bold tracking-[0.2em] uppercase">
            {label}
          </Label>
          {badge}
        </div>
        {hint && <span className="text-[13px] leading-[18px] text-ink-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function FreeChip({ tone = "dark" }: { tone?: "dark" | "yellow" }) {
  return (
    <span
      className={cn(
        "h-5 px-2 text-[11px] leading-5 font-bold",
        tone === "yellow"
          ? "rounded-xs bg-surface-dark tracking-[0.1em] text-brand-yellow uppercase"
          : "rounded-full bg-surface-dark text-on-dark"
      )}
    >
      Free
    </span>
  );
}

/** Profile and handle glyphs from the design, drawn in the current ink. */
export function ProfileGlyph({ index }: { index: number }) {
  const paths = [
    "M2 24 L2 14 Q 24 4 40 8 Q 46 10 46 16 L46 24 Z",
    "M2 24 L2 12 Q 24 -2 46 12 L46 24 Z",
    "M2 24 L2 10 Q 24 -8 46 10 L46 24 Z",
  ];
  return (
    <svg width="48" height="28" viewBox="0 0 48 28" aria-hidden="true" className="shrink-0">
      <path d={paths[index] ?? paths[0]} fill="currentColor" />
      <path d="M0 26 H48" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
    </svg>
  );
}

export function HandleGlyph({ index }: { index: number }) {
  const rx = [14, 12, 9.5][index] ?? 14;
  const inner = [8, 6.5, 5][index] ?? 8;
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true" className="shrink-0">
      <ellipse cx="18" cy="18" rx={rx} ry="14" fill="currentColor" opacity="0.9" />
      <ellipse cx="18" cy="18" rx={inner} ry="8" fill="none" stroke="var(--on-dark)" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

export interface ChoiceButtonsProps {
  label: string;
  options: BatOption[];
  /** The labels this bat offers; the rest are left out. Values stay indexes into `options`. */
  offered?: string[];
  value: number;
  onChange: (index: number) => void;
  /** `button` = the compact home builder; `card` = the 88px product cards. */
  variant?: "button" | "card";
  glyph?: (index: number) => ReactNode;
  className?: string;
}

/** A radio group rendered as buttons; the chosen one turns brand-yellow. */
export function ChoiceButtons({
  label,
  options,
  offered,
  value,
  onChange,
  variant = "button",
  glyph,
  className,
}: ChoiceButtonsProps) {
  return (
    <RadioGroup
      aria-label={label}
      value={String(value)}
      onValueChange={(next) => onChange(Number(next))}
      className={cn("flex w-auto flex-wrap gap-2", variant === "card" && "gap-3", className)}
    >
      {options.map((option, index) =>
        offered && !offered.includes(option.label) ? null : (
          <RadioPrimitive.Root
            key={option.label}
            value={String(index)}
            className={cn(
              "cursor-pointer rounded-xs text-left text-foreground transition-shadow",
              variant === "button"
                ? "inline-flex h-11 items-center justify-center px-5 text-sm leading-5 font-medium data-checked:bg-brand-yellow data-checked:font-bold not-data-checked:bg-surface-raised not-data-checked:shadow-card"
                : "flex min-w-0 flex-1 basis-[180px] items-center gap-3 border-2 px-4 py-3.5 md:h-[88px] data-checked:border-brand-yellow data-checked:bg-brand-yellow not-data-checked:border-surface-raised not-data-checked:bg-surface-raised not-data-checked:shadow-card not-data-checked:hover:shadow-float"
            )}
          >
            {glyph?.(index)}
            {variant === "card" ? (
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] leading-5 font-bold">{option.label}</span>
                <span className="text-xs leading-4 opacity-70">{option.hint}</span>
              </span>
            ) : (
              option.label
            )}
          </RadioPrimitive.Root>
        )
      )}
    </RadioGroup>
  );
}

/** Yes / No. `pill` is the black-and-yellow product style; `button` the home style. */
export function YesNo({
  label,
  value,
  onChange,
  variant = "pill",
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  variant?: "pill" | "button";
}) {
  return (
    <RadioGroup
      aria-label={label}
      value={value ? "yes" : "no"}
      onValueChange={(next) => onChange(next === "yes")}
      className="flex w-auto gap-2"
    >
      {(["yes", "no"] as const).map((choice) => (
        <RadioPrimitive.Root
          key={choice}
          value={choice}
          className={cn(
            "inline-flex cursor-pointer items-center justify-center text-foreground",
            variant === "pill"
              ? "h-11 rounded-full border-2 px-7 text-[13px] leading-5 font-bold tracking-[0.1em] uppercase data-checked:border-surface-dark data-checked:bg-surface-dark data-checked:text-brand-yellow not-data-checked:border-border not-data-checked:bg-surface-raised"
              : "h-11 rounded-xs px-6 text-sm leading-5 font-medium data-checked:bg-brand-yellow data-checked:font-bold not-data-checked:bg-surface-raised not-data-checked:shadow-card"
          )}
        >
          {choice === "yes" ? "Yes" : "No"}
        </RadioPrimitive.Root>
      ))}
    </RadioGroup>
  );
}
