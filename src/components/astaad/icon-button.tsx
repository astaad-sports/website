import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Icon, type IconName } from "./icon";

export interface IconButtonProps
  extends Omit<ComponentProps<typeof Button>, "size" | "variant" | "children"> {
  icon: IconName;
  /** The accessible name. Required. */
  label: string;
  /** Cart count pill. */
  count?: number;
  /** Toggled state (the wishlist heart). */
  pressed?: boolean;
  /** Fill the icon with the current colour (a saved heart). */
  filled?: boolean;
  /** On `surface-dark`: `on-dark` icon, `surface-dark-raised` hover. */
  onDark?: boolean;
  size?: "sm" | "md" | "lg";
}

const SIZES = { sm: "icon-sm", md: "icon", lg: "icon-lg" } as const;

/**
 * A 40px circular button holding one outline icon — account, cart, search,
 * wishlist, share. The cart variant carries a `count` Badge.
 */
export function IconButton({
  icon,
  label,
  count,
  pressed,
  filled,
  onDark,
  size = "md",
  className,
  ...props
}: IconButtonProps) {
  return (
    <Button
      variant="ghost"
      size={SIZES[size]}
      aria-label={label}
      aria-pressed={pressed}
      className={cn(
        "relative",
        onDark && "text-on-dark hover:bg-surface-dark-raised",
        className
      )}
      {...props}
    >
      <Icon
        name={icon}
        className={cn("size-[22px]", filled && "fill-current")}
      />
      {count != null && (
        <Badge size="count" className="absolute -top-0.5 -right-0.5">
          {count}
        </Badge>
      )}
    </Button>
  );
}
