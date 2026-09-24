import { Tag } from "lucide-react";

import { formatShortDate } from "@/lib/format";
import type { StoreOffer } from "@/lib/products/model";
import { cn } from "@/lib/utils";

/**
 * "Diwali Sale · ends 25 Oct": the offer's last day, in India. No year: a
 * running offer ends soon, and a year that depends on today's date could read
 * differently on the server and in the browser around New Year.
 */
function offerLabel(offer: StoreOffer): string {
  const end = new Date(offer.endsAt);
  return `${offer.name} · ends ${formatShortDate(end, end)}`;
}

/**
 * The running offer behind a price, shown beside or under it. On the dark
 * stage it is yellow, as discounts are; on white it stays ink, since yellow
 * text fails contrast there. `truncate` keeps a fixed-height tile's layout
 * when a long offer name would otherwise wrap.
 */
export function OfferNote({
  offer,
  tone = "light",
  truncate = false,
  className,
}: {
  offer: StoreOffer;
  tone?: "light" | "dark";
  truncate?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex min-w-0 items-center gap-1.5 text-[13px] leading-[18px] font-semibold",
        tone === "dark" ? "text-brand-yellow" : "text-foreground",
        className
      )}
    >
      <Tag className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
      <span className={cn("min-w-0", truncate && "truncate")}>{offerLabel(offer)}</span>
    </span>
  );
}
