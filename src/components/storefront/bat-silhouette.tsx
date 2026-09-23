import { cn } from "@/lib/utils";

/** The flat bat outline used by the size guides. Colours are CSS values. */
export function BatSilhouette({
  fill = "var(--border-dark)",
  handle = "var(--ink)",
  longHandle,
  className,
}: {
  fill?: string;
  handle?: string;
  longHandle?: boolean;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 100 420" aria-hidden="true" className={cn("w-auto", className)}>
      <path
        d="M43 4 h14 a4 4 0 0 1 4 4 v112 l21 22 v250 a6 6 0 0 1 -6 6 h-52 a6 6 0 0 1 -6 -6 v-250 l21 -22 v-112 a4 4 0 0 1 4 -4 z"
        fill={fill}
      />
      <rect
        x="39"
        y={longHandle ? 0 : 4}
        width="22"
        height={longHandle ? 120 : 116}
        rx="4"
        fill={handle}
      />
    </svg>
  );
}
