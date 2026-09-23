"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { Radio as RadioPrimitive } from "@base-ui/react/radio";

import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Button } from "@/components/ui/button";
import { RadioGroup } from "@/components/ui/radio-group";
import { gearCartItem } from "@/lib/cart";
import { HANDS, type GearCategoryContent, type GearProduct, type Hand } from "@/lib/catalogue";

function OptionPills({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
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
            key={option}
            value={option}
            className="h-11 cursor-pointer rounded-xs border px-5 text-sm leading-5 font-semibold text-foreground transition-colors data-checked:border-surface-dark data-checked:bg-surface-dark data-checked:text-on-dark not-data-checked:border-border not-data-checked:bg-surface-raised not-data-checked:hover:border-border-strong"
          >
            {option}
          </RadioPrimitive.Root>
        ))}
      </RadioGroup>
    </div>
  );
}

/** Size and hand choices (where the category has them), the selection line and Add to cart. */
export function GearOptions({
  product,
  content,
  categoryName,
  categoryHref,
}: {
  product: Pick<GearProduct, "slug" | "categorySlug" | "name">;
  content: GearCategoryContent;
  categoryName: string;
  categoryHref: string;
}) {
  const [size, setSize] = useState(content.defaultSize ?? content.sizes?.[0] ?? "");
  const [hand, setHand] = useState<Hand>(HANDS[0]);
  const selection = [content.sizes ? size : null, content.hands ? hand : null].filter(Boolean);

  return (
    <div className="flex flex-col gap-5">
      {content.sizes && (
        <OptionPills label="Size" options={content.sizes} value={size} onChange={setSize} />
      )}
      {content.hands && (
        <OptionPills label="Hand" options={[...HANDS]} value={hand} onChange={(value) => setHand(value as Hand)} />
      )}
      {selection.length > 0 && (
        <p className="text-[13px] leading-[18px] text-ink-muted">
          Selected: <span className="font-semibold text-foreground">{selection.join(" · ")}</span>
        </p>
      )}
      <div className="flex flex-col gap-2.5">
        <AddToCartButton
          item={gearCartItem(product, { size, hand })}
          productName={`Astaad ${product.name}`}
          size="lg"
          className="h-15 w-full rounded-xs text-[15px] font-bold tracking-[0.1em] uppercase"
        >
          <ShoppingCart className="size-[18px]" strokeWidth={2} aria-hidden="true" />
          Add to cart
        </AddToCartButton>
        <Button
          size="lg"
          variant="secondary"
          render={<Link href={categoryHref} />}
          nativeButton={false}
          className="h-13 w-full rounded-xs border border-border bg-surface-raised text-sm font-bold tracking-[0.1em] uppercase hover:border-border-strong hover:bg-surface-raised"
        >
          Shop all {categoryName.toLowerCase()}
          <ArrowRight className="size-4" strokeWidth={2.2} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
