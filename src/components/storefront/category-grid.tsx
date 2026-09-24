"use client";

import Link from "next/link";
import { Fragment, useState, type ReactNode } from "react";
import { Radio as RadioPrimitive } from "@base-ui/react/radio";

import { Button } from "@/components/ui/button";
import { RadioGroup } from "@/components/ui/radio-group";
import type { StoreBat, StoreGear } from "@/lib/products/model";

import { BatPlate } from "./bat-plate";
import { GearPlate } from "./gear-plate";

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

/** Products with a count and sort pills, each drawn by `plate`; `empty` stands in when there are none. */
function SortableGrid<T extends { slug: string; price: number }>({
  products,
  plate,
  empty,
}: {
  products: T[];
  plate: (product: T) => ReactNode;
  empty?: ReactNode;
}) {
  const [sort, setSort] = useState<SortKey>("featured");
  const sorted = sortProducts(products, sort);

  return (
    <section
      aria-labelledby="products-title"
      className="site-shell flex flex-col gap-8 py-16 md:pt-20"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 id="products-title" className="type-heading-md">
          {products.length} {products.length === 1 ? "product" : "products"}
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
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((product) => (
            <Fragment key={product.slug}>{plate(product)}</Fragment>
          ))}
        </div>
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
          action={{ label: "Shop all gear", href: "/#categories" }}
        />
      }
    />
  );
}

/**
 * A bat range's bats on their plates, with the same count and sort pills.
 * With none yet, just the empty state: an empty shelf needs no count or sorting.
 */
export function BatGrid({ bats, noun }: { bats: StoreBat[]; noun: string }) {
  if (!bats.length) {
    return (
      <div className="site-shell py-16 md:pt-20">
        <EmptyShelf title={`No ${noun} yet.`} action={{ label: "Shop all bats", href: "/#collection" }} />
      </div>
    );
  }
  return <SortableGrid products={bats} plate={(bat) => <BatPlate bat={bat} />} />;
}
