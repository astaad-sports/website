import type { OrderStatus } from "@/db/schema";
import { ADMIN_STATUS_LABEL, ADMIN_STATUS_TONE } from "@/lib/orders/fulfilment";
import { cn } from "@/lib/utils";

/** A small dot and an uppercase word: "PENDING", "SHIPPED". The word carries the meaning. */
export function StatusLabel({ status, className }: { status: OrderStatus; className?: string }) {
  const tone = ADMIN_STATUS_TONE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] leading-[14px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase",
        tone.text,
        className
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", tone.dot)} />
      {ADMIN_STATUS_LABEL[status]}
    </span>
  );
}
