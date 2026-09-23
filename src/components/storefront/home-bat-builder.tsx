"use client";

import Image from "next/image";
import { ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BAT_HANDLES,
  BAT_IMAGE,
  BAT_PROFILES,
  BAT_WEIGHTS,
  ENGRAVING_MAX,
  getBat,
} from "@/lib/catalogue";
import { formatPrice } from "@/lib/format";

import { ChoiceButtons, FreeChip, OptionGroup, useBatConfig, YesNo } from "./bat-options";
import { SectionHeading } from "./section-heading";

/** "Build your bat": a live Legacy One preview beside the six customisation choices. */
export function HomeBatBuilder() {
  const bat = getBat("legacy-one")!;
  const { config, update } = useBatConfig();
  const chips = [
    BAT_WEIGHTS[config.weight].label,
    BAT_PROFILES[config.profile].label,
    `${BAT_HANDLES[config.handle].label} handle`,
    config.name.trim() ? "Engraved" : null,
    config.knock ? "Knocked in" : null,
    config.scuff ? "Scuff sheet" : null,
  ].filter((chip): chip is string => chip !== null);

  return (
    <section id="build" aria-labelledby="build-title" className="bg-surface-sunken">
      <div className="site-shell flex flex-col gap-10 pt-16 pb-16 md:pt-20 xl:h-[860px] xl:pb-0">
        <SectionHeading
          id="build-title"
          face="display"
          eyebrow="Customization · English Willow only"
          title="Build your bat"
          aside={
            <p className="max-w-[380px] text-[15px] leading-[22px] text-ink-muted md:text-right">
              Six choices. No extra cost for engraving or knocking. Your bat, made your way.
            </p>
          }
        />

        <div className="flex flex-col gap-10 xl:flex-row xl:items-stretch">
          <div className="relative w-full overflow-hidden rounded-xs bg-surface-dark p-6 text-on-dark md:h-[580px] md:px-8 md:py-7 xl:w-[560px] xl:shrink-0">
            <div
              aria-hidden="true"
              className="absolute top-[90px] left-[130px] size-[300px] rounded-full bg-[radial-gradient(circle,rgba(254,197,2,0.2)_0%,rgba(254,197,2,0)_66%)]"
            />
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] leading-[14px] font-medium tracking-[0.2em] text-on-dark-subtle uppercase">
                  Building
                </span>
                <span className="text-xl leading-[26px] font-bold">{bat.name}</span>
                <span className="text-[13px] leading-[18px] text-on-dark-subtle">
                  Top 1% Grade 1+ Players English Willow
                </span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-2xl leading-[30px] font-bold">{formatPrice(bat.price)}</span>
                <span className="text-xs leading-4 text-ink-subtle line-through">
                  MRP {formatPrice(bat.mrp)}
                </span>
              </div>
            </div>
            <div className="relative mx-auto mt-6 h-[360px] w-[142px] md:absolute md:top-24 md:left-[196px] md:mt-0 md:h-[426px] md:w-[168px]">
              <Image
                src={BAT_IMAGE}
                alt={`Preview of your ${bat.name} bat`}
                fill
                sizes="168px"
                className="object-contain drop-shadow-[0_32px_40px_rgba(0,0,0,0.8)]"
              />
              <span
                aria-hidden="true"
                className="type-script-accent absolute top-[65%] left-[24%] origin-top-left -rotate-90 text-[32px] whitespace-nowrap text-brand-yellow"
              >
                {config.name.trim() || "Your Name"}
              </span>
            </div>
            <div className="relative mt-6 flex flex-wrap gap-2 md:absolute md:inset-x-8 md:bottom-7 md:mt-0">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="h-[26px] rounded-xs bg-surface-dark-raised px-2.5 text-xs leading-[26px] font-semibold text-on-dark-muted"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-between gap-5">
            <OptionGroup label="Weight">
              <ChoiceButtons label="Weight" options={BAT_WEIGHTS} value={config.weight} onChange={(v) => update("weight", v)} />
            </OptionGroup>
            <OptionGroup label="Profile">
              <ChoiceButtons label="Profile" options={BAT_PROFILES} value={config.profile} onChange={(v) => update("profile", v)} />
            </OptionGroup>
            <OptionGroup label="Handle shape">
              <ChoiceButtons label="Handle shape" options={BAT_HANDLES} value={config.handle} onChange={(v) => update("handle", v)} />
            </OptionGroup>
            <OptionGroup label="Name engraving" badge={<FreeChip />} htmlFor="home-engrave">
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  id="home-engrave"
                  value={config.name}
                  maxLength={ENGRAVING_MAX}
                  placeholder="Your Name"
                  onChange={(event) => update("name", event.target.value.slice(0, ENGRAVING_MAX))}
                  className="h-11 max-w-[360px] flex-1 rounded-xs border-0 shadow-card"
                />
                <span className="text-[13px] leading-[18px] whitespace-nowrap text-ink-muted">
                  Maximum {ENGRAVING_MAX} letters
                </span>
              </div>
            </OptionGroup>
            <div className="flex flex-wrap gap-10">
              <OptionGroup label="Match-ready knocking" badge={<FreeChip />}>
                <YesNo label="Match-ready knocking" variant="button" value={config.knock} onChange={(v) => update("knock", v)} />
              </OptionGroup>
              <OptionGroup label="Clear scuff sheet">
                <YesNo label="Clear scuff sheet" variant="button" value={config.scuff} onChange={(v) => update("scuff", v)} />
              </OptionGroup>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <Button size="lg" className="h-14 rounded-xs px-8 text-[15px] font-bold">
                <ShoppingCart className="size-[18px]" strokeWidth={2} aria-hidden="true" />
                Add to Cart · {formatPrice(bat.price)}
              </Button>
              <span className="text-[13px] leading-[18px] text-ink-muted">
                Only English Willow bats are customizable.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
