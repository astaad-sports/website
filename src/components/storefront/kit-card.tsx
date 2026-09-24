import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { KitTile } from "./kit-tiles";
import { OfferNote } from "./offer-note";
import { OutOfStockChip } from "./out-of-stock-chip";

export type KitCardProps = KitTile & {
  /** Category line above the name (product page). */
  eyebrow?: string;
  height?: 400 | 380;
  className?: string;
};

const CHIP = "h-6 rounded-xs bg-surface-dark px-2.5 text-xs leading-6 font-bold tracking-[0.04em] text-on-dark";

/**
 * The phone's 164px product card for a row that scrolls sideways: the cut-out
 * on grey, the name on two lines, the price and a round add-to-cart button.
 */
export function KitMiniCard({
  name,
  price,
  mrp,
  badge,
  href,
  image,
  imageWidth,
  imageHeight,
  cartItem,
  soldOut,
  offer,
}: KitTile) {
  // The cut-out keeps its shape inside a 136 × 148 box.
  const scale = Math.min(136 / imageWidth, 148 / imageHeight);
  const width = Math.round(imageWidth * scale);
  const height = Math.round(imageHeight * scale);
  return (
    <article className="relative flex w-[164px] flex-col">
      <Link
        href={href}
        aria-label={name}
        className="relative flex h-[172px] items-center justify-center overflow-hidden rounded-xs bg-surface-sunken"
      >
        <Image
          src={image}
          alt=""
          width={width}
          height={height}
          sizes={`${width}px`}
          style={{ width, height }}
          className="object-contain drop-shadow-[0_14px_14px_rgba(14,14,14,0.25)]"
        />
      </Link>
      {(badge || soldOut) && (
        <span className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
          {soldOut && <OutOfStockChip />}
          {badge && <span className={CHIP}>{badge}</span>}
        </span>
      )}
      <span className="mt-2.5 line-clamp-2 min-h-10 text-sm leading-5 font-semibold">
        <Link href={href}>{name}</Link>
      </span>
      {offer && <OfferNote offer={offer} truncate className="mt-0.5 text-xs leading-4" />}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="flex min-w-0 flex-col">
          <span className="text-base leading-[22px] font-bold">{formatPrice(price)}</span>
          {mrp && <span className="text-xs leading-4 text-ink-subtle line-through">{formatPrice(mrp)}</span>}
        </span>
        <AddToCartButton
          item={cartItem}
          productName={`Astaad ${name}`}
          soldOut={soldOut}
          size="icon"
          aria-label={`Add ${name} to cart`}
          className="size-11 shrink-0 rounded-full"
        >
          <ShoppingCart className="size-[18px]" strokeWidth={2} aria-hidden="true" />
        </AddToCartButton>
      </div>
    </article>
  );
}

/**
 * A grey product tile with the cut-out floating above the name, a note (or
 * the running offer), the price and a round yellow add-to-cart button (greyed
 * out when out of stock).
 */
export function KitCard({
  name,
  note,
  price,
  mrp,
  eyebrow,
  badge,
  href,
  image,
  imageWidth,
  imageHeight,
  imageTop,
  cartItem,
  soldOut,
  offer,
  height = 400,
  className,
}: KitCardProps) {
  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-xs bg-surface-sunken p-6",
        height === 380 ? "h-[380px]" : "h-[400px]",
        className
      )}
    >
      {(badge || soldOut) && (
        <span className="absolute top-5 left-5 z-10 flex gap-1.5">
          {soldOut && <OutOfStockChip />}
          {badge && <span className={CHIP}>{badge}</span>}
        </span>
      )}
      <Image
        src={image}
        alt={name}
        width={imageWidth}
        height={imageHeight}
        style={{ top: imageTop, marginLeft: -imageWidth / 2, width: imageWidth, height: imageHeight }}
        className="absolute left-1/2 object-contain drop-shadow-[0_20px_20px_rgba(14,14,14,0.28)] transition-transform duration-300 group-hover:-translate-y-2"
      />
      <div className="absolute inset-x-6 bottom-6 flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          {eyebrow && (
            <span className="text-xs leading-4 font-medium tracking-[0.16em] text-ink-muted uppercase">
              {eyebrow}
            </span>
          )}
          <span className="text-lg leading-6 font-bold">
            <Link href={href}>{name}</Link>
          </span>
          {/* The tile's height is fixed, so a running offer takes the note's line. */}
          {offer ? (
            <OfferNote offer={offer} truncate />
          ) : (
            note && <span className="text-[13px] leading-[18px] text-ink-muted">{note}</span>
          )}
          <span className="mt-1 text-base leading-[22px] font-bold">
            {formatPrice(price)}
            {mrp && (
              <span className="ml-1.5 text-[13px] font-normal text-ink-subtle line-through">
                {formatPrice(mrp)}
              </span>
            )}
          </span>
        </div>
        <AddToCartButton
          item={cartItem}
          productName={`Astaad ${name}`}
          soldOut={soldOut}
          size="icon"
          aria-label={`Add ${name} to cart`}
          className="size-11 shrink-0 rounded-full"
        >
          <ShoppingCart className="size-[18px]" strokeWidth={2} aria-hidden="true" />
        </AddToCartButton>
      </div>
    </article>
  );
}
