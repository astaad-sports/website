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

import {
  type GearCategoryContent,
  type GearCategorySlug,
  type StoreCategory,
} from "@/lib/catalogue";
import { formatPrice } from "@/lib/format";
import { gearLine, type StoreGear } from "@/lib/products/model";

import type { DeliveryTerms } from "./delivery";
import { Eyebrow } from "./eyebrow";
import { GearGallery } from "./gear-gallery";
import { GearOptions } from "./gear-options";
import { OfferNote } from "./offer-note";
import { ProductPromises } from "./product-promises";
import { StockStatus } from "./stock-status";

const HIGHLIGHTS: Record<GearCategorySlug, { icon: typeof Truck; label: string }[]> = {
  "batting-pads": [
    { icon: ShieldCheck, label: "Leg protection" },
    { icon: Feather, label: "Light on the run" },
    { icon: Ruler, label: "Boys, youth and men’s" },
    { icon: ArrowLeftRight, label: "Right or left hand" },
  ],
  "batting-gloves": [
    { icon: Hand, label: "Palm grip" },
    { icon: ShieldCheck, label: "Finger protection" },
    { icon: Ruler, label: "Boys, youth and men’s" },
    { icon: ArrowLeftRight, label: "Right or left hand" },
  ],
  helmets: [
    { icon: ShieldCheck, label: "Steel grille" },
    { icon: SlidersHorizontal, label: "Adjustable fit" },
    { icon: Ruler, label: "Small, medium, large" },
    { icon: Feather, label: "Padded liner" },
  ],
  "cricket-kitbags": [
    { icon: Luggage, label: "Wheelie base" },
    { icon: Package, label: "Room for a full kit" },
    { icon: Grip, label: "Carry handles" },
    { icon: Award, label: "Astaad crest" },
  ],
};

/**
 * The gear product hero: the stage on the left; name, stock, price (with any
 * running offer), delivery promises, options and highlights on the right.
 * From xl it is at least 760px tall, growing with the options beside the stage.
 */
export function GearHero({
  product,
  category,
  content,
  delivery,
}: {
  product: StoreGear;
  category: StoreCategory;
  content: GearCategoryContent;
  delivery: DeliveryTerms;
}) {
  // The % OFF chip and the saving show only while an offer runs; an MRP alone
  // is struck through as before. The struck price is then the MRP, or the
  // regular price when there is none.
  const offerMrp = product.offer ? product.mrp : undefined;
  return (
    <section aria-labelledby="pdp-title" className="grid grid-cols-1 lg:grid-cols-[54%_1fr] xl:min-h-[760px]">
      <GearGallery product={product} />
      <div className="flex flex-col gap-[18px] px-4 py-8 md:px-8 md:py-10 xl:py-14 xl:pr-16 xl:pl-14">
        <Eyebrow bar>
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <span aria-hidden="true">·</span>
          <Link href={category.href} className="transition-colors hover:text-foreground">
            {category.name}
          </Link>
        </Eyebrow>
        <div className="flex flex-col gap-1.5">
          <h1
            id="pdp-title"
            className="type-display text-[44px] leading-[0.92] tracking-[-0.03em] md:text-[64px]"
          >
            {product.name}
          </h1>
          <p className="text-lg leading-[26px] text-ink-muted">{gearLine(product)}</p>
        </div>
        <div className="flex items-center gap-4 text-sm leading-5">
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
          product={{ slug: product.slug, categorySlug: product.categorySlug, name: product.name }}
          soldOut={product.soldOut}
          content={content}
          categoryName={category.name}
          categoryHref={category.href}
        />
        <ul aria-label="Highlights" className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3">
          {HIGHLIGHTS[product.categorySlug].map((item) => (
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
