import Link from "next/link";
import { ArrowRight, Leaf, Scale, ShoppingCart, Target, Zap } from "lucide-react";

import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Button } from "@/components/ui/button";
import { batCartItem } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import type { StoreBat } from "@/lib/products/model";
import { otherPrices, startingVariant } from "@/lib/products/variants";
import type { PublicReview } from "@/lib/reviews/model";

import type { DeliveryTerms } from "./delivery";
import { Eyebrow } from "./eyebrow";
import { OfferNote } from "./offer-note";
import { ProductGallery } from "./product-gallery";
import { ProductPromises } from "./product-promises";
import { ProductRatingLink } from "./product-reviews";
import { StockStatus } from "./stock-status";
import { WishlistButton } from "./wishlist-button";

/**
 * The product hero: the gallery on the left; the wishlist heart, name, rating
 * (from the bat's own published reviews), stock, price (with any running
 * offer), delivery promises and actions on the right. From xl it is 760px
 * tall, growing when an offer or a dispatch time needs the room.
 */
export function ProductHero({
  bat,
  delivery,
  reviews,
}: {
  bat: StoreBat;
  delivery: DeliveryTerms;
  reviews: PublicReview[];
}) {
  const highlights = [
    { icon: Leaf, label: bat.grade },
    { icon: Scale, label: "Balanced Pickup" },
    { icon: Target, label: "Great Control" },
    { icon: Zap, label: "Game Ready" },
  ];
  const discounted = bat.mrp > bat.price;
  // Sizes with a price of their own, and the sizes the price above is for.
  const standard = startingVariant(bat);
  const others = otherPrices(bat);
  const atThisPrice = bat.sizes.filter((size) => !others.some((variant) => variant.size === size.code));

  return (
    <section aria-labelledby="pdp-title" className="grid grid-cols-1 lg:grid-cols-[54%_1fr] xl:min-h-[760px]">
      <ProductGallery bat={bat} />
      <div className="flex flex-col gap-[18px] px-4 py-8 md:px-8 md:py-10 xl:py-14 xl:pr-16 xl:pl-14">
        <div className="flex items-center justify-between gap-3">
          <Eyebrow bar>Astaad Sports</Eyebrow>
          <WishlistButton productId={bat.id} name={bat.name} className="-my-3 -mr-2.5 shrink-0" />
        </div>
        {/* A container, so the title can size to its column: "Godfather" is
            about 6.44em wide, and at 72px it pushed the column past a 1024px
            screen. With room to spare the title keeps its size. */}
        <div className="@container flex flex-col gap-1.5">
          <h1
            id="pdp-title"
            className="type-display text-[length:min(48px,100cqw/6.5)] leading-[0.92] tracking-[-0.03em] md:text-[length:min(72px,100cqw/6.5)]"
          >
            {bat.name}
          </h1>
          <p className="text-lg leading-[26px] text-ink-muted">{bat.grade} Cricket Bat</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm leading-5">
          {reviews.length > 0 && (
            <>
              <ProductRatingLink reviews={reviews} />
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
          {others.length > 0 && (
            <span className="text-[13px] leading-[18px] text-ink-muted">
              {atThisPrice.length > 0 && `Price for ${atThisPrice.map((size) => size.label).join(" and ")}. `}
              {others.map((variant, index) => (
                <span key={variant.key}>
                  {index > 0 && " · "}
                  {variant.sizeLabel} <span className="font-semibold text-foreground">{formatPrice(variant.price)}</span>
                </span>
              ))}
            </span>
          )}
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
            item={batCartItem(bat)}
            productName={`Astaad ${bat.name}`}
            soldOut={bat.soldOut}
            size="lg"
            variant="secondary"
            className="h-13 w-full rounded-xs border border-border bg-surface-raised text-sm font-bold tracking-[0.1em] uppercase hover:border-border-strong hover:bg-surface-raised"
          >
            <ShoppingCart className="size-[18px]" strokeWidth={2} aria-hidden="true" />
            Add to cart · standard build
            {/* Named when the price above is not this size's. */}
            {standard.regularPrice !== bat.regularPrice && ` · ${standard.sizeLabel} ${formatPrice(standard.price)}`}
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
