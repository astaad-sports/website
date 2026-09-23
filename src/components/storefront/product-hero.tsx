import Link from "next/link";
import { ArrowRight, Check, Leaf, Scale, ShoppingCart, Star, Target, Zap } from "lucide-react";

import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Button } from "@/components/ui/button";
import { batCartItem } from "@/lib/cart";
import { type Bat } from "@/lib/catalogue";
import { formatPrice } from "@/lib/format";

import { Eyebrow } from "./eyebrow";
import { ProductGallery } from "./product-gallery";

const PROMISES = [
  "Free delivery across India",
  "Easy returns within 7 days",
  "100% Genuine Astaad Product",
];

/** The product hero: the gallery on the left, name, price and actions on the right. */
export function ProductHero({ bat }: { bat: Bat }) {
  const highlights = [
    { icon: Leaf, label: bat.grade },
    { icon: Scale, label: "Balanced Pickup" },
    { icon: Target, label: "Great Control" },
    { icon: Zap, label: "Game Ready" },
  ];

  return (
    <section aria-labelledby="pdp-title" className="grid lg:grid-cols-[54%_1fr] xl:h-[760px]">
      <ProductGallery bat={bat} />
      <div className="flex flex-col gap-[18px] px-4 py-8 md:px-8 md:py-10 xl:py-14 xl:pr-16 xl:pl-14">
        <Eyebrow bar>Astaad Sports</Eyebrow>
        <div className="flex flex-col gap-1.5">
          <h1
            id="pdp-title"
            className="type-display text-[48px] leading-[0.92] tracking-[-0.03em] md:text-[72px]"
          >
            {bat.name}
          </h1>
          <p className="text-lg leading-[26px] text-ink-muted">{bat.grade} Cricket Bat</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm leading-5">
          {bat.rating != null && (
            <>
              <span className="inline-flex items-center gap-1.5 font-bold">
                <Star className="size-4 fill-rating stroke-rating" aria-hidden="true" />
                {bat.rating.toFixed(1)}
              </span>
              {bat.reviews != null && (
                <span className="text-ink-muted underline underline-offset-[3px]">
                  {bat.reviews} Reviews
                </span>
              )}
              <span aria-hidden="true" className="block h-4 w-px bg-border" />
            </>
          )}
          <span className="inline-flex items-center gap-2 font-semibold text-success">
            <span aria-hidden="true" className="block size-2 rounded-full bg-success" />
            In Stock
          </span>
        </div>
        <div className="flex flex-col gap-1 border-y border-border py-4">
          <div className="flex flex-wrap items-center gap-3.5">
            <span className="text-[40px] leading-[44px] font-bold tracking-[-0.02em]">
              {formatPrice(bat.price)}
            </span>
            <span className="text-lg leading-6 text-ink-subtle line-through">
              {formatPrice(bat.mrp)}
            </span>
            <span className="h-[26px] rounded-xs bg-brand-yellow px-2.5 text-xs leading-[26px] font-bold tracking-[0.06em] text-on-yellow">
              {bat.off}% OFF
            </span>
          </div>
          <span className="text-[13px] leading-[18px] text-ink-muted">
            You save {formatPrice(bat.mrp - bat.price)} · inclusive of all taxes
          </span>
        </div>
        <ul className="flex flex-col gap-1.5 text-sm leading-5">
          {PROMISES.map((promise) => (
            <li key={promise} className="flex items-center gap-2.5">
              <Check className="size-4 text-success" strokeWidth={2.2} aria-hidden="true" />
              {promise}
            </li>
          ))}
        </ul>
        <div className="mt-1 flex flex-col gap-2.5">
          <Button
            size="lg"
            render={<Link href="#build" />}
            nativeButton={false}
            className="h-15 w-full rounded-xs text-[15px] font-bold tracking-[0.1em] uppercase"
          >
            Customize your bat
            <ArrowRight className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />
          </Button>
          <AddToCartButton
            item={batCartItem(bat.slug)}
            productName={`Astaad ${bat.name}`}
            size="lg"
            variant="secondary"
            className="h-13 w-full rounded-xs border border-border bg-surface-raised text-sm font-bold tracking-[0.1em] uppercase hover:border-border-strong hover:bg-surface-raised"
          >
            <ShoppingCart className="size-[18px]" strokeWidth={2} aria-hidden="true" />
            Add to cart · standard build
          </AddToCartButton>
        </div>
        <ul aria-label="Highlights" className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3">
          {highlights.map((item) => (
            <li key={item.label} className="flex items-center gap-3 text-sm leading-5 font-semibold">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xs bg-surface-sunken">
                <item.icon className="size-5" strokeWidth={1.5} aria-hidden="true" />
              </span>
              {item.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
