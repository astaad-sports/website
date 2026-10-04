"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Radio as RadioPrimitive } from "@base-ui/react/radio";

import { BuyButtons } from "@/components/cart/buy-buttons";
import { RadioGroup } from "@/components/ui/radio-group";
import { gearCartItem } from "@/lib/cart";
import { HANDS, type Hand } from "@/lib/catalogue";
import type { StoreGear } from "@/lib/products/model";
import { findVariant, sizeSoldOut, startingVariant, variantNote, variantSoldOut } from "@/lib/products/variants";

interface Pill {
  value: string;
  label: string;
  /** None left: shown struck through, and cannot be picked. */
  soldOut: boolean;
}

function OptionPills({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Pill[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-xs leading-4 font-bold tracking-[0.2em] uppercase">{label}</span>
      <RadioGroup
        aria-label={label}
        value={value}
        onValueChange={(next) => onChange(String(next))}
        className="flex w-auto flex-wrap gap-2"
      >
        {options.map((option) => (
          <RadioPrimitive.Root
            key={option.value}
            value={option.value}
            disabled={option.soldOut}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xs border px-5 text-sm leading-5 font-semibold text-foreground transition-colors data-checked:border-surface-dark data-checked:bg-surface-dark data-checked:text-on-dark data-disabled:cursor-not-allowed data-disabled:text-ink-subtle data-disabled:line-through not-data-checked:border-border not-data-checked:bg-surface-raised not-data-disabled:not-data-checked:hover:border-border-strong"
          >
            {option.label}
            {option.soldOut && <span className="sr-only"> (out of stock)</span>}
          </RadioPrimitive.Root>
        ))}
      </RadioGroup>
    </div>
  );
}

export type GearOptionsProduct = Pick<
  StoreGear,
  "slug" | "name" | "sizes" | "hands" | "variants" | "usualSize" | "soldOut" | "regularPrice" | "lowStockThreshold"
>;

/**
 * Size and hand choices (where the product has them), the selection line,
 * Add to cart beside Buy now, and a link to the rest of the category. Each
 * size and hand has its own stock: one with none left is struck through, and
 * the button reads "Out of stock" and cannot be pressed when the chosen one
 * cannot be bought. `size` (from the address) is the size
 * it starts on, in the first hand that can be bought.
 */
export function GearOptions({
  product,
  categoryName,
  categoryHref,
  size: startingSize,
}: {
  product: GearOptionsProduct;
  categoryName: string;
  categoryHref: string;
  size?: string;
}) {
  const [chosen, setChosen] = useState(() => {
    const inSize = startingSize ? product.variants.filter((entry) => entry.size === startingSize) : [];
    const start = inSize.find((entry) => !variantSoldOut(product, entry)) ?? inSize[0] ?? startingVariant(product);
    return { size: start.size, hand: start.hand };
  });
  // The product may have changed under the page (a size removed): fall back to where a picker starts.
  const variant = findVariant(product, chosen.size, chosen.hand) ?? startingVariant(product);
  const selection = [variant.sizeLabel, variant.hand].filter(Boolean);
  const note = variantNote(product, variant);
  // A product with nothing left says so on the button; its sizes stay readable.
  const mark = !product.soldOut;

  function chooseSize(size: string) {
    // Keep the hand if this size has it in stock, otherwise the first hand that is.
    const inSize = product.variants.filter((entry) => entry.size === size);
    const keep = inSize.find((entry) => entry.hand === variant.hand && !variantSoldOut(product, entry));
    const next = keep ?? inSize.find((entry) => !variantSoldOut(product, entry)) ?? inSize[0];
    setChosen({ size, hand: next?.hand ?? null });
  }

  return (
    <div className="flex flex-col gap-5">
      {product.sizes.length > 0 && (
        <OptionPills
          label="Size"
          options={product.sizes.map((size) => ({
            value: size.code,
            label: size.label,
            soldOut: mark && sizeSoldOut(product, size.code),
          }))}
          value={variant.size ?? ""}
          onChange={chooseSize}
        />
      )}
      {product.hands && (
        <OptionPills
          label="Hand"
          options={HANDS.map((hand) => ({
            value: hand,
            label: hand,
            soldOut: mark && variantSoldOut(product, findVariant(product, variant.size, hand)),
          }))}
          value={variant.hand ?? ""}
          onChange={(hand) => setChosen({ size: variant.size, hand: hand as Hand })}
        />
      )}
      {selection.length > 0 && (
        <p className="text-[13px] leading-[18px] text-ink-muted">
          Selected: <span className="font-semibold text-foreground">{selection.join(" · ")}</span>
          {note && !product.soldOut && <span className="font-semibold text-foreground"> · {note}</span>}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <BuyButtons
          item={gearCartItem(product, variant)}
          productName={`Astaad ${product.name}`}
          soldOut={variantSoldOut(product, variant)}
        />
        <Link
          href={categoryHref}
          className="inline-flex h-11 items-center gap-2 self-start border-b-2 border-brand-yellow px-1 text-[13px] leading-[18px] font-bold tracking-[0.08em] uppercase transition-colors hover:text-ink-muted"
        >
          Shop all {categoryName.toLowerCase()}
          <ArrowRight className="size-4" strokeWidth={2.2} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
