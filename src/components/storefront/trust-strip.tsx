import { BadgeCheck, Lock, RotateCcw, ShieldCheck, Truck } from "lucide-react";

import { cn } from "@/lib/utils";

export interface TrustItem {
  icon: typeof Truck;
  title: string;
  detail: string;
}

export const HOME_TRUST: TrustItem[] = [
  { icon: BadgeCheck, title: "Premium Quality", detail: "100% Genuine Astaad Products" },
  { icon: Truck, title: "Fast Delivery", detail: "Across India" },
  { icon: RotateCcw, title: "Easy Returns", detail: "Within 7 Days" },
  { icon: Lock, title: "Secure Payments", detail: "UPI, cards and net banking" },
];

export const PRODUCT_TRUST: TrustItem[] = [
  { icon: ShieldCheck, title: "100% Genuine", detail: "Astaad Products" },
  { icon: Truck, title: "Fast Delivery", detail: "Across India" },
  { icon: RotateCcw, title: "Easy Returns", detail: "Within 7 Days" },
  { icon: Lock, title: "Secure Payments", detail: "UPI, cards, net banking" },
];

/**
 * Four reasons to buy in a row. `light` sits on white with grey icon boxes (on
 * phones, a 2 × 2 grid of grey tiles); `sunken` sits on the grey ground with
 * black boxes and yellow icons.
 */
export function TrustStrip({
  items,
  tone = "light",
}: {
  items: TrustItem[];
  tone?: "light" | "sunken";
}) {
  const sunken = tone === "sunken";
  return (
    <section className={sunken ? "bg-surface-sunken" : "bg-surface"}>
      <ul
        aria-label="Why Astaad"
        className={cn(
          "site-shell grid gap-6 py-10 sm:grid-cols-2 xl:grid-cols-4 xl:items-center xl:gap-0 xl:py-0",
          sunken ? "xl:h-[200px]" : "grid-cols-2 max-md:gap-2.5 max-md:py-6 xl:h-[220px]"
        )}
      >
        {items.map((item, index) => (
          <li
            key={item.title}
            className={cn(
              "flex items-center gap-5",
              sunken
                ? "xl:px-6"
                : "max-md:flex-col max-md:items-start max-md:gap-2 max-md:rounded-xs max-md:bg-surface-sunken max-md:p-3.5 xl:px-8",
              index === 0 && "xl:pl-0",
              index === items.length - 1 && "xl:pr-0",
              index > 0 && "xl:border-l xl:border-border"
            )}
          >
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-xs",
                sunken
                  ? "size-13 bg-surface-dark text-brand-yellow"
                  : "size-14 bg-surface-sunken text-foreground max-md:size-9 max-md:rounded-full max-md:border max-md:border-border max-md:bg-surface-raised"
              )}
            >
              <item.icon className={cn("size-6", !sunken && "max-md:size-[18px]")} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span className="flex flex-col gap-0.5">
              <span
                className={
                  sunken
                    ? "text-base leading-[22px] font-bold"
                    : "text-[17px] leading-6 font-bold max-md:text-sm max-md:leading-5"
                }
              >
                {item.title}
              </span>
              <span
                className={cn(
                  "text-ink-muted",
                  sunken ? "text-[13px] leading-[18px]" : "text-sm leading-5 max-md:text-xs max-md:leading-4"
                )}
              >
                {item.detail}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
