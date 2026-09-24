import Image from "next/image";
import Link from "next/link";

import { type StoreCategory } from "@/lib/catalogue";
import { formatPrice } from "@/lib/format";

import { deliveryPromise } from "./delivery";
import { Eyebrow } from "./eyebrow";

/**
 * The black category stage: breadcrumb, display title, tagline, the count,
 * starting price and delivery (as Settings have it), and the cut-out under
 * the floodlight.
 */
export function CategoryHero({
  category,
  count,
  from,
  deliveryFeePaise,
}: {
  category: StoreCategory;
  count: number;
  /** The lowest price, offers included. */
  from: number;
  deliveryFeePaise: number;
}) {
  const width = category.tile.width * 2;
  const height = category.tile.height * 2;

  return (
    <section
      aria-labelledby="category-title"
      className="relative overflow-hidden bg-surface-dark text-on-dark"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-[6%] hidden size-[560px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(254,197,2,0.22)_0%,rgba(254,197,2,0)_66%)] lg:block"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-[9%] hidden size-[440px] -translate-y-1/2 rounded-full border border-brand-yellow/30 lg:block"
      />
      <div className="site-shell relative flex flex-col gap-10 py-14 lg:min-h-[520px] lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:py-16">
        <div className="flex max-w-[640px] flex-col gap-6">
          <Eyebrow bar className="text-on-dark-muted">
            <Link href="/" className="transition-colors hover:text-brand-yellow">
              Home
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/#categories" className="transition-colors hover:text-brand-yellow">
              Shop
            </Link>
            <span aria-hidden="true">·</span>
            <span className="text-on-dark">{category.name}</span>
          </Eyebrow>
          <h1
            id="category-title"
            className="type-display text-[56px] leading-[0.9] tracking-[-0.03em] md:text-[96px]"
          >
            {category.name}
          </h1>
          <p className="max-w-[520px] text-lg leading-7 text-on-dark-muted md:text-xl md:leading-[30px]">
            {category.tagline}
          </p>
          <ul className="flex flex-col gap-2 text-xs leading-4 font-semibold tracking-[0.22em] text-on-dark-muted uppercase sm:flex-row sm:flex-wrap sm:items-center sm:gap-0">
            <li className="sm:pr-7">
              {count} {count === 1 ? "model" : "models"}
            </li>
            <li className="sm:border-l sm:border-border-on-dark sm:px-7">from {formatPrice(from)}</li>
            <li className="sm:border-l sm:border-border-on-dark sm:px-7">{deliveryPromise(deliveryFeePaise)}</li>
          </ul>
        </div>
        <div
          className="relative mx-auto w-full shrink-0 lg:mx-0"
          style={{ maxWidth: width, aspectRatio: `${width} / ${height}` }}
        >
          <Image
            src={category.image}
            alt=""
            fill
            priority
            sizes={`${width}px`}
            className="object-contain drop-shadow-[0_48px_56px_rgba(0,0,0,0.75)]"
          />
        </div>
      </div>
    </section>
  );
}
