import { BAT_SIZES } from "@/lib/catalogue";
import { cn } from "@/lib/utils";

import { BatSilhouette } from "./bat-silhouette";
import { SectionHeading } from "./section-heading";
import { SizeGuideTable } from "./size-guide-table";

// 300, 336, 378 and 378px tall, in --bat-px units so the chart can shrink them together.
const HEIGHTS = [
  "h-[calc(300*var(--bat-px))]",
  "h-[calc(336*var(--bat-px))]",
  "h-[calc(378*var(--bat-px))]",
  "h-[calc(378*var(--bat-px))]",
];

/** "Find the right fit for your game." — the size table beside four silhouettes. */
export function SizeGuideSection() {
  return (
    <section
      aria-labelledby="size-title"
      className="site-shell flex flex-col gap-12 pt-16 pb-16 md:pt-20 lg:flex-row lg:items-start lg:justify-between lg:gap-16 xl:h-[520px] xl:pb-0"
    >
      <div className="flex w-full flex-col gap-6 lg:w-[520px] lg:shrink-0">
        <SectionHeading
          id="size-title"
          eyebrow="Size guide · English Willow"
          title="Find the right fit for your game."
        />
        <SizeGuideTable />
      </div>
      <SizeSilhouettes className="flex-1" />
    </section>
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
