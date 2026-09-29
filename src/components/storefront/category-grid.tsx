"use client";

import Link from "next/link";
import { Fragment, useState, type ReactNode } from "react";
import { Radio as RadioPrimitive } from "@base-ui/react/radio";

import { Button } from "@/components/ui/button";
import { RadioGroup } from "@/components/ui/radio-group";
import { STORE_CATEGORIES } from "@/lib/catalogue";
import { BAT_SUBCATEGORIES, type StoreBat, type StoreGear } from "@/lib/products/model";
import { cn } from "@/lib/utils";

import { BatPlate } from "./bat-plate";
import { GearPlate } from "./gear-plate";
import { KitMiniCard } from "./kit-card";
import { batTile, gearTile } from "./kit-tiles";

type SortKey = "featured" | "price-asc" | "price-desc";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
];

function sortProducts<T extends { price: number }>(products: T[], sort: SortKey): T[] {
  if (sort === "featured") return products;
  const direction = sort === "price-asc" ? 1 : -1;
  return [...products].sort((a, b) => (a.price - b.price) * direction);
}

/** The designed empty state: nothing here yet, and where to look instead. */
function EmptyShelf({ title, action }: { title: string; action: { label: string; href: string } }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xs border border-border bg-surface-sunken px-6 py-16 text-center">
      <p className="type-heading-md">{title}</p>
      <p className="type-body-sm max-w-sm text-ink-muted">
        New models are on the way. Browse the rest of the range in the meantime.
      </p>
      <Button
        variant="secondary"
        render={<Link href={action.href} />}
        nativeButton={false}
        className="mt-2 rounded-xs"
      >
        {action.label}
      </Button>
    </div>
  );
}

/** A way to narrow the grid: the tab's name, and the products it keeps. */
interface GridGroup<T> {
  key: string;
  label: string;
  has: (product: T) => boolean;
}

const EVERYTHING = "all";

/**
 * Products with a count and sort pills, each drawn by `plate`; `empty` stands
 * in when there are none. With `groups`, a row of tabs above narrows the grid
 * to one of them; `allLabel` names the tab that shows everything. With `card`,
 * phones get two columns of those smaller cards in place of the plates.
 */
function SortableGrid<T extends { id: string; price: number }>({
  products,
  plate,
  card,
  empty,
  groups = [],
  allLabel = "All",
}: {
  products: T[];
  plate: (product: T) => ReactNode;
  card?: (product: T) => ReactNode;
  empty?: ReactNode;
  groups?: GridGroup<T>[];
  allLabel?: string;
}) {
  const [sort, setSort] = useState<SortKey>("featured");
  const [group, setGroup] = useState(EVERYTHING);
  const chosen = groups.find((entry) => entry.key === group);
  const shown = chosen ? products.filter(chosen.has) : products;
  const sorted = sortProducts(shown, sort);
  const tabs = [
    { key: EVERYTHING, label: allLabel, count: products.length },
    ...groups.map(({ key, label, has }) => ({ key, label, count: products.filter(has).length })),
  ];

  return (
    <section
      aria-labelledby="products-title"
      className="site-shell flex flex-col gap-8 py-16 md:pt-20"
    >
      {groups.length > 0 && (
        <RadioGroup
          aria-label="Show"
          value={group}
          onValueChange={(next) => setGroup(next as string)}
          className="no-scrollbar -mx-4 flex w-auto gap-7 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0"
        >
          {tabs.map((tab) => (
            <RadioPrimitive.Root
              key={tab.key}
              value={tab.key}
              className="-mb-px inline-flex h-12 shrink-0 cursor-pointer items-center gap-2 border-b-2 text-[13px] leading-5 font-bold tracking-[0.06em] whitespace-nowrap uppercase transition-colors data-checked:border-brand-yellow data-checked:text-foreground not-data-checked:border-transparent not-data-checked:text-ink-muted not-data-checked:hover:text-foreground"
            >
              {tab.label}
              <span className="font-medium text-ink-subtle">{tab.count}</span>
            </RadioPrimitive.Root>
          ))}
        </RadioGroup>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 id="products-title" className="type-heading-md">
          {shown.length} {shown.length === 1 ? "product" : "products"}
        </h2>
        <RadioGroup
          aria-label="Sort products"
          value={sort}
          onValueChange={(next) => setSort(next as SortKey)}
          className="flex w-auto flex-wrap gap-2"
        >
          {SORTS.map((option) => (
            <RadioPrimitive.Root
              key={option.key}
              value={option.key}
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border-2 px-5 text-[13px] leading-5 font-bold tracking-[0.06em] text-foreground uppercase transition-colors data-checked:border-surface-dark data-checked:bg-surface-dark data-checked:text-brand-yellow not-data-checked:border-border not-data-checked:bg-surface-raised not-data-checked:hover:border-border-strong"
            >
              {option.label}
            </RadioPrimitive.Root>
          ))}
        </RadioGroup>
      </div>

      {sorted.length > 0 ? (
        <>
          {card && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:hidden">
              {sorted.map((product) => (
                <Fragment key={product.id}>{card(product)}</Fragment>
              ))}
            </div>
          )}
          <div className={cn("grid gap-6 sm:grid-cols-2 xl:grid-cols-3", card && "max-md:hidden")}>
            {sorted.map((product) => (
              <Fragment key={product.id}>{plate(product)}</Fragment>
            ))}
          </div>
        </>
      ) : (
        empty
      )}
    </section>
  );
}

/** The category's products with a count and sort pills; a designed empty state when there are none. */
export function CategoryGrid({
  products,
  categoryName,
}: {
  products: StoreGear[];
  categoryName: string;
}) {
  return (
    <SortableGrid
      products={products}
      plate={(product) => <GearPlate product={product} />}
      empty={
        <EmptyShelf
          title={`No ${categoryName.toLowerCase()} yet.`}
          action={{ label: "Shop all gear", href: "/shop" }}
        />
      }
    />
  );
}

/**
 * Bats on their plates, with the same count and sort pills. With none yet,
 * just the empty state: an empty shelf needs no count or sorting. `ranges`
 * adds a tab for each willow range with bats in it, for the page of every bat.
 */
export function BatGrid({ bats, noun, ranges }: { bats: StoreBat[]; noun: string; ranges?: boolean }) {
  if (!bats.length) {
    return (
      <div className="site-shell py-16 md:pt-20">
        <EmptyShelf
          title={`No ${noun} yet.`}
          action={ranges ? { label: "Shop all gear", href: "/shop" } : { label: "Shop all bats", href: "/shop/bats" }}
        />
      </div>
    );
  }
  const groups = BAT_SUBCATEGORIES.filter(({ slug }) => bats.some((bat) => bat.subcategory === slug)).map(
    ({ slug, name }): GridGroup<StoreBat> => ({ key: slug, label: name, has: (bat) => bat.subcategory === slug })
  );
  return (
    <SortableGrid
      products={bats}
      plate={(bat) => <BatPlate bat={bat} />}
      // One range alone needs no tabs.
      groups={ranges && groups.length > 1 ? groups : []}
      allLabel="All bats"
    />
  );
}

/** The category a product is sold under: gear carries its own, a bat is a bat. */
function categoryOf(product: StoreBat | StoreGear): string {
  return "categorySlug" in product ? product.categorySlug : "bats";
}

/**
 * Everything on the store, bats first, with a tab for each category that has
 * something in it. It is a long list, so phones show it two cards to a row.
 */
export function ShopGrid({ bats, gear }: { bats: StoreBat[]; gear: StoreGear[] }) {
  const products = [...bats, ...gear];
  const groups = STORE_CATEGORIES.filter(({ slug }) => products.some((product) => categoryOf(product) === slug)).map(
    ({ slug, name }): GridGroup<StoreBat | StoreGear> => ({
      key: slug,
      label: name,
      has: (product) => categoryOf(product) === slug,
    })
  );
  return (
    <SortableGrid
      products={products}
      plate={(product) => ("categorySlug" in product ? <GearPlate product={product} /> : <BatPlate bat={product} />)}
      card={(product) => (
        <KitMiniCard {...("categorySlug" in product ? gearTile(product) : batTile(product))} className="w-auto min-w-0" />
      )}
      groups={groups.length > 1 ? groups : []}
      empty={<EmptyShelf title="Nothing on the shelves yet." action={{ label: "Back to home", href: "/" }} />}
    />
  );
}
