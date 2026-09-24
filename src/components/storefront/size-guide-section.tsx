import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BAT_SIZES } from "@/lib/catalogue";
import { cn } from "@/lib/utils";

import { BatSilhouette } from "./bat-silhouette";
import { SectionHeading } from "./section-heading";
import { SizeGuideDialog } from "./size-guide-dialog";
import { SizeGuideTable } from "./size-guide-table";

// 300, 336, 378 and 378px tall, in --bat-px units so the chart can shrink them together.
const HEIGHTS = [
  "h-[calc(300*var(--bat-px))]",
  "h-[calc(336*var(--bat-px))]",
  "h-[calc(378*var(--bat-px))]",
  "h-[calc(378*var(--bat-px))]",
];

/**
 * "Find the right fit for your game." — the size table beside four silhouettes.
 * On phones, the four sizes as tiles with the player height for each, and the
 * full guide (ages and bat lengths too) in a dialog.
 */
export function SizeGuideSection() {
  return (
    <section
      aria-labelledby="size-title"
      className="site-shell flex flex-col gap-12 py-8 md:pt-20 md:pb-16 lg:flex-row lg:items-start lg:justify-between lg:gap-16 xl:h-[520px] xl:pb-0"
    >
      <div className="flex w-full flex-col gap-5 md:gap-6 lg:w-[520px] lg:shrink-0">
        <SectionHeading
          id="size-title"
          compact
          eyebrow="Size guide · English Willow"
          title="Find the right fit for your game."
        />
        <SizeTiles />
        <SizeGuideTable className="hidden md:table" />
      </div>
      <SizeSilhouettes className="flex-1" />
    </section>
  );
}

/** Phones: a tile per size with the player height it suits, and a button for the full guide. */
function SizeTiles() {
  return (
    <div className="flex flex-col gap-3 md:hidden">
      <ul className="grid grid-cols-4 gap-2">
        {BAT_SIZES.map((size) => {
          const name = size.label.split(" / ")[1] ?? size.label;
          return (
            <li
              key={size.code}
              className="flex flex-col items-center gap-0.5 rounded-xs border border-border bg-surface-sunken px-1 py-3 text-center"
            >
              <span className="text-lg leading-[22px] font-bold">{size.code}</span>
              <span className="text-[11px] leading-[14px] text-ink-muted">{name}</span>
              <span className="mt-1 text-[11px] leading-[14px] font-semibold whitespace-nowrap tabular-nums">
                {size.height.replace(" – ", "–")}
              </span>
            </li>
          );
        })}
      </ul>
      <SizeGuideDialog
        trigger={
          <Button variant="secondary" className="h-11 rounded-xs border border-border-strong bg-transparent font-semibold">
            View the full size guide
            <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
          </Button>
        }
      />
    </div>
  );
}

/**
 * The four bat sizes side by side at their relative lengths, from md up. Decorative: the table carries the sizes.
 *
 * Beside the table between lg and xl the chart can be narrower than the bats, so it is a size
 * container and --bat-px shrinks below 1px once its width can't hold the first three bats
 * (1014px of height at 100:420, so 241.4px wide), the one-line LH label, the three gaps and a
 * little slack (180px together). With room to spare it stays 1px and the bats keep their sizes.
 */
export function SizeSilhouettes({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "@container hidden h-[380px] items-end justify-around gap-6 border-b border-border-strong px-10 [--bat-px:min(1px,calc((100cqw-180px)/241.4))] md:flex lg:px-0 xl:px-10",
        className
      )}
    >
      {BAT_SIZES.map((size, index) => (
        <div key={size.code} className="flex flex-col items-center gap-3">
          <BatSilhouette
            className={HEIGHTS[index]}
            longHandle={size.longHandle}
            handle={size.longHandle ? "var(--brand-yellow)" : "var(--ink)"}
          />
          {/* One line, or a wrapped label would lift its bat off the shared baseline. */}
          <span className="text-[13px] leading-[18px] font-bold whitespace-nowrap">
            {index === 0 ? "Size 6" : size.code}
            {size.longHandle && <span className="ml-1 font-medium text-ink-muted">longer handle</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
