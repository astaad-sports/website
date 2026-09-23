import { BAT_SIZES } from "@/lib/catalogue";

import { BatSilhouette } from "./bat-silhouette";
import { SectionHeading } from "./section-heading";
import { SizeGuideTable } from "./size-guide-table";

const HEIGHTS = ["h-[300px]", "h-[336px]", "h-[378px]", "h-[378px]"];

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
      <div
        aria-hidden="true"
        className="hidden h-[380px] flex-1 items-end justify-around gap-6 border-b border-border-strong px-10 md:flex"
      >
        {BAT_SIZES.map((size, index) => (
          <div key={size.code} className="flex flex-col items-center gap-3">
            <BatSilhouette
              className={HEIGHTS[index]}
              longHandle={size.longHandle}
              handle={size.longHandle ? "var(--brand-yellow)" : "var(--ink)"}
            />
            <span className="text-[13px] leading-[18px] font-bold">
              {index === 0 ? "Size 6" : size.code}
              {size.longHandle && <span className="ml-1 font-medium text-ink-muted">longer handle</span>}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
