import { cn } from "@/lib/utils";

/**
 * The "Out of stock" chip in the top-left corner of a product plate or tile,
 * beside any other chips. On a dark plate it turns white so it still reads.
 */
export function OutOfStockChip({ onDark = false }: { onDark?: boolean }) {
  return (
    <span
      className={cn(
        "h-6 rounded-xs px-2.5 text-[11px] leading-6 font-bold tracking-[0.08em] whitespace-nowrap uppercase",
        onDark ? "bg-on-dark text-ink" : "bg-surface-dark text-on-dark"
      )}
    >
      Out of stock
    </span>
  );
}
