import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { Icon } from "./icon";

export interface SearchInputProps
  extends Omit<ComponentProps<typeof Input>, "type"> {
  /** The accessible name of the field. */
  label?: string;
  /** Dark field for the nav bar: `surface-dark-raised` with `border-on-dark`. */
  onDark?: boolean;
  /** Classes for the pill wrapper (width, visibility). */
  wrapperClassName?: string;
}

/**
 * A pill search field with a leading search icon. On `surface` it sits on
 * `surface-sunken` with a `border`; in the dark nav bar pass `onDark`.
 */
export function SearchInput({
  label = "Search products",
  placeholder = "Search for bats, gloves, helmets...",
  onDark,
  className,
  wrapperClassName,
  ...props
}: SearchInputProps) {
  return (
    <label
      className={cn(
        "flex h-11 w-full max-w-[360px] cursor-text items-center gap-2 rounded-pill border border-border bg-surface-sunken px-4 text-foreground focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus",
        onDark && "border-border-on-dark bg-surface-dark-raised text-on-dark",
        wrapperClassName
      )}
    >
      <Icon name="search" className="size-[18px] shrink-0" />
      <Input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        className={cn(
          "h-auto flex-1 rounded-none border-0 bg-transparent px-0 py-0 text-sm leading-5 text-inherit focus-visible:outline-none",
          onDark
            ? "placeholder:text-on-dark-muted"
            : "placeholder:text-ink-muted",
          className
        )}
        {...props}
      />
    </label>
  );
}
