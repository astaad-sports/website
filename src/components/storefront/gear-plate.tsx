import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Button } from "@/components/ui/button";
import { gearCartItem } from "@/lib/cart";
import { gearHref } from "@/lib/catalogue";
import { formatPrice } from "@/lib/format";
import { gearLine, percentOff, type StoreGear } from "@/lib/products/model";

import { OfferNote } from "./offer-note";
import { OutOfStockChip } from "./out-of-stock-chip";
import { WishlistButton } from "./wishlist-button";

/**
 * One gear product on its grey plate: badges, wishlist heart, name, note,
 * price (with the running offer under it) and Add to Cart. Out of stock, it
 * says so and cannot be added.
 */
export function GearPlate({ product }: { product: StoreGear }) {
  const href = gearHref(product);
  // Gear gets a % OFF chip only while an offer runs; an MRP alone is shown as before.
  const off = product.offer && product.mrp ? percentOff(product.price, product.mrp) : 0;
  return (
    <article className="group flex flex-col gap-4">
      <div className="relative flex h-[320px] items-center justify-center overflow-hidden rounded-xs bg-surface-sunken">
        {(product.badge || product.soldOut || off > 0) && (
          <span className="absolute top-4 left-4 flex gap-1.5">
            {product.soldOut && <OutOfStockChip />}
            {off > 0 && (
              <span className="h-6 rounded-xs bg-brand-yellow px-2.5 text-xs leading-6 font-bold tracking-[0.04em] text-on-yellow">
                {off}% OFF
              </span>
            )}
            {product.badge && (
              <Badge className="h-6 rounded-xs px-2.5 text-xs leading-6 tracking-[0.04em]">{product.badge}</Badge>
            )}
          </span>
        )}
        <WishlistButton name={product.name} className="absolute top-2 right-2" />
        <Link href={href} aria-label={`View ${product.name}`} className="block">
          <Image
            src={product.images[0]}
            alt={`Astaad ${product.name}`}
            width={product.imageWidth}
            height={product.imageHeight}
            style={{ width: product.imageWidth, height: product.imageHeight }}
            className="object-contain drop-shadow-[0_24px_24px_rgba(14,14,14,0.28)] transition-transform duration-300 group-hover:-translate-y-2"
          />
        </Link>
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-2xl leading-8 font-bold tracking-[-0.01em]">
          <Link href={href}>{product.name}</Link>
        </h3>
        <p className="text-[13px] leading-[18px] text-ink-muted">{gearLine(product)}</p>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-3">
          <span className="text-2xl leading-[30px] font-bold">{formatPrice(product.price)}</span>
          {product.mrp && (
            <span className="text-[15px] leading-[22px] text-ink-subtle line-through">
              {/* "MRP" only for a real one: with none, an offer strikes out the regular price. */}
              {product.mrp > product.regularPrice && "MRP "}
              {formatPrice(product.mrp)}
            </span>
          )}
        </div>
        {product.offer && <OfferNote offer={product.offer} />}
      </div>
      <div className="flex gap-3">
        <AddToCartButton
          item={gearCartItem(product)}
          productName={`Astaad ${product.name}`}
          soldOut={product.soldOut}
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
