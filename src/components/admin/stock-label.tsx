import { EyeOff } from "lucide-react";

import { STOCK_STATUS_LABEL, type StockStatus } from "@/lib/products/model";
import { cn } from "@/lib/utils";

const TONE: Record<StockStatus, { dot: string; text: string }> = {
  in: { dot: "bg-success", text: "text-success" },
  low: { dot: "bg-brand-yellow-hover", text: "text-foreground" },
  out: { dot: "bg-danger", text: "text-danger" },
  hidden: { dot: "", text: "text-ink-muted" },
};

/**
 * "IN STOCK", "LOW STOCK", "OUT OF STOCK" with a dot, or "HIDDEN" with an
 * eye-off icon. The word carries the meaning; colour only repeats it.
 */
export function StockLabel({ status, className }: { status: StockStatus; className?: string }) {
  const tone = TONE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] leading-[14px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase",
        tone.text,
        className
      )}
    >
      {status === "hidden" ? (
        <EyeOff className="size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
      ) : (
        <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", tone.dot)} />
      )}
      {STOCK_STATUS_LABEL[status]}
    </span>
  );
}
