import { cn } from "@/lib/utils";

import { Icon } from "./icon";

export type TrustIcon = "truck" | "shield" | "box" | "lock";

export interface TrustBadgeProps {
  icon?: TrustIcon;
  title: string;
  detail?: string;
  /** `row` under the hero (yellow icon); `stack` under the checkout button (ink icon). */
  layout?: "row" | "stack";
  className?: string;
}

/** The fixed trust triad. Checkout adds `CHECKOUT_TRUST_CLAIM`. */
export const TRUST_CLAIMS: readonly Required<
  Pick<TrustBadgeProps, "icon" | "title" | "detail">
>[] = [
  { icon: "truck", title: "Fast Delivery", detail: "Across India" },
  { icon: "shield", title: "100% Genuine", detail: "Products" },
  { icon: "box", title: "Easy Returns", detail: "Within 7 Days" },
];

export const CHECKOUT_TRUST_CLAIM = {
  icon: "lock",
  title: "Secure",
  detail: "Payments",
} as const satisfies Pick<TrustBadgeProps, "icon" | "title" | "detail">;

/**
 * An outline icon in a `rounded-circle` ring with a two-line label. In a row
 * under the hero on `surface-dark` the icon is `brand-yellow`; stacked under
 * the checkout button on `surface` the icon is `ink`.
 */
export function TrustBadge({
  icon = "shield",
  title,
  detail,
  layout = "row",
  className,
}: TrustBadgeProps) {
  const stack = layout === "stack";
  return (
    <div
      className={cn(
        "inline-flex items-center gap-3",
        stack && "flex-col gap-2 text-center",
        className
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-circle border-[1.5px] border-current",
          stack ? "text-foreground" : "text-brand-yellow"
        )}
      >
        <Icon name={icon} className="size-5" />
      </span>
      <span className="type-body-sm">
        <b className="block font-semibold">{title}</b>
        {detail}
      </span>
    </div>
  );
}
