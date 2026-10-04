import Link from "next/link";
import { ArrowRight, Leaf, Scale, ShoppingCart, Target, Zap } from "lucide-react";

import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { BuyNowButton } from "@/components/cart/buy-now-button";
import { Button } from "@/components/ui/button";
import { batCartItem } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { standardBatConfig, type StoreBat } from "@/lib/products/model";
import { findVariant, otherPrices, startingVariant, variantSoldOut } from "@/lib/products/variants";
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
 * tall, growing when an offer or a dispatch time needs the room. With `size`
 * (from the address, see sizeInAddress), the price and the cart and buy
 * buttons are that size's.
 */
export function ProductHero({
  bat,
  delivery,
  reviews,
  size,
}: {
  bat: StoreBat;
  delivery: DeliveryTerms;
  reviews: PublicReview[];
  size?: string;
}) {
  const highlights = [
    { icon: Leaf, label: bat.grade },
    { icon: Scale, label: "Balanced Pickup" },
    { icon: Target, label: "Great Control" },
    { icon: Zap, label: "Game Ready" },
  ];
  // The size the address asks for, and the bat at that size's price.
  const chosen = size ? findVariant(bat, size) : undefined;
  const shown = chosen
    ? { ...bat, price: chosen.price, regularPrice: chosen.regularPrice, mrp: chosen.mrp, off: chosen.off }
    : bat;
  const discounted = shown.mrp > shown.price;
  // Sizes with a price of their own, and the sizes the price above is for.
  const standard = chosen ?? startingVariant(bat);
  const others = otherPrices(shown);
  const atThisPrice = bat.sizes.filter((size) => !others.some((variant) => variant.size === size.code));
  // What Add to cart and Buy it now sell: the standard build. The size is
  // named when the address chose it, or when the price above is not this size's.
  const standardItem = batCartItem(bat, standardBatConfig(bat, chosen?.size));
  const standardSoldOut = chosen ? variantSoldOut(bat, chosen) : bat.soldOut;
  const standardSize = chosen
    ? ` · ${chosen.sizeLabel}`
    : standard.regularPrice !== bat.regularPrice
      ? ` · ${standard.sizeLabel} ${formatPrice(standard.price)}`
      : "";

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
              {formatPrice(shown.price)}
            </span>
            {discounted && (
              <>
                <span className="text-lg leading-6 text-ink-subtle line-through">
                  {formatPrice(shown.mrp)}
                </span>
                <span className="h-[26px] rounded-xs bg-brand-yellow px-2.5 text-xs leading-[26px] font-bold tracking-[0.06em] text-on-yellow">
                  {shown.off}% OFF
                </span>
              </>
            )}
          </div>
          {bat.offer && <OfferNote offer={bat.offer} />}
          <span className="text-[13px] leading-[18px] text-ink-muted">
            {discounted
              ? `You save ${formatPrice(shown.mrp - shown.price)} · inclusive of all taxes`
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
            item={standardItem}
            productName={`Astaad ${bat.name}`}
            soldOut={standardSoldOut}
            size="lg"
            variant="secondary"
            // With a size named the label is too long for one line on a phone, so it may wrap.
            className="w-full rounded-xs border border-border bg-surface-raised text-sm font-bold tracking-[0.1em] whitespace-normal uppercase hover:border-border-strong hover:bg-surface-raised"
          >
            <ShoppingCart className="size-[18px]" strokeWidth={2} aria-hidden="true" />
            Add to cart · standard build
            {standardSize}
          </AddToCartButton>
          <BuyNowButton
            item={standardItem}
            soldOut={standardSoldOut}
            size="lg"
            className="w-full rounded-xs text-sm font-bold tracking-[0.1em] whitespace-normal uppercase"
          >
            Buy it now · standard build
            {standardSize}
            <ArrowRight className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />
          </BuyNowButton>
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
