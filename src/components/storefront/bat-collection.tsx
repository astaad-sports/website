import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { BAT_RANGES, type BatRange } from "@/lib/catalogue";
import { countInWords, type BatSubcategory } from "@/lib/products/model";
import { cn } from "@/lib/utils";

import { SectionHeading } from "./section-heading";

/** A bat range's tile: its name on two lines, tagline and model count. With no models yet, it says so. */
function SmallTile({ range, models }: { range: BatRange; models: number }) {
  return (
    <Link
      href={range.href}
      className="group @container relative flex min-h-[190px] flex-col overflow-hidden rounded-xs bg-surface-dark-sunken px-8 pt-8 pb-7 text-on-dark transition-transform duration-200 hover:-translate-y-1"
    >
      {/* The bat runs diagonally, so on a narrower tile it shrinks into the
          bottom-right corner to keep its blade clear of the note. It is full
          size from a 421px tile (the 1440 design) and hidden below 300px; the
          container query measures inside the 32px side padding, hence 236px. */}
      <Image
        src="/images/category-bats.png"
        alt=""
        width={190}
        height={134}
        className={cn(
          "absolute right-4 bottom-[22px] aspect-[190/134] h-auto w-[min(190px,89%_-_185px)] object-contain drop-shadow-[0_20px_20px_rgba(0,0,0,0.6)] @max-[236px]:hidden",
          range.grayscale && "grayscale-[0.4]"
        )}
      />
      {/* In flow so a note that wraps on a narrow tile (768-956) pushes the
          count down and grows the tile, instead of running into it. `relative`
          keeps the text painted above the bat. */}
      <span className="relative flex flex-col gap-1.5">
        <span className="type-display w-min text-[28px] leading-none tracking-[-0.01em]">{range.name}</span>
        <span className="text-[13px] leading-[18px] text-on-dark-subtle">{range.tagline}</span>
      </span>
      {/* min-h-11 holds the row at the count's height, so "Coming soon" sits on the same line. */}
      <span className="relative mt-auto flex min-h-11 items-center gap-3 pt-3 text-[13px] leading-[18px] font-semibold tracking-[0.16em] uppercase">
        {models > 0 ? (
          <>
            <span className="text-[28px] leading-8 font-bold tracking-[-0.02em]">{models}</span>
            {models === 1 ? "Model" : "Models"}
          </>
        ) : (
          "Coming soon"
        )}
        <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
      </span>
    </Link>
  );
}

/**
 * "The Astaad bat collection": English Willow, Kashmir Willow and Tennis bats.
 * `models` is how many bats of each kind are on the store.
 */
export function BatCollection({ models }: { models: Record<BatSubcategory, number> }) {
  const englishWillow = models["english-willow"];
  return (
    <section
      id="collection"
      aria-labelledby="coll-title"
      className="bg-surface-dark text-on-dark"
    >
      <div className="site-shell flex flex-col gap-10 pt-16 pb-16 md:pt-20 xl:h-[640px] xl:pb-0">
        <SectionHeading
          id="coll-title"
          tone="dark"
          face="display"
          eyebrowBar
          eyebrow="Bats are the core"
          title="The Astaad bat collection"
          aside={<p className="text-lg leading-[26px] text-on-dark-subtle">Choose your willow. Build your game.</p>}
        />
        <div className="grid gap-5 md:grid-cols-[2fr_1fr] md:grid-rows-2 xl:h-[400px]">
          {/* Below md the tile is a column that grows with its copy (the count
              and button wrap onto two lines there); from md up every piece is
              pinned absolutely inside the fixed-height tile. */}
          <Link
            href="/#english-willow"
            className="group relative flex min-h-[400px] flex-col overflow-hidden rounded-xs bg-surface-dark-sunken px-10 py-9 text-on-dark transition-transform duration-200 hover:-translate-y-1 md:row-span-2 md:block md:p-0"
          >
            <div className="absolute inset-y-0 right-0 hidden w-[320px] sm:block">
              <Image
                src="/images/english-willow-collection.png"
                alt=""
                fill
                sizes="320px"
                className="object-cover"
              />
            </div>
            <span
              aria-hidden="true"
              className="absolute inset-y-0 right-[200px] hidden w-[200px] bg-[linear-gradient(90deg,#161616_0%,rgba(22,22,22,0)_100%)] sm:block"
            />
            <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-brand-yellow" />
            <span className="h-[22px] self-start rounded-full bg-brand-yellow px-2.5 text-[11px] leading-[22px] font-bold tracking-[0.08em] text-on-yellow uppercase md:absolute md:top-9 md:left-10">
              Premium · Customizable
            </span>
            <span className="mt-[38px] flex max-w-[460px] flex-col gap-3 md:absolute md:top-24 md:left-10 md:mt-0 md:w-[calc(100%-80px)]">
              <span className="type-display text-[48px] leading-[0.92] tracking-[-0.02em] md:text-[64px]">
                English
                <br />
                Willow
              </span>
              <span className="max-w-[380px] text-[15px] leading-[22px] text-on-dark-subtle">
                {countInWords(englishWillow)} {englishWillow === 1 ? "model" : "models"} from Grade 4
                to the top 1% of Grade 1+ Players willow. Every one built to your weight, profile
                and handle, with free name engraving.
              </span>
            </span>
            <span className="mt-auto flex flex-wrap items-center gap-6 pt-8 md:absolute md:bottom-9 md:left-10 md:pt-0">
              <span className="text-[40px] leading-[44px] font-bold tracking-[-0.03em]">
                {englishWillow}{" "}
                <span className="text-[13px] leading-[18px] font-medium tracking-[0.2em] text-on-dark-subtle uppercase">
                  {englishWillow === 1 ? "Model" : "Models"}
                </span>
              </span>
              <span
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "h-12 rounded-xs px-6 text-sm leading-5 font-bold group-hover:bg-brand-yellow-hover"
                )}
              >
                Explore English Willow
                <ArrowRight className="size-4" strokeWidth={2.2} aria-hidden="true" />
              </span>
            </span>
          </Link>
          {BAT_RANGES.map((range) => (
            <SmallTile key={range.slug} range={range} models={models[range.slug]} />
          ))}
        </div>
      </div>
    </section>
  );
}
