import { countInWords, type StoreBat } from "@/lib/products/model";

import { BatCard, BatPlate } from "./bat-plate";
import { ScrollRow } from "./scroll-row";
import { SectionHeading } from "./section-heading";

/**
 * "Six grades. One standard." — the English Willow models on the store,
 * counted in the heading. On phones, a row of compact cards that scrolls sideways.
 */
export function EnglishWillow({ bats }: { bats: StoreBat[] }) {
  const one = bats.length === 1;
  return (
    <section
      id="english-willow"
      aria-labelledby="ew-title"
      className="site-shell flex flex-col gap-5 py-8 md:gap-10 md:pt-20 md:pb-16 xl:pb-0"
    >
      <SectionHeading
        id="ew-title"
        compact
        eyebrow={`English Willow · ${bats.length} ${one ? "model" : "models"}`}
        title={`${countInWords(bats.length)} ${one ? "grade" : "grades"}. One standard.`}
        aside={
          <div className="hidden flex-wrap items-center gap-3 text-[13px] leading-[18px] text-ink-muted md:flex">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="block size-2 rounded-full bg-brand-yellow" />
              Customizable weight, profile, toe and handle
            </span>
            <span aria-hidden="true" className="block h-4 w-px bg-border" />
            <span>Free name engraving</span>
          </div>
        }
      />
      <div className="md:hidden">
        <ScrollRow
          label="English Willow bats"
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4"
        >
          {bats.map((bat) => (
            <li key={bat.slug} className="shrink-0 snap-start">
              <BatCard bat={bat} />
            </li>
          ))}
        </ScrollRow>
      </div>
      <div className="hidden gap-6 md:grid md:grid-cols-2 xl:grid-cols-3">
        {bats.map((bat) => (
          <BatPlate key={bat.slug} bat={bat} />
        ))}
      </div>
    </section>
  );
}
