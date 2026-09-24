import Link from "next/link";
import { ArrowRight, Leaf, Scale, ShoppingCart, Star, Target, Zap } from "lucide-react";

import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Button } from "@/components/ui/button";
import { batCartItem } from "@/lib/cart";
import { DEFAULT_BAT_CONFIG } from "@/lib/catalogue";
import { formatPrice } from "@/lib/format";
import type { StoreBat } from "@/lib/products/model";

import type { DeliveryTerms } from "./delivery";
import { Eyebrow } from "./eyebrow";
import { OfferNote } from "./offer-note";
import { ProductGallery } from "./product-gallery";
import { ProductPromises } from "./product-promises";
import { StockStatus } from "./stock-status";

/**
 * The product hero: the gallery on the left; name, stock, price (with any
 * running offer), delivery promises and actions on the right. From xl it is
 * 760px tall, growing when an offer or a dispatch time needs the room.
 */
export function ProductHero({ bat, delivery }: { bat: StoreBat; delivery: DeliveryTerms }) {
  const highlights = [
    { icon: Leaf, label: bat.grade },
    { icon: Scale, label: "Balanced Pickup" },
    { icon: Target, label: "Great Control" },
    { icon: Zap, label: "Game Ready" },
  ];
  const discounted = bat.mrp > bat.price;

  return (
    <section aria-labelledby="pdp-title" className="grid grid-cols-1 lg:grid-cols-[54%_1fr] xl:min-h-[760px]">
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
          <StockStatus product={bat} />
        </div>
        <div className="flex flex-col gap-1 border-y border-border py-4">
          <div className="flex flex-wrap items-center gap-3.5">
            <span className="text-[40px] leading-[44px] font-bold tracking-[-0.02em]">
              {formatPrice(bat.price)}
            </span>
            {discounted && (
              <>
                <span className="text-lg leading-6 text-ink-subtle line-through">
                  {formatPrice(bat.mrp)}
                </span>
                <span className="h-[26px] rounded-xs bg-brand-yellow px-2.5 text-xs leading-[26px] font-bold tracking-[0.06em] text-on-yellow">
                  {bat.off}% OFF
                </span>
              </>
            )}
          </div>
          {bat.offer && <OfferNote offer={bat.offer} />}
          <span className="text-[13px] leading-[18px] text-ink-muted">
            {discounted
              ? `You save ${formatPrice(bat.mrp - bat.price)} · inclusive of all taxes`
              : "Inclusive of all taxes"}
          </span>
        </div>
        <ProductPromises delivery={delivery} />
        <div className="mt-1 flex flex-col gap-2.5">
          <Button
            size="lg"
            render={<Link href="#build" />}
            nativeButton={false}
            className="h-15 w-full rounded-xs text-[15px] font-bold tracking-[0.1em] uppercase"
          >
            {bat.customization.enabled ? "Customize your bat" : "Choose your size"}
            <ArrowRight className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />
          </Button>
          <AddToCartButton
            item={batCartItem(bat.slug, DEFAULT_BAT_CONFIG, 1, bat.customization)}
            productName={`Astaad ${bat.name}`}
            soldOut={bat.soldOut}
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
