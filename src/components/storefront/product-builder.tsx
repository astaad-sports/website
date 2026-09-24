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
  BAT_SIZES,
  BAT_TOES,
  BAT_WEIGHTS,
  ENGRAVING_MAX,
} from "@/lib/catalogue";
import { formatPrice } from "@/lib/format";
import { startingBatConfig, type StoreBat } from "@/lib/products/model";
import { cn } from "@/lib/utils";

import { ChoiceButtons, FreeChip, HandleGlyph, OptionGroup, useBatConfig, YesNo } from "./bat-options";
import { BatSilhouette } from "./bat-silhouette";
import { deliveryShort } from "./delivery";
import { Eyebrow } from "./eyebrow";
import { OfferNote } from "./offer-note";
import { SectionHeading } from "./section-heading";
import { SizeGuideDialog } from "./size-guide-dialog";

const SILHOUETTE_HEIGHTS = [
  "h-[200px] lg:h-[292px]",
  "h-[224px] lg:h-[326px]",
  "h-[246px] lg:h-[360px]",
  "h-[246px] lg:h-[360px]",
];

/** The row under the summary's Add to cart, with delivery as Settings have it. */
function trustRow(deliveryFeePaise: number) {
  return [
    { icon: Truck, label: deliveryShort(deliveryFeePaise) },
    { icon: Lock, label: "Secure payment" },
    { icon: RotateCcw, label: "Easy returns" },
  ];
}

function shortRange(age: string, height: string) {
  return `${age.replace(" years", " yrs")} · ${height.replace(/ /g, "")}`;
}

/** The heading's promise, naming only the free extras this bat offers. */
function freeExtrasNote({ engraving, matchReady }: StoreBat["customization"]): string {
  if (engraving && matchReady) return " Engraving and knocking are free.";
  if (engraving) return " Engraving is free.";
  if (matchReady) return " Knocking is free.";
  return "";
}

/** "Choose your size": the four sizes as silhouettes, and `buy` under the selection when the bat has no builder. */
function SizeSection({
  id,
  eyebrow,
  value,
  onChange,
  buy,
}: {
  id?: string;
  eyebrow: string;
  value: number;
  onChange: (size: number) => void;
  buy?: ReactNode;
}) {
  const size = BAT_SIZES[value];
  return (
    <section
      id={id}
      aria-labelledby="size-title"
      className={cn(
        "site-shell flex flex-col gap-12 pt-16 pb-16 md:pt-[72px] lg:flex-row lg:items-start",
        !buy && "xl:h-[560px] xl:pb-0"
      )}
    >
      <div className="flex w-full flex-col gap-5 lg:w-[340px] lg:shrink-0">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 id="size-title" className="type-display text-[40px] leading-[0.95] tracking-[-0.02em] md:text-[48px]">
          Choose your size
        </h2>
        <p className="text-[15px] leading-[22px] text-ink-muted">
          Most adult players are SH. LH adds an inch to the handle, not the blade. Tap a bat
          to select it.
        </p>
        <div className="flex flex-col gap-1 rounded-xs bg-surface-sunken p-4">
          <span className="text-[11px] leading-[14px] font-semibold tracking-[0.2em] text-ink-muted uppercase">
            Selected
          </span>
          <span className="text-xl leading-[26px] font-bold">{size.label}</span>
        </div>
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
        {buy}
      </div>
      <RadioGroup
        aria-label="Bat size"
        value={String(value)}
        onValueChange={(next) => onChange(Number(next))}
        className="grid w-full flex-1 grid-cols-2 gap-3 border-b border-border-strong lg:flex lg:items-end"
      >
        {BAT_SIZES.map((item, index) => {
          const selected = index === value;
          return (
            <RadioPrimitive.Root
              key={item.code}
              value={String(index)}
              className={cn(
                "flex h-[300px] cursor-pointer flex-col items-center justify-end gap-3.5 rounded-xs px-2 pt-5 pb-4 text-foreground transition-colors lg:h-[420px] lg:flex-1 lg:basis-0",
                selected && "bg-surface-dark text-on-dark"
              )}
            >
              <BatSilhouette
                className={SILHOUETTE_HEIGHTS[index]}
                longHandle={item.longHandle}
                fill={selected ? "var(--brand-yellow)" : "var(--border-dark)"}
                handle={selected ? "var(--on-dark)" : "var(--ink)"}
              />
              <span className="flex flex-col items-center gap-0.5 text-center">
                <span className="text-[15px] leading-5 font-bold">{item.label}</span>
                <span className="text-xs leading-4 opacity-70">{shortRange(item.age, item.height)}</span>
              </span>
            </RadioPrimitive.Root>
          );
        })}
      </RadioGroup>
    </section>
  );
}

/** Price (with any running offer) and Add to cart for a bat sold only in its standard build, under the size picker. */
function StandardBuy({ bat, item }: { bat: StoreBat; item: CartItem }) {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-5">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <span className="text-[32px] leading-[38px] font-bold tracking-[-0.02em]">{formatPrice(bat.price)}</span>
          {bat.mrp > bat.price && (
            <>
              <span className="text-sm leading-5 text-ink-subtle line-through">{formatPrice(bat.mrp)}</span>
              <span className="h-[22px] self-center rounded-xs bg-brand-yellow px-2 text-[11px] leading-[22px] font-bold text-on-yellow">
                {bat.off}% OFF
              </span>
            </>
          )}
        </div>
        {bat.offer && <OfferNote offer={bat.offer} />}
      </div>
      <AddToCartButton
        item={item}
        productName={`Astaad ${bat.name}`}
        soldOut={bat.soldOut}
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
 * The configurator (weight, profile, toe, handle, engraving, knocking, scuff
 * sheet) with a live preview and a pinned order summary, followed by the size picker.
 * Only the options this bat offers appear. A bat that cannot be customised
 * gets just the size picker, with its price and Add to cart. One state drives
 * both sections.
 */
export function ProductBuilder({ bat, deliveryFeePaise }: { bat: StoreBat; deliveryFeePaise: number }) {
  const custom = bat.customization;
  const { config, update } = useBatConfig(startingBatConfig(custom));
  const item = batCartItem(bat.slug, config, 1, custom);
  const onSizeChange = (size: number) => update("size", size);

  if (!custom.enabled) {
    return (
      <SizeSection
        id="build"
        eyebrow="Standard build"
        value={config.size}
        onChange={onSizeChange}
        buy={<StandardBuy bat={bat} item={item} />}
      />
    );
  }

  const engraving = custom.engraving ? config.name.trim().toUpperCase() : "";
  const toes = custom.toes.length > 0;
  const summary: [string, string, boolean?][] = [
    ["Weight", BAT_WEIGHTS[config.weight].label],
    ["Profile", BAT_PROFILES[config.profile].label],
    ...(toes ? [["Toe", BAT_TOES[config.toe].label] as [string, string]] : []),
    ["Handle shape", BAT_HANDLES[config.handle].label],
  ];
  if (custom.engraving) summary.push(["Engraving", engraving || "None", true]);
  if (custom.matchReady) summary.push(["Knocking", config.knock ? "Yes · Free" : "No"]);
  if (custom.scuffSheet) summary.push(["Scuff sheet", config.scuff ? "Yes" : "No"]);
  summary.push(["Size", BAT_SIZES[config.size].label]);

  return (
    <>
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
            {/* Live preview: the bat's main photo, with the engraving drawn down the lower blade */}
            <div className="relative h-[560px] overflow-hidden rounded-xs bg-surface-dark text-on-dark xl:h-[780px]">
              <div
                aria-hidden="true"
                className="absolute top-40 left-1/2 size-[300px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(254,197,2,0.2)_0%,rgba(254,197,2,0)_66%)]"
              />
              <span className="absolute top-6 left-6 inline-flex items-center gap-2 text-[11px] leading-[14px] font-semibold tracking-[0.2em] text-on-dark-subtle uppercase">
                <span aria-hidden="true" className="block size-2 rounded-full bg-success" />
                Live preview
              </span>
              <div className="relative mx-auto mt-14 h-[360px] w-[142px] xl:mt-[70px] xl:h-[482px] xl:w-[190px]">
                <Image
                  src={bat.images[0]}
                  alt={`${bat.name} preview with your configuration`}
                  fill
                  sizes="190px"
                  className="object-contain drop-shadow-[0_36px_44px_rgba(0,0,0,0.85)]"
                />
                {/* The photo is centred and fills the height, so the blade's centre line and toe are
                    fixed: the name starts just above the toe and a longer one grows up the blade. */}
                {custom.engraving && (
                  <span
                    aria-hidden="true"
                    className="type-display absolute top-[90%] left-[calc(50%-0.5em)] origin-top-left -rotate-90 text-[13px] leading-none tracking-[0.14em] whitespace-nowrap text-brand-yellow xl:text-[15px]"
                  >
                    {engraving || "YOUR NAME"}
                  </span>
                )}
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
                    <div className="flex h-13 w-full items-center justify-center overflow-hidden rounded-xs bg-surface-dark px-4 sm:w-[220px] sm:shrink-0">
                      <span className="type-display text-base leading-none tracking-[0.14em] whitespace-nowrap text-brand-yellow">
                        {engraving || "YOUR NAME"}
                      </span>
                    </div>
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
                  <span className="text-[32px] leading-[38px] font-bold tracking-[-0.02em]">
                    {formatPrice(bat.price)}
                  </span>
                  {bat.mrp > bat.price && (
                    <>
                      <span className="text-sm leading-5 text-ink-subtle line-through">
                        {formatPrice(bat.mrp)}
                      </span>
                      <span className="h-[22px] rounded-xs bg-brand-yellow px-2 text-[11px] leading-[22px] font-bold text-on-yellow">
                        {bat.off}% OFF
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
                soldOut={bat.soldOut}
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

      <SizeSection eyebrow="Step 2 of 2" value={config.size} onChange={onSizeChange} />
    </>
  );
}
