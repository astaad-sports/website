import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { BAT_RANGES, type BatRange } from "@/lib/catalogue";
import { countInWords, type BatSubcategory } from "@/lib/products/model";
import { siteImage } from "@/lib/site-images";
import { cn } from "@/lib/utils";

import { SectionHeading } from "./section-heading";

const GOAT_BATS = siteImage("home/goat-bats-on-clefts");

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
        src={range.image}
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

const EXPLORE = "relative flex items-center gap-1.5 text-[13px] leading-[18px] font-bold tracking-[0.1em] text-brand-yellow uppercase";
const MODELS_CHIP = "h-[22px] self-start rounded-full px-2.5 text-[11px] leading-[22px] font-bold tracking-[0.06em] uppercase";

function modelsLabel(models: number): string {
  if (models === 0) return "Coming soon";
  return `${models} ${models === 1 ? "model" : "models"}`;
}

/** The phone's row of willow cards: English Willow first and widest, then each other range. */
function CollectionRow({ models }: { models: Record<BatSubcategory, number> }) {
  return (
    <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 md:hidden">
      <li className="flex shrink-0 snap-start">
        <Link
          href="/#english-willow"
          className="relative flex h-[300px] w-[286px] flex-col justify-end overflow-hidden rounded-xs border border-border-on-dark bg-surface-dark-sunken p-[18px]"
        >
          <Image src={GOAT_BATS.src} alt="" fill sizes="286px" className="object-cover object-[50%_20%]" />
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(22,22,22,0)_20%,rgba(22,22,22,0.85)_58%,#161616_78%)]"
          />
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-brand-yellow" />
          <span className="relative flex flex-col gap-2.5">
            <span className={cn(MODELS_CHIP, "bg-brand-yellow text-on-yellow")}>{modelsLabel(models["english-willow"])}</span>
            <span className="type-display text-[34px] leading-[0.95] tracking-[-0.01em]">
              English
              <br />
              Willow
            </span>
            <span className="text-[13px] leading-[18px] text-on-dark-subtle">Premium · Customizable · Free engraving</span>
          </span>
          <span className={cn(EXPLORE, "mt-2.5")}>
            Explore
            <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
          </span>
        </Link>
      </li>
      {BAT_RANGES.map((range) => (
        <li key={range.slug} className="flex shrink-0 snap-start">
          <Link
            href={range.href}
            className="relative flex h-[300px] w-[212px] flex-col justify-end overflow-hidden rounded-xs border border-border-on-dark bg-surface-dark-sunken p-4"
          >
            <Image
              src={range.image}
              alt=""
              width={190}
              height={134}
              className={cn(
                "absolute top-7 right-[-18px] h-auto w-[210px] rotate-[-38deg] object-contain drop-shadow-[0_20px_20px_rgba(0,0,0,0.6)]",
                range.grayscale && "grayscale-[0.4]"
              )}
            />
            <span className="relative flex flex-col gap-2.5">
              <span className={cn(MODELS_CHIP, "border border-on-dark-muted leading-5 text-on-dark")}>
                {modelsLabel(models[range.slug])}
              </span>
              <span className="type-display w-min text-2xl leading-none">{range.name}</span>
              <span className="text-[12px] leading-4 text-on-dark-subtle">{range.tagline}</span>
            </span>
            <span className={cn(EXPLORE, "mt-2.5")}>
              Explore
              <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * "The Astaad bat collection": English Willow, Kashmir Willow and Tennis bats.
 * `models` is how many bats of each kind are on the store. On phones the three
 * are a row of cards that scrolls sideways.
 */
export function BatCollection({ models }: { models: Record<BatSubcategory, number> }) {
  const englishWillow = models["english-willow"];
  return (
    <section
      id="collection"
      aria-labelledby="coll-title"
      className="bg-surface-dark text-on-dark"
    >
      <div className="site-shell flex flex-col gap-5 py-8 md:gap-10 md:pt-20 md:pb-16 xl:h-[640px] xl:pb-0">
        <SectionHeading
          id="coll-title"
          tone="dark"
          face="display"
          eyebrowBar
          compact
          eyebrow="Bats are the core"
          title="The Astaad bat collection"
          aside={
            <p className="text-[15px] leading-[22px] text-on-dark-subtle md:text-lg md:leading-[26px]">
              Choose your willow. Build your game.
            </p>
          }
        />
        <CollectionRow models={models} />
        <div className="hidden gap-5 md:grid md:grid-cols-[2fr_1fr] md:grid-rows-2 xl:h-[400px]">
          {/* Every piece is pinned absolutely inside the fixed-height tile. */}
          <Link
            href="/#english-willow"
            className="group relative row-span-2 block min-h-[400px] overflow-hidden rounded-xs bg-surface-dark-sunken text-on-dark transition-transform duration-200 hover:-translate-y-1"
          >
            <div className="absolute inset-y-0 right-0 w-[320px]">
              <Image src={GOAT_BATS.src} alt="" fill sizes="320px" className="object-cover object-[60%_30%]" />
            </div>
            <span
              aria-hidden="true"
              className="absolute inset-y-0 right-[200px] w-[200px] bg-[linear-gradient(90deg,#161616_0%,rgba(22,22,22,0)_100%)]"
            />
            <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-brand-yellow" />
            <span className="absolute top-9 left-10 h-[22px] rounded-full bg-brand-yellow px-2.5 text-[11px] leading-[22px] font-bold tracking-[0.08em] text-on-yellow uppercase">
              Premium · Customizable
            </span>
            <span className="absolute top-24 left-10 flex w-[calc(100%-80px)] max-w-[460px] flex-col gap-3">
              <span className="type-display text-[64px] leading-[0.92] tracking-[-0.02em]">
                English
                <br />
                Willow
              </span>
              <span className="max-w-[380px] text-[15px] leading-[22px] text-on-dark-subtle">
                {countInWords(englishWillow)} {englishWillow === 1 ? "model" : "models"} from Grade 4
                to the top 1% of Grade 1+ Players willow. Every one built to your weight, profile,
                toe and handle, with free name engraving.
              </span>
            </span>
            <span className="absolute bottom-9 left-10 flex flex-wrap items-center gap-6">
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
