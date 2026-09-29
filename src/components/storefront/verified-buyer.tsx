import { BadgeCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * "Verified buyer": the review came from a customer's account that has a
 * paid order with this product in it. On a photo (`dark`) it is white.
 */
export function VerifiedBuyer({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[13px] leading-[18px] font-semibold",
        tone === "dark" ? "text-on-dark" : "text-success",
        className
      )}
    >
      <BadgeCheck className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      Verified buyer
    </span>
  );
}
