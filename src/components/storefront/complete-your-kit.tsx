import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { KIT_ITEMS, type Bat } from "@/lib/catalogue";

import { KitCard } from "./kit-card";
import { SectionHeading } from "./section-heading";

/** "Complete your kit" — gloves, pads, helmet and kitbag to pair with the bat. */
export function CompleteYourKit({ bat }: { bat: Bat }) {
  return (
    <section
      aria-labelledby="kit-title"
      className="site-shell flex flex-col gap-8 pt-16 pb-16 md:pt-[72px] xl:h-[600px] xl:pb-0"
    >
      <SectionHeading
        id="kit-title"
        face="display"
        titleClassName="md:text-[48px]"
        eyebrow={`Pairs with the ${bat.name}`}
        title="Complete your kit"
        aside={
          <Link
            href="/#categories"
            className="inline-flex items-center gap-2 self-start border-b-2 border-brand-yellow py-2 text-sm leading-5 font-bold tracking-[0.08em] uppercase transition-colors hover:text-ink-muted md:self-auto"
          >
            Shop all gear
            <ArrowRight className="size-4" strokeWidth={2.2} aria-hidden="true" />
          </Link>
        }
      />
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {KIT_ITEMS.map((item) => (
          <KitCard key={item.slug} {...item} eyebrow={item.category} height={380} />
        ))}
      </div>
    </section>
  );
}
