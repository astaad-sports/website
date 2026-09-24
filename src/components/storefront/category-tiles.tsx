import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { STORE_CATEGORIES, type StoreCategory } from "@/lib/catalogue";
import { formatPrice } from "@/lib/format";

import { SectionHeading } from "./section-heading";

function CategoryTile({ category }: { category: StoreCategory }) {
  const { tile } = category;
  return (
    <Link
      href={category.href}
      className="group relative flex h-[280px] flex-col items-center transition-transform duration-200 hover:-translate-y-1"
    >
      <span
        aria-hidden="true"
        className="absolute top-0 left-0 text-[72px] leading-none font-bold tracking-[-0.04em] text-[#f0f0f0]"
      >
        {category.number}
      </span>
      <span
        aria-hidden="true"
        className="absolute left-1/2 max-w-full -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(14,14,14,0.22)_0%,rgba(14,14,14,0)_70%)]"
        style={{ top: tile.shadowTop, width: tile.shadowWidth, height: 50 }}
      />
      <Image
        src={category.image}
        alt=""
        width={tile.width}
        height={tile.height}
        style={{ top: tile.top, width: tile.width, height: tile.height }}
        className="absolute object-contain drop-shadow-[0_18px_18px_rgba(14,14,14,0.25)]"
      />
      <span className="absolute bottom-0 left-0 flex flex-col gap-0.5">
        <span className="text-lg leading-6 font-bold">{category.name}</span>
        <span className="text-[13px] leading-[18px] text-ink-muted">
          {category.models ? `${category.models} models · ` : ""}from {formatPrice(category.from)}
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        strokeWidth={1.5}
        className="absolute right-0 bottom-1 size-5 text-foreground transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}

/** "Everything for the crease." — the five numbered category tiles. */
export function CategoryTiles() {
  return (
    <section
      id="categories"
      aria-labelledby="cat-title"
      className="site-shell flex flex-col gap-10 pt-16 pb-4 md:pt-[72px] xl:h-[480px] xl:pb-0"
    >
      <SectionHeading
        id="cat-title"
        eyebrow="Shop by category"
        title="Everything for the crease."
        aside={
          <p className="max-w-[360px] text-[15px] leading-[22px] text-ink-muted md:text-right">
            Five categories. All Astaad. Built to the same standard as our bats.
          </p>
        }
      />
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 xl:grid-cols-5">
        {STORE_CATEGORIES.map((category) => (
          <CategoryTile key={category.slug} category={category} />
        ))}
      </div>
    </section>
  );
}
