"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowRight, Lock, Pin, RotateCcw, Truck } from "lucide-react";
import { Radio as RadioPrimitive } from "@base-ui/react/radio";

import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio-group";
import { batCartItem, cleanEngravingInput, type CartItem } from "@/lib/cart";
import {
  BAT_HANDLES,
  BAT_PROFILES,
  BAT_TOES,
  BAT_WEIGHTS,
  ENGRAVING_MAX,
} from "@/lib/catalogue";
import { formatPrice } from "@/lib/format";
import { standardBatConfig, type StoreBat } from "@/lib/products/model";
import {
  findVariant,
  otherPrices,
  startingVariant,
  variantNote,
  variantSoldOut,
  type StoreVariant,
} from "@/lib/products/variants";
import { cn } from "@/lib/utils";

import { CHOICE_CARD, ChoiceButtons, FreeChip, HandleGlyph, OptionGroup, useBatConfig, YesNo } from "./bat-options";
import { BladeEngraving, EngravingSwatch } from "./blade-engraving";
import { deliveryShort } from "./delivery";
import { Eyebrow } from "./eyebrow";
import { OfferNote } from "./offer-note";
import { SectionHeading } from "./section-heading";
import { SizeGuideDialog } from "./size-guide-dialog";

/** The row under the summary's Add to cart, with delivery as Settings have it. */
function trustRow(deliveryFeePaise: number) {
  return [
    { icon: Truck, label: deliveryShort(deliveryFeePaise) },
    { icon: Lock, label: "Secure payment" },
    { icon: RotateCcw, label: "Easy returns" },
  ];
}

/** The words beside the size picker, for the sizes this bat is sold in. */
function sizeAdvice({ sizes, subcategory }: Pick<StoreBat, "sizes" | "subcategory">): string {
  const has = (code: string) => sizes.some((size) => size.code === code);
  if (sizes.length === 1) {
    const [only] = sizes;
    const detail = subcategory === "tennis-bats" ? only.hint : has("SH") ? "the size most adult players use" : only.hint;
    return `This bat comes in one size: ${only.label}${detail ? `, ${detail}` : ""}.`;
  }
  if (subcategory === "tennis-bats") {
    return `${sizes.map((size) => `${size.label} is ${size.hint}`).join(", ")}.`;
  }
  return [
    has("SH") ? "Most adult players are SH." : null,
    has("LH") ? "LH adds an inch to the handle, not the blade." : null,
  ]
    .filter(Boolean)
    .join(" ");
}

/** The heading's promise, naming only the free extras this bat offers. */
function freeExtrasNote({ engraving, matchReady }: StoreBat["customization"]): string {
  if (engraving && matchReady) return " Engraving and knocking are free.";
  if (engraving) return " Engraving is free.";
  if (matchReady) return " Knocking is free.";
  return "";
}

/**
 * The sizes this bat is sold in as option cards, with how many are left of
 * the chosen one under them. Each size has its own stock: one with none left
 * reads "Out of stock" and cannot be picked. `className` sets the columns.
 */
function SizeChoices({
  bat,
  selected,
  onChange,
  className,
}: {
  bat: StoreBat;
  selected: StoreVariant;
  onChange: (size: string) => void;
  className?: string;
}) {
  const note = variantNote(bat, selected);
  // When a size has a price of its own, every size shows what it costs.
  const priced = otherPrices(bat).length > 0;
  return (
    <div className="flex flex-col gap-2.5">
      <RadioGroup
        aria-label="Bat size"
        value={selected.size ?? ""}
        onValueChange={(next) => onChange(String(next))}
        className={cn("grid w-full grid-cols-2 gap-3", className)}
      >
        {bat.sizes.map((item) => {
          const variant = findVariant(bat, item.code);
          // A bat with nothing left says so on its button; its sizes stay readable.
          const out = !bat.soldOut && variantSoldOut(bat, variant);
          return (
            <RadioPrimitive.Root
              key={item.code}
              value={item.code}
              disabled={out}
              className={cn(CHOICE_CARD, "flex-col justify-center gap-0.5 px-4 py-3.5 data-disabled:cursor-not-allowed md:min-h-[88px]")}
            >
              <span className={cn("text-[15px] leading-5 font-bold", out && "text-ink-muted")}>{item.label}</span>
              <span className={cn("text-xs leading-4", out ? "font-semibold text-danger" : "opacity-70")}>
                {out ? "Out of stock" : item.hint}
              </span>
              {priced && variant && (
                <span className={cn("mt-1 text-sm leading-5 font-bold", out && "text-ink-muted")}>
                  {formatPrice(variant.price)}
                </span>
              )}
            </RadioPrimitive.Root>
          );
        })}
      </RadioGroup>
      {note && !bat.soldOut && <span className="text-[13px] leading-[18px] font-semibold">{note}</span>}
    </div>
  );
}

/**
 * "Choose your size" for a bat that cannot be customised: the advice on the
 * left; the sizes, then `buy`, on the right.
 */
function SizeSection({
  bat,
  selected,
  onChange,
  buy,
}: {
  bat: StoreBat;
  selected: StoreVariant;
  onChange: (size: string) => void;
  buy: ReactNode;
}) {
  const advice = sizeAdvice(bat);
  return (
    <section
      id="build"
      aria-labelledby="size-title"
      className="site-shell flex flex-col gap-10 pt-16 pb-16 md:pt-[72px] lg:flex-row lg:items-start lg:gap-12"
    >
      <div className="flex w-full flex-col gap-5 lg:w-[340px] lg:shrink-0">
        <Eyebrow>Standard build</Eyebrow>
        <h2 id="size-title" className="type-display text-[40px] leading-[0.95] tracking-[-0.02em] md:text-[48px]">
          {bat.sizes.length === 1 ? "Your size" : "Choose your size"}
        </h2>
        {advice && <p className="text-[15px] leading-[22px] text-ink-muted">{advice}</p>}
        {/* The guide is for willow sizes; tennis bats go by length. */}
        {bat.subcategory !== "tennis-bats" && (
          <SizeGuideDialog
            trigger={
              <button
                type="button"
                className="inline-flex h-11 cursor-pointer items-center gap-2.5 self-start border-b-2 border-brand-yellow px-1 text-sm leading-5 font-bold tracking-[0.08em] text-foreground uppercase transition-colors hover:text-ink-muted"
              >
                View size guide
                <ArrowRight className="size-4" strokeWidth={2.2} aria-hidden="true" />
              </button>
            }
          />
        )}
      </div>
      <div className="flex w-full flex-col gap-6 lg:max-w-[720px] lg:flex-1">
        <SizeChoices
          bat={bat}
          selected={selected}
          onChange={onChange}
          className={cn(bat.sizes.length > 2 && "md:grid-cols-4")}
        />
        {buy}
      </div>
    </section>
  );
}

/**
 * Price (with any running offer) and Add to cart for a bat sold only in its
 * standard build, under the size picker. The price and `soldOut` are for the
 * size chosen.
 */
function StandardBuy({ bat, size, item, soldOut }: { bat: StoreBat; size: StoreVariant; item: CartItem; soldOut: boolean }) {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-5">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <span className="text-[32px] leading-[38px] font-bold tracking-[-0.02em]">{formatPrice(size.price)}</span>
          {size.mrp > size.price && (
            <>
              <span className="text-sm leading-5 text-ink-subtle line-through">{formatPrice(size.mrp)}</span>
              <span className="h-[22px] self-center rounded-xs bg-brand-yellow px-2 text-[11px] leading-[22px] font-bold text-on-yellow">
                {size.off}% OFF
              </span>
            </>
          )}
        </div>
        {bat.offer && <OfferNote offer={bat.offer} />}
      </div>
      <AddToCartButton
        item={item}
        productName={`Astaad ${bat.name}`}
        soldOut={soldOut}
        size="lg"
        className="h-14 w-full rounded-xs text-sm font-bold tracking-[0.1em] uppercase"
      >
        Add to cart
        <ArrowRight className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />
      </AddToCartButton>
    </div>
  );
}

/**
 * The configurator (size first, then weight, profile, toe, handle, engraving,
 * knocking, scuff sheet) with a live preview and a pinned order summary.
 * Only the options this bat offers appear. A bat that cannot be customised
 * gets just the size picker, with its price and Add to cart.
 */
export function ProductBuilder({ bat, deliveryFeePaise }: { bat: StoreBat; deliveryFeePaise: number }) {
  const custom = bat.customization;
  const { config, update } = useBatConfig(standardBatConfig(bat));
  const item = batCartItem(bat, config);
  // The bat may have changed under the page (a size removed): fall back to where the picker starts.
  const size = findVariant(bat, config.size) ?? startingVariant(bat);
  const soldOut = variantSoldOut(bat, size);
  const onSizeChange = (code: string) => update("size", code);

  if (!custom.enabled) {
    return (
      <SizeSection
        bat={bat}
        selected={size}
        onChange={onSizeChange}
        buy={<StandardBuy bat={bat} size={size} item={item} soldOut={soldOut} />}
      />
    );
  }

  const engraving = custom.engraving ? config.name.trim().toUpperCase() : "";
  const toes = custom.toes.length > 0;
  const summary: [string, string, boolean?][] = [
    ["Size", size.sizeLabel ?? ""],
    ["Weight", BAT_WEIGHTS[config.weight].label],
    ["Profile", BAT_PROFILES[config.profile].label],
    ...(toes ? [["Toe", BAT_TOES[config.toe].label] as [string, string]] : []),
    ["Handle shape", BAT_HANDLES[config.handle].label],
  ];
  if (custom.engraving) summary.push(["Engraving", engraving || "None", true]);
  if (custom.matchReady) summary.push(["Knocking", config.knock ? "Yes · Free" : "No"]);
  if (custom.scuffSheet) summary.push(["Scuff sheet", config.scuff ? "Yes" : "No"]);
  const advice = sizeAdvice(bat);

  return (
    <section id="build" aria-labelledby="build-title" className="bg-surface-sunken">
      <div className="site-shell flex flex-col gap-10 pt-16 pb-16 md:pt-20">
        <SectionHeading
          id="build-title"
          face="display"
          eyebrow="Customize · English Willow only"
          title="Build your bat"
          aside={
            <p className="max-w-[420px] text-base leading-6 text-ink-muted md:text-right">
              Configure your {bat.name} exactly the way you want it.{freeExtrasNote(custom)}
            </p>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)_336px] xl:items-start">
          {/* Live preview: the bat's main photo, with the engraving cut into the lower blade */}
          <div className="relative h-[560px] overflow-hidden rounded-xs bg-surface-dark text-on-dark xl:h-[780px]">
            <div
              aria-hidden="true"
              className="absolute top-40 left-1/2 size-[300px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(254,197,2,0.2)_0%,rgba(254,197,2,0)_66%)]"
            />
            <span className="absolute top-6 left-6 inline-flex items-center gap-2 text-[11px] leading-[14px] font-semibold tracking-[0.2em] text-on-dark-subtle uppercase">
              <span aria-hidden="true" className="block size-2 rounded-full bg-success" />
              Live preview
            </span>
            {/* The photo is centred and fills the height, so the blade sits the same way for every bat. */}
            <div className="relative mx-auto mt-14 h-[360px] w-[142px] [container-type:size] xl:mt-[70px] xl:h-[482px] xl:w-[190px]">
              <Image
                src={bat.images[0]}
                alt={`${bat.name} preview with your configuration`}
                fill
                sizes="190px"
                className="object-contain drop-shadow-[0_36px_44px_rgba(0,0,0,0.85)]"
              />
              {custom.engraving && <BladeEngraving text={engraving || "YOUR NAME"} />}
            </div>
            <dl className="absolute inset-x-6 bottom-6 flex flex-col gap-2.5 text-[13px] leading-[18px]">
              {summary
                .filter(([key]) => ["Weight", "Profile", "Toe", "Handle shape", "Size"].includes(key))
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-3">
                    <dt className="text-on-dark-subtle">{key === "Handle shape" ? "Handle" : key}</dt>
                    <dd className="font-semibold">{value}</dd>
                  </div>
                ))}
            </dl>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-7">
            <OptionGroup
              label="Size"
              hint={advice || undefined}
              badge={
                // The guide is for willow sizes; tennis bats go by length.
                bat.subcategory !== "tennis-bats" && (
                  <SizeGuideDialog
                    trigger={
                      <button
                        type="button"
                        className="-my-3.5 ml-auto inline-flex h-11 cursor-pointer items-center gap-1.5 text-[13px] leading-[18px] font-semibold underline underline-offset-[3px] transition-colors hover:text-ink-muted"
                      >
                        Size guide
                        <ArrowRight className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
                      </button>
                    }
                  />
                )
              }
            >
              <SizeChoices
                bat={bat}
                selected={size}
                onChange={onSizeChange}
                className={cn(bat.sizes.length > 2 && "md:grid-cols-4 xl:grid-cols-2")}
              />
            </OptionGroup>
            <OptionGroup label="Weight">
              <ChoiceButtons
                variant="card"
                label="Weight"
                options={BAT_WEIGHTS}
                offered={custom.weights}
                value={config.weight}
                onChange={(value) => update("weight", value)}
              />
            </OptionGroup>
            <OptionGroup label="Profile" hint="The side view: the glow marks the sweet spot">
              <ChoiceButtons
                variant="picture"
                label="Profile"
                options={BAT_PROFILES}
                offered={custom.profiles}
                value={config.profile}
                onChange={(value) => update("profile", value)}
              />
            </OptionGroup>
            {toes && (
              <OptionGroup label="Toe shape">
                <ChoiceButtons
                  variant="picture"
                  label="Toe shape"
                  options={BAT_TOES}
                  offered={custom.toes}
                  value={config.toe}
                  onChange={(value) => update("toe", value)}
                />
              </OptionGroup>
            )}
            <OptionGroup label="Handle shape">
              <ChoiceButtons
                variant="card"
                label="Handle shape"
                options={BAT_HANDLES}
                offered={custom.handles}
                value={config.handle}
                onChange={(value) => update("handle", value)}
                glyph={(index) => <HandleGlyph index={index} />}
              />
            </OptionGroup>
            {custom.engraving && (
              <OptionGroup label="Name engraving" badge={<FreeChip tone="yellow" />} htmlFor="engrave">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="relative flex items-center">
                      <Input
                        id="engrave"
                        value={config.name}
                        maxLength={ENGRAVING_MAX}
                        placeholder="Enter your name"
                        aria-describedby="engrave-hint"
                        onChange={(event) => update("name", cleanEngravingInput(event.target.value))}
                        className="h-13 rounded-xs border-2 border-surface-raised bg-surface-raised px-4 pr-16 text-base font-semibold tracking-[0.06em] uppercase shadow-card placeholder:font-normal placeholder:tracking-normal placeholder:normal-case"
                      />
                      <span className="absolute right-4 text-xs leading-4 font-semibold text-ink-muted">
                        {engraving.length} / {ENGRAVING_MAX}
                      </span>
                    </div>
                    <span id="engrave-hint" className="text-xs leading-4 text-ink-muted">
                      Maximum {ENGRAVING_MAX} letters. Engraved on the lower blade.
                    </span>
                  </div>
                  <EngravingSwatch text={engraving || "YOUR NAME"} className="h-13 w-full sm:w-[220px] sm:shrink-0" />
                </div>
              </OptionGroup>
            )}
            {(custom.matchReady || custom.scuffSheet) && (
              <div className="flex flex-wrap gap-10">
                {custom.matchReady && (
                  <OptionGroup label="Match ready preparation" hint="Professional knocking — free of cost">
                    <YesNo label="Match ready preparation" value={config.knock} onChange={(value) => update("knock", value)} />
                  </OptionGroup>
                )}
                {custom.scuffSheet && (
                  <OptionGroup label="Clear scuff sheet" hint="Protects the face from day one">
                    <YesNo label="Clear scuff sheet" value={config.scuff} onChange={(value) => update("scuff", value)} />
                  </OptionGroup>
                )}
              </div>
            )}
          </div>

          {/* Live order summary */}
          <aside
            aria-label="Order summary"
            className="flex flex-col gap-4 rounded-xs bg-surface-dark p-6 text-on-dark xl:sticky xl:top-6"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] leading-[14px] font-semibold tracking-[0.2em] text-on-dark-subtle uppercase">
                Your order
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] leading-[14px] font-semibold text-on-dark-subtle">
                <Pin className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                Pinned while you build
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-[72px] w-14 shrink-0 items-center justify-center rounded-xs bg-surface-dark-raised">
                <span className="relative h-[60px] w-11">
                  <Image src={bat.images[0]} alt="" fill sizes="44px" className="object-contain" />
                </span>
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-lg leading-6 font-bold">{bat.name}</span>
                <span className="text-[13px] leading-[18px] text-on-dark-subtle">{bat.grade}</span>
              </span>
            </div>
            <dl className="flex flex-col border-t border-border-dark">
              {summary.map(([key, value, accent]) => (
                <div
                  key={key}
                  className="flex justify-between gap-3 border-b border-border-dark py-[9px] text-[13px] leading-[18px]"
                >
                  <dt className="text-on-dark-subtle">{key}</dt>
                  <dd className={cn("text-right font-semibold", accent && "text-brand-yellow")}>{value}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-baseline gap-2.5">
                {/* The price of the size chosen above. */}
                <span className="text-[32px] leading-[38px] font-bold tracking-[-0.02em]">
                  {formatPrice(size.price)}
                </span>
                {size.mrp > size.price && (
                  <>
                    <span className="text-sm leading-5 text-ink-subtle line-through">
                      {formatPrice(size.mrp)}
                    </span>
                    <span className="h-[22px] rounded-xs bg-brand-yellow px-2 text-[11px] leading-[22px] font-bold text-on-yellow">
                      {size.off}% OFF
                    </span>
                  </>
                )}
              </div>
              {bat.offer && <OfferNote offer={bat.offer} tone="dark" className="py-0.5" />}
              <span className="text-xs leading-4 text-on-dark-subtle">
                Customization included. No extra cost.
              </span>
            </div>
            <AddToCartButton
              item={item}
              productName={`Astaad ${bat.name}`}
              soldOut={soldOut}
              size="lg"
              className="h-14 w-full rounded-xs text-sm font-bold tracking-[0.1em] uppercase"
            >
              Add to cart
              <ArrowRight className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />
            </AddToCartButton>
            <ul className="flex flex-wrap justify-between gap-2 text-[11px] leading-[14px] font-medium text-on-dark-subtle">
              {trustRow(deliveryFeePaise).map((entry) => (
                <li key={entry.label} className="inline-flex items-center gap-1.5">
                  <entry.icon className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                  {entry.label}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}
