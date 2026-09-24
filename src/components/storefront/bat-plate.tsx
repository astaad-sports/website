import Image from "next/image";
import Link from "next/link";

import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Button } from "@/components/ui/button";
import { batCartItem } from "@/lib/cart";
import { BAT_IMAGE, DEFAULT_BAT_CONFIG } from "@/lib/catalogue";
import { formatPrice } from "@/lib/format";
import type { StoreBat } from "@/lib/products/model";
import { cn } from "@/lib/utils";

import { OutOfStockChip } from "./out-of-stock-chip";
import { WishlistButton } from "./wishlist-button";

/** One bat on its plate: the blade, name, grade, price and two actions. Out of stock, it says so and cannot be added. */
export function BatPlate({ bat }: { bat: StoreBat }) {
  const href = `/bats/${bat.slug}`;
  const image = bat.images[0];
  // The Black Edition's darker blade is drawn from the standard cut-out; a real photo shows as it is.
  const darkBlade = bat.dark && image === BAT_IMAGE;
  const discounted = bat.mrp > bat.price;
  return (
    <article className="group flex flex-col gap-4">
      <div
        className={cn(
          "relative flex h-[320px] items-center justify-center overflow-hidden rounded-xs",
          bat.dark ? "bg-surface-dark-sunken" : "bg-surface-sunken"
        )}
      >
        <span className="absolute top-4 left-4 flex gap-1.5">
          {bat.soldOut && <OutOfStockChip onDark={bat.dark} />}
          {discounted && (
            <span className="h-6 rounded-xs bg-brand-yellow px-2.5 text-xs leading-6 font-bold tracking-[0.04em] text-on-yellow">
              {bat.off}% OFF
            </span>
          )}
          {bat.badges?.map((badge) => (
            <span
              key={badge}
              className="h-6 rounded-xs bg-surface-dark px-2.5 text-xs leading-6 font-bold tracking-[0.04em] text-on-dark"
            >
              {badge}
            </span>
          ))}
        </span>
        <WishlistButton name={bat.name} onDark={bat.dark} className="absolute top-2 right-2" />
        <Link href={href} aria-label={`View ${bat.name}`} className="block">
          <Image
            src={image}
            alt={`Astaad ${bat.name} bat`}
            width={112}
            height={284}
            className={cn(
              "h-[284px] w-[112px] object-contain transition-transform duration-300 group-hover:-translate-y-2 group-hover:-rotate-6",
              darkBlade
                ? "brightness-[0.62] contrast-[1.15] grayscale drop-shadow-[0_24px_24px_rgba(0,0,0,0.7)]"
                : "drop-shadow-[0_24px_24px_rgba(14,14,14,0.28)]"
            )}
          />
        </Link>
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-2xl leading-8 font-bold tracking-[-0.01em]">
          <Link href={href}>{bat.name}</Link>
          {bat.tagline && (
            <span className="ml-1.5 text-[13px] leading-[18px] font-medium tracking-[0.12em] text-ink-muted uppercase">
              {bat.tagline}
            </span>
          )}
        </h3>
        <p className="text-[13px] leading-[18px] text-ink-muted">{bat.grade}</p>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-2xl leading-[30px] font-bold">{formatPrice(bat.price)}</span>
        {discounted && (
          <span className="text-[15px] leading-[22px] text-ink-subtle line-through">
            MRP {formatPrice(bat.mrp)}
          </span>
        )}
      </div>
      <div className="flex gap-3">
        <AddToCartButton
          item={batCartItem(bat.slug, DEFAULT_BAT_CONFIG, 1, bat.customization)}
          productName={`Astaad ${bat.name}`}
          soldOut={bat.soldOut}
          className="h-12 flex-1 rounded-xs font-bold"
        >
          Add to Cart
        </AddToCartButton>
        <Button
          variant="secondary"
          render={<Link href={href} />}
          nativeButton={false}
          className="h-12 rounded-xs border border-border px-5 hover:border-border-strong hover:bg-transparent"
        >
          View Product
        </Button>
      </div>
    </article>
  );
}
