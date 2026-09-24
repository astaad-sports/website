import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { STORE_CATEGORIES, type StoreCategory } from "@/lib/catalogue";
import { formatPrice } from "@/lib/format";
import type { CategorySlug, CategoryStats } from "@/lib/products/model";
import { cn } from "@/lib/utils";

import { SectionHeading } from "./section-heading";

/** "6 models · from ₹7,699" for bats, "from ₹4,999" for gear, or "Coming soon" with nothing on sale. */
function statsLine(category: StoreCategory, { models, from }: CategoryStats): string {
  if (from === null) return "Coming soon";
  const count = category.kind === "bats" ? `${models} ${models === 1 ? "model" : "models"} · ` : "";
  return `${count}from ${formatPrice(from)}`;
}

function CategoryTile({ category, stats }: { category: StoreCategory; stats: CategoryStats }) {
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
        <span className="text-[13px] leading-[18px] text-ink-muted">{statsLine(category, stats)}</span>
      </span>
      <ChevronRight
        aria-hidden="true"
        strokeWidth={1.5}
        className="absolute right-0 bottom-1 size-5 text-foreground transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}

/** The phone's round category chip: the cut-out in a circle, the name, and the lowest price. */
function CategoryChip({ category, stats }: { category: StoreCategory; stats: CategoryStats }) {
  const bats = category.kind === "bats";
  const size = chipSize(category);
  return (
    <Link href={category.href} className="flex w-[84px] shrink-0 snap-start flex-col items-center gap-2 text-center">
      <span
        className={cn(
          "flex size-[76px] items-center justify-center rounded-full bg-surface-circle",
          bats ? "border-2 border-brand-yellow" : "border border-border"
        )}
      >
        <Image
          src={category.image}
          alt=""
          width={size.width}
          height={size.height}
          sizes="64px"
          style={size}
          className="object-contain drop-shadow-[0_6px_6px_rgba(14,14,14,0.2)]"
        />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className={cn("line-clamp-2 min-h-8 text-[12.5px] leading-4", bats ? "font-bold" : "font-semibold")}>{category.name}</span>
        <span className="text-[11px] leading-[14px] text-ink-muted">
          {stats.from === null ? "Coming soon" : `from ${formatPrice(stats.from)}`}
        </span>
      </span>
    </Link>
  );
}

/** The cut-out's size inside the 76px circle: its tile placement scaled to fit a 54px box (64px wide for the bat). */
function chipSize({ tile, kind }: StoreCategory): { width: number; height: number } {
  const box = kind === "bats" ? 64 : 54;
  const scale = box / Math.max(tile.width, tile.height);
  return { width: Math.round(tile.width * scale), height: Math.round(tile.height * scale) };
}

/**
 * "Everything for the crease." — the five numbered category tiles, with what
 * each has on sale. On phones, a row of round chips that scrolls sideways.
 */
export function CategoryTiles({ stats }: { stats: Record<CategorySlug, CategoryStats> }) {
  return (
    <section
      id="categories"
      aria-labelledby="cat-title"
      className="site-shell flex flex-col gap-4 pt-6 pb-6 md:gap-10 md:pt-[72px] md:pb-4 xl:h-[480px] xl:pb-0"
    >
      <SectionHeading
        id="cat-title"
        compact
        eyebrow="Shop by category"
        title="Everything for the crease."
        aside={
          <p className="hidden max-w-[360px] text-[15px] leading-[22px] text-ink-muted md:block md:text-right">
            Five categories. All Astaad. Built to the same standard as our bats.
          </p>
        }
      />
      <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 md:hidden">
        {STORE_CATEGORIES.map((category) => (
          <li key={category.slug} className="flex">
            <CategoryChip category={category} stats={stats[category.slug as CategorySlug]} />
          </li>
        ))}
      </ul>
      <div className="hidden gap-6 md:grid md:grid-cols-3 xl:grid-cols-5">
        {STORE_CATEGORIES.map((category) => (
          <CategoryTile key={category.slug} category={category} stats={stats[category.slug as CategorySlug]} />
        ))}
      </div>
    </section>
  );
}
