"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShoppingCart } from "lucide-react";

import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { batCartItem, cleanEngravingInput } from "@/lib/cart";
import {
  BAT_HANDLES,
  BAT_PROFILES,
  BAT_TOES,
  BAT_WEIGHTS,
  ENGRAVING_MAX,
} from "@/lib/catalogue";
import { formatPrice } from "@/lib/format";
import { countInWords, listInWords, startingBatConfig, type StoreBat } from "@/lib/products/model";

import { ChoiceButtons, FreeChip, OptionGroup, useBatConfig, YesNo } from "./bat-options";
import { OfferNote } from "./offer-note";
import { SectionHeading } from "./section-heading";

/** "Seven choices. No extra cost for engraving or knocking.", counting only what this bat offers. */
function choicesNote({ toes, engraving, matchReady, scuffSheet }: StoreBat["customization"]): string {
  const choices = 3 + [toes.length > 0, engraving, matchReady, scuffSheet].filter(Boolean).length;
  const free = [engraving && "engraving", matchReady && "knocking"].filter((extra) => extra !== false);
  const extras = free.length ? ` No extra cost for ${listInWords(free, "or")}.` : "";
  return `${countInWords(choices)} choices.${extras} Your bat, made your way.`;
}

/**
 * On phones the builder would fill several screens, so it is a small card for
 * `bat` and a button to its own page, where the same choices are.
 */
function BuildTeaser({ bat }: { bat: StoreBat }) {
  return (
    <div className="flex flex-col gap-3 md:hidden">
      <div className="relative flex items-center gap-4 overflow-hidden rounded-xs bg-surface-dark p-4 text-on-dark">
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-[-40px] size-[200px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(254,197,2,0.22)_0%,rgba(254,197,2,0)_66%)]"
        />
        <div className="relative h-[150px] w-[60px] shrink-0">
          <Image
            src={bat.images[0]}
            alt={`Astaad ${bat.name} bat`}
            fill
            sizes="60px"
            className="object-contain drop-shadow-[0_16px_20px_rgba(0,0,0,0.8)]"
          />
        </div>
        <div className="relative flex min-w-0 flex-col gap-0.5">
          <span className="text-[11px] leading-[14px] font-medium tracking-[0.2em] text-on-dark-subtle uppercase">
            Building
          </span>
          <span className="text-lg leading-6 font-bold">{bat.name}</span>
          <span className="text-[13px] leading-[18px] text-on-dark-subtle">{bat.grade}</span>
          <span className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
            <span className="text-xl leading-[26px] font-bold">{formatPrice(bat.price)}</span>
            {bat.mrp > bat.price && (
              <span className="text-xs leading-4 text-ink-subtle line-through">
                {/* "MRP" only for a real one: with none, an offer strikes out the regular price. */}
                {bat.mrp > bat.regularPrice && "MRP "}
                {formatPrice(bat.mrp)}
              </span>
            )}
          </span>
          {bat.offer && <OfferNote offer={bat.offer} tone="dark" truncate className="mt-1" />}
        </div>
      </div>
      <Button
        render={<Link href={`/bats/${bat.slug}`} />}
        nativeButton={false}
        className="h-13 w-full rounded-xs text-sm font-bold"
      >
        Build your bat
        <ArrowRight className="size-4" strokeWidth={2.2} aria-hidden="true" />
      </Button>
    </div>
  );
}

/**
 * "Build your bat": a live preview of `bat` (with its price and any running
 * offer) beside its customisation choices, showing only the options the bat
 * offers. On phones, the small card above instead.
 */
export function HomeBatBuilder({ bat }: { bat: StoreBat }) {
  const custom = bat.customization;
  const { config, update } = useBatConfig(startingBatConfig(custom));
  const engraved = custom.engraving ? config.name.trim() : "";
  const toes = custom.toes.length > 0;
  const chips = [
    BAT_WEIGHTS[config.weight].label,
    BAT_PROFILES[config.profile].label,
    toes ? `${BAT_TOES[config.toe].label} toe` : null,
    `${BAT_HANDLES[config.handle].label} handle`,
    engraved ? "Engraved" : null,
    custom.matchReady && config.knock ? "Knocked in" : null,
    custom.scuffSheet && config.scuff ? "Scuff sheet" : null,
  ].filter((chip): chip is string => chip !== null);

  return (
    <section id="build" aria-labelledby="build-title" className="bg-surface-sunken">
      <div className="site-shell flex flex-col gap-5 py-8 md:gap-10 md:pt-20 md:pb-16 xl:h-[860px] xl:pb-0">
        <SectionHeading
          id="build-title"
          face="display"
          compact
          eyebrow="Customization · English Willow only"
          title="Build your bat"
          aside={
            <p className="max-w-[380px] text-sm leading-5 text-ink-muted md:text-right md:text-[15px] md:leading-[22px]">
              {choicesNote(custom)}
            </p>
          }
        />

        <BuildTeaser bat={bat} />

        <div className="hidden flex-col gap-10 md:flex xl:flex-row xl:items-stretch">
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
                <span className="text-[13px] leading-[18px] text-on-dark-subtle">{bat.grade}</span>
              </div>
              <div className="flex flex-col items-end gap-0.5 text-right">
                <span className="text-2xl leading-[30px] font-bold">{formatPrice(bat.price)}</span>
                {bat.mrp > bat.price && (
                  <span className="text-xs leading-4 text-ink-subtle line-through">
                    {/* "MRP" only for a real one: with none, an offer strikes out the regular price. */}
                    {bat.mrp > bat.regularPrice && "MRP "}
                    {formatPrice(bat.mrp)}
                  </span>
                )}
                {bat.offer && <OfferNote offer={bat.offer} tone="dark" className="mt-1" />}
              </div>
            </div>
            {/* The bat's main photo, with the engraving drawn on the lower blade. The photo is
                centred and fills the height, so the blade's centre line and toe are fixed: the
                name starts just above the toe and a longer one grows up the blade. */}
            <div className="relative mx-auto mt-6 h-[360px] w-[142px] md:absolute md:top-24 md:left-[196px] md:mt-0 md:h-[390px] md:w-[168px]">
              <Image
                src={bat.images[0]}
                alt={`Preview of your ${bat.name} bat`}
                fill
                sizes="168px"
                className="object-contain drop-shadow-[0_32px_40px_rgba(0,0,0,0.8)]"
              />
              {custom.engraving && (
                <span
                  aria-hidden="true"
                  className="type-script-accent absolute top-[90%] left-[calc(50%-0.5em)] origin-top-left -rotate-90 text-[22px] leading-none whitespace-nowrap text-brand-yellow md:text-[24px]"
                >
                  {engraved || "Your Name"}
                </span>
              )}
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

          <div className="flex flex-1 flex-col justify-between gap-4">
            <OptionGroup label="Weight">
              <ChoiceButtons label="Weight" options={BAT_WEIGHTS} offered={custom.weights} value={config.weight} onChange={(v) => update("weight", v)} />
            </OptionGroup>
            <OptionGroup label="Profile">
              <ChoiceButtons label="Profile" options={BAT_PROFILES} offered={custom.profiles} value={config.profile} onChange={(v) => update("profile", v)} />
            </OptionGroup>
            {toes && (
              <OptionGroup label="Toe shape">
                <ChoiceButtons label="Toe shape" options={BAT_TOES} offered={custom.toes} value={config.toe} onChange={(v) => update("toe", v)} />
              </OptionGroup>
            )}
            <OptionGroup label="Handle shape">
              <ChoiceButtons label="Handle shape" options={BAT_HANDLES} offered={custom.handles} value={config.handle} onChange={(v) => update("handle", v)} />
            </OptionGroup>
            {custom.engraving && (
              <OptionGroup label="Name engraving" badge={<FreeChip />} htmlFor="home-engrave">
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    id="home-engrave"
                    value={config.name}
                    maxLength={ENGRAVING_MAX}
                    placeholder="Your Name"
                    aria-describedby="home-engrave-hint"
                    onChange={(event) => update("name", cleanEngravingInput(event.target.value))}
                    className="h-11 max-w-[360px] flex-1 rounded-xs border-0 shadow-card"
                  />
                  <span id="home-engrave-hint" className="text-[13px] leading-[18px] whitespace-nowrap text-ink-muted">
                    Maximum {ENGRAVING_MAX} letters
                  </span>
                </div>
              </OptionGroup>
            )}
            {(custom.matchReady || custom.scuffSheet) && (
              <div className="flex flex-wrap gap-10">
                {custom.matchReady && (
                  <OptionGroup label="Match-ready knocking" badge={<FreeChip />}>
                    <YesNo label="Match-ready knocking" variant="button" value={config.knock} onChange={(v) => update("knock", v)} />
                  </OptionGroup>
                )}
                {custom.scuffSheet && (
                  <OptionGroup label="Clear scuff sheet">
                    <YesNo label="Clear scuff sheet" variant="button" value={config.scuff} onChange={(v) => update("scuff", v)} />
                  </OptionGroup>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-5">
              <AddToCartButton
                item={batCartItem(bat.slug, config, 1, custom)}
                productName={`Astaad ${bat.name}`}
                soldOut={bat.soldOut}
                size="lg"
                className="h-14 rounded-xs px-8 text-[15px] font-bold"
              >
                <ShoppingCart className="size-[18px]" strokeWidth={2} aria-hidden="true" />
                Add to Cart · {formatPrice(bat.price)}
              </AddToCartButton>
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
