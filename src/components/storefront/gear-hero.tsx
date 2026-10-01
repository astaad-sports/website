import Link from "next/link";
import {
  ArrowLeftRight,
  Award,
  Feather,
  Grip,
  Hand,
  Luggage,
  Package,
  Ruler,
  ShieldCheck,
  SlidersHorizontal,
  type Truck,
} from "lucide-react";

import { type GearCategorySlug, type StoreCategory } from "@/lib/catalogue";
import { formatPrice } from "@/lib/format";
import { gearLine, listInWords, type StoreGear } from "@/lib/products/model";
import type { PublicReview } from "@/lib/reviews/model";
import { midSentence } from "@/lib/words";

import type { DeliveryTerms } from "./delivery";
import { Eyebrow } from "./eyebrow";
import { GearGallery } from "./gear-gallery";
import { GearOptions } from "./gear-options";
import { OfferNote } from "./offer-note";
import { ProductPromises } from "./product-promises";
import { ProductRatingLink } from "./product-reviews";
import { StockStatus } from "./stock-status";
import { WishlistButton } from "./wishlist-button";

interface Highlight {
  icon: typeof Truck;
  label: string;
}

/** Each category's highlights; "sizes" and "hands" stand for what the product itself is sold in. */
const HIGHLIGHTS: Record<GearCategorySlug, (Highlight | "sizes" | "hands")[]> = {
  "batting-pads": [
    { icon: ShieldCheck, label: "Leg protection" },
    { icon: Feather, label: "Light on the run" },
    "sizes",
    "hands",
  ],
  "batting-gloves": [
    { icon: Hand, label: "Palm grip" },
    { icon: ShieldCheck, label: "Finger protection" },
    "sizes",
    "hands",
  ],
  helmets: [
    { icon: ShieldCheck, label: "Steel grille" },
    { icon: SlidersHorizontal, label: "Adjustable fit" },
    "sizes",
    { icon: Feather, label: "Padded liner" },
  ],
  "cricket-kitbags": [
    { icon: Luggage, label: "Wheelie base" },
    { icon: Package, label: "Room for a full kit" },
    { icon: Grip, label: "Carry handles" },
    { icon: Award, label: "Astaad crest" },
  ],
};

/** "Medium, large and XL", or "Men’s size" for a product sold in one. */
function sizesLabel(sizes: string[]): string {
  if (sizes.length === 1) return `${sizes[0]} size`;
  const [first, ...rest] = sizes;
  return listInWords([first, ...rest.map(midSentence)]);
}

/** The category's highlights, with the sizes and hands this product is sold in (left out when it has none). */
function highlightsFor(product: StoreGear): Highlight[] {
  return HIGHLIGHTS[product.categorySlug].flatMap((entry) => {
    if (entry === "sizes") {
      return product.sizes.length ? [{ icon: Ruler, label: sizesLabel(product.sizes.map((size) => size.label)) }] : [];
    }
    if (entry === "hands") return product.hands ? [{ icon: ArrowLeftRight, label: "Right or left hand" }] : [];
    return [entry];
  });
}

/**
 * The gear product hero: the stage on the left; the wishlist heart, name,
 * rating (from the product's own published reviews), stock, price (with any
 * running offer), delivery promises, options and highlights on the right. From xl it is at
 * least 760px tall, growing with the options beside the stage. `size` (from
 * the address, see sizeInAddress) is the size the options start on.
 */
export function GearHero({
  product,
  category,
  delivery,
  reviews,
  size,
}: {
  product: StoreGear;
  category: StoreCategory;
  delivery: DeliveryTerms;
  reviews: PublicReview[];
  size?: string;
}) {
  // The % OFF chip and the saving show only while an offer runs; an MRP alone
  // is struck through as before. The struck price is then the MRP, or the
  // regular price when there is none.
  const offerMrp = product.offer ? product.mrp : undefined;
  return (
    <section aria-labelledby="pdp-title" className="grid grid-cols-1 lg:grid-cols-[54%_1fr] xl:min-h-[760px]">
      <GearGallery product={product} />
      <div className="flex flex-col gap-[18px] px-4 py-8 md:px-8 md:py-10 xl:py-14 xl:pr-16 xl:pl-14">
        <div className="flex items-center justify-between gap-3">
          <Eyebrow bar>
            <Link href="/" className="transition-colors hover:text-foreground">
              Home
            </Link>
            <span aria-hidden="true">·</span>
            <Link href={category.href} className="transition-colors hover:text-foreground">
              {category.name}
            </Link>
          </Eyebrow>
          <WishlistButton productId={product.id} name={product.name} className="-my-3 -mr-2.5 shrink-0" />
        </div>
        {/* A container, so the title can size to its column: "Godfather" is
            about 6.44em wide, and at 64px it pushed the column past a 1024px
            screen. With room to spare the title keeps its size. */}
        <div className="@container flex flex-col gap-1.5">
          <h1
            id="pdp-title"
            className="type-display text-[length:min(44px,100cqw/6.5)] leading-[0.92] tracking-[-0.03em] md:text-[length:min(64px,100cqw/6.5)]"
          >
            {product.name}
          </h1>
          <p className="text-lg leading-[26px] text-ink-muted">{gearLine(product)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm leading-5">
          {reviews.length > 0 && (
            <>
              <ProductRatingLink reviews={reviews} />
              <span aria-hidden="true" className="block h-4 w-px bg-border" />
            </>
          )}
          <StockStatus product={product} />
        </div>
        <div className="flex flex-col gap-1 border-y border-border py-4">
          <div className="flex flex-wrap items-center gap-3.5">
            <span className="text-[40px] leading-[44px] font-bold tracking-[-0.02em]">
              {formatPrice(product.price)}
            </span>
            {product.mrp && (
              <span className="text-lg leading-6 text-ink-subtle line-through">
                {formatPrice(product.mrp)}
              </span>
            )}
            {offerMrp && (
              <span className="h-[26px] rounded-xs bg-brand-yellow px-2.5 text-xs leading-[26px] font-bold tracking-[0.06em] text-on-yellow">
                {product.off}% OFF
              </span>
            )}
          </div>
          {product.offer && <OfferNote offer={product.offer} />}
          <span className="text-[13px] leading-[18px] text-ink-muted">
            {offerMrp
              ? `You save ${formatPrice(offerMrp - product.price)} · inclusive of all taxes`
              : "Inclusive of all taxes"}
          </span>
        </div>
        <ProductPromises delivery={delivery} />
        <GearOptions
          key={size ?? ""}
          size={size}
          product={{
            slug: product.slug,
            name: product.name,
            sizes: product.sizes,
            hands: product.hands,
            variants: product.variants,
            usualSize: product.usualSize,
            soldOut: product.soldOut,
            regularPrice: product.regularPrice,
            lowStockThreshold: product.lowStockThreshold,
          }}
          categoryName={category.name}
          categoryHref={category.href}
        />
        <ul aria-label="Highlights" className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3">
          {highlightsFor(product).map((item) => (
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
