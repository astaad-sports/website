import { countInWords, type StoreBat } from "@/lib/products/model";

import { BatPlate } from "./bat-plate";
import { SectionHeading } from "./section-heading";

/** "Six grades. One standard." — the English Willow models on the store, counted in the heading. */
export function EnglishWillow({ bats }: { bats: StoreBat[] }) {
  const one = bats.length === 1;
  return (
    <section
      id="english-willow"
      aria-labelledby="ew-title"
      className="site-shell flex flex-col gap-10 pt-16 pb-16 md:pt-20 xl:pb-0"
    >
      <SectionHeading
        id="ew-title"
        eyebrow={`English Willow · ${bats.length} ${one ? "model" : "models"}`}
        title={`${countInWords(bats.length)} ${one ? "grade" : "grades"}. One standard.`}
        aside={
          <div className="flex flex-wrap items-center gap-3 text-[13px] leading-[18px] text-ink-muted">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="block size-2 rounded-full bg-brand-yellow" />
              Customizable weight, profile, toe and handle
            </span>
            <span aria-hidden="true" className="block h-4 w-px bg-border" />
            <span>Free name engraving</span>
          </div>
        }
      />
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {bats.map((bat) => (
          <BatPlate key={bat.slug} bat={bat} />
        ))}
      </div>
    </section>
  );
}
