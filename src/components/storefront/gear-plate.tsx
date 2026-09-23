import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { gearHref, type GearProduct } from "@/lib/catalogue";
import { formatPrice } from "@/lib/format";

import { WishlistButton } from "./wishlist-button";

/** One gear product on its grey plate: badge, wishlist heart, name, note, price and Add to Cart. */
export function GearPlate({ product }: { product: GearProduct }) {
  const href = gearHref(product);
  return (
    <article className="group flex flex-col gap-4">
      <div className="relative flex h-[320px] items-center justify-center overflow-hidden rounded-xs bg-surface-sunken">
        {product.badge && (
          <Badge className="absolute top-4 left-4 h-6 rounded-xs px-2.5 text-xs leading-6 tracking-[0.04em]">
            {product.badge}
          </Badge>
        )}
        <WishlistButton name={product.name} className="absolute top-2 right-2" />
        <Link href={href} aria-label={`View ${product.name}`} className="block">
          <Image
            src={product.image}
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
        <p className="text-[13px] leading-[18px] text-ink-muted">
          {product.line} · {product.note}
        </p>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-2xl leading-[30px] font-bold">{formatPrice(product.price)}</span>
        {product.mrp && (
          <span className="text-[15px] leading-[22px] text-ink-subtle line-through">
            MRP {formatPrice(product.mrp)}
          </span>
        )}
      </div>
      <div className="flex gap-3">
        <Button className="h-12 flex-1 rounded-xs font-bold">Add to Cart</Button>
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
