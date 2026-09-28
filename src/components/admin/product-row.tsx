// A product as the admin lists it: the small shape handed to client
// components, the filters the lists share, and the pieces every product row
// draws (photo, price, stock count). No hooks, so server pages use it too.
import Image from "next/image";
import Link from "next/link";
import { CircleAlert } from "lucide-react";

import type { Product, ProductAvailability, VariantStock } from "@/db/schema";
import { BAT_IMAGE, STORE_CATEGORIES } from "@/lib/catalogue";
import { formatPaise } from "@/lib/format";
import {
  CATEGORY_SLUGS,
  categoryName,
  percentOff,
  stockStatus,
  subcategoryName,
  type CategorySlug,
  type ProductWithImages,
  type StockStatus,
} from "@/lib/products/model";
import { countedStock, hasVariantOut, productVariants, variantCounts } from "@/lib/products/variants";
import { cn } from "@/lib/utils";

import { StockLabel } from "./stock-label";

/** What a product row needs, small enough to hand to a client component. */
export interface ProductListItem {
  id: string;
  slug: string;
  name: string;
  /** Grade for bats; the note (or range) for gear. */
  detail: string;
  sku: string | null;
  /** The primary photo, or the category's cut-out. */
  image: string;
  pricePaise: number;
  mrpPaise: number | null;
  /** The total in stock, across its sizes and hands. Null until the admin counts it. */
  stock: number | null;
  /** Each size and hand it is sold in, named for a stock count: "Large", "Left hand". One entry for a product sold one way. */
  variants: { key: string; label: string }[];
  /** The count of each variant, by key. Null until the admin counts it. */
  counts: VariantStock | null;
  lowStockThreshold: number;
  availability: ProductAvailability;
}

/** The cut-out a product without photos shows, as on the store. */
function defaultImage(category: string): string {
  if (category === "bats") return BAT_IMAGE;
  return STORE_CATEGORIES.find((entry) => entry.slug === category)?.image ?? BAT_IMAGE;
}

function productDetail(product: Product): string {
  if (product.kind === "bat") return product.grade ?? subcategoryName(product.subcategory) ?? categoryName(product.category);
  return product.note ?? (product.line ? `${product.line} range` : categoryName(product.category));
}

export function toProductListItem(product: ProductWithImages): ProductListItem {
  const [primary] = [...product.images].sort((a, b) => a.position - b.position);
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    detail: productDetail(product),
    sku: product.sku,
    image: primary?.url ?? defaultImage(product.category),
    pricePaise: product.pricePaise,
    mrpPaise: product.mrpPaise,
    stock: countedStock(product),
    variants: productVariants(product).map(({ key, label }) => ({ key, label })),
    counts: variantCounts(product),
    lowStockThreshold: product.lowStockThreshold,
    availability: product.availability,
  };
}

/** A product sold in several sizes or hands, each with its own count. */
export function hasVariants(item: Pick<ProductListItem, "variants">): boolean {
  return item.variants.length > 1;
}

type StockItem = Pick<ProductListItem, "availability" | "stock" | "lowStockThreshold" | "variants" | "counts">;

/** The sizes and hands with none left, for a counted product that still has some: "Large, XL". */
export function variantsOut(item: Pick<ProductListItem, "variants" | "counts">): string | null {
  if (!hasVariantOut(item.counts)) return null;
  return item.variants
    .filter((variant) => (item.counts?.[variant.key] ?? 0) <= 0)
    .map((variant) => variant.label)
    .join(", ");
}

/**
 * The status the admin shows for a product: the store's, except that one
 * with a size or hand that ran out reads Low stock while the rest is on
 * sale, so it turns up wherever restocking is looked for.
 */
export function listStatus(item: StockItem): StockStatus {
  const status = stockStatus(item);
  return status === "in" && hasVariantOut(item.counts) ? "low" : status;
}

/** Store order: categories as the store lists them, then the admin's order within each. */
export function byStoreOrder(a: Product, b: Product): number {
  return (
    CATEGORY_SLUGS.indexOf(a.category as CategorySlug) - CATEGORY_SLUGS.indexOf(b.category as CategorySlug) ||
    a.sortOrder - b.sortOrder ||
    a.name.localeCompare(b.name)
  );
}

/** Case-insensitive match on name, SKU, grade or range, for the product list and Search. */
export function matchesProductSearch(product: Product, query: string): boolean {
  const needle = query.toLowerCase();
  return [product.name, product.sku, product.grade, product.line].some((value) => value?.toLowerCase().includes(needle));
}

/** The stock filters Home links to: /admin/products?stock=low. */
export const STOCK_FILTERS = { low: "Low stock", out: "Out of stock", unset: "Stock not set" } as const;

export type StockFilter = keyof typeof STOCK_FILTERS;

export function isStockFilter(value: unknown): value is StockFilter {
  return typeof value === "string" && Object.hasOwn(STOCK_FILTERS, value);
}

/**
 * Low and out follow the store's status (hidden products are neither); unset
 * means never counted. A product with a size or hand that ran out counts as
 * low while other sizes are on sale, so it shows where restocking is looked for.
 */
export function matchesStockFilter(
  product: Pick<Product, "availability" | "stock" | "lowStockThreshold" | "category" | "subcategory" | "sizes" | "hands" | "variantStock">,
  filter: StockFilter
): boolean {
  if (filter === "unset") return product.stock === null;
  const status = stockStatus({ ...product, stock: countedStock(product) });
  return (status === "in" && hasVariantOut(variantCounts(product)) ? "low" : status) === filter;
}

/**
 * Out of stock because the count ran out (or was never taken), so restocking
 * brings it back on sale. A product the admin marked out of stock with stock
 * left is made available from its menu instead.
 */
export function isRestockable(item: Pick<ProductListItem, "availability" | "stock" | "lowStockThreshold">): boolean {
  return stockStatus(item) === "out" && (item.stock === null || item.stock <= 0);
}

export function editorHref(item: Pick<ProductListItem, "slug">): string {
  return `/admin/products/${item.slug}`;
}

/** The row menu's trigger, so focus can go back to it after a sheet or panel closes. */
export function menuTriggerId(itemId: string, place: "list" | "table"): string {
  return `product-actions-${place}-${itemId}`;
}

/** The 48px photo tile at the start of a row. */
export function ProductThumb({ src }: { src: string }) {
  return (
    <span className="relative size-12 shrink-0 overflow-hidden rounded-sm bg-surface-sunken">
      <Image src={src} alt="" fill sizes="48px" className="object-contain p-1" />
    </span>
  );
}

/** "₹ 4,399 ₹ 5,499 20% OFF": the MRP and the discount only when the MRP is higher. */
export function ProductPrice({
  pricePaise,
  mrpPaise,
  className,
}: Pick<ProductListItem, "pricePaise" | "mrpPaise"> & { className?: string }) {
  const onSale = mrpPaise !== null && mrpPaise > pricePaise;
  const off = onSale ? percentOff(pricePaise, mrpPaise) : 0;
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap", className)}>
      <span className="font-semibold tabular-nums">{formatPaise(pricePaise)}</span>
      {onSale && (
        <>
          <s className="text-[13px] leading-[18px] text-ink-muted tabular-nums">
            <span className="sr-only">MRP </span>
            {formatPaise(mrpPaise)}
          </s>
          {off > 0 && (
            <span className="inline-flex h-5 items-center rounded-xs bg-brand-yellow px-1.5 text-[11px] leading-5 font-bold tracking-[0.04em] text-on-yellow">
              {off}% OFF
            </span>
          )}
        </>
      )}
    </span>
  );
}

/** "Stock: 8", or "Stock not set" for a product that has never been counted. */
export function stockText(stock: number | null): string {
  return stock === null ? "Stock not set" : `Stock: ${stock}`;
}

/** "Medium 2 · Large 0 · XL 3": each size and hand's count, for a counted product sold in several. */
export function variantStockText(item: Pick<ProductListItem, "variants" | "counts">): string | null {
  if (!hasVariants(item) || item.counts === null) return null;
  return item.variants.map((variant) => `${variant.label} ${item.counts?.[variant.key] ?? 0}`).join(" · ");
}

/** The count in red at 0 and in bold when low, so the eye finds what needs restocking. */
export function stockTone(item: Pick<ProductListItem, "stock" | "lowStockThreshold">): string {
  if (item.stock === null) return "text-ink-muted";
  if (item.stock <= 0) return "font-semibold text-danger";
  if (item.stock < item.lowStockThreshold) return "font-semibold text-foreground";
  return "text-ink-muted";
}

/** A red line under whatever failed, read out as soon as it appears. */
export function ErrorLine({ id, message, className }: { id?: string; message?: string | null; className?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className={cn("flex items-start gap-1.5 text-[13px] leading-[18px] text-danger", className)}>
      <CircleAlert className="mt-px size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
      {message}
    </p>
  );
}

/** One product in Search results: photo, name, stock, status; opens the editor. */
export function ProductResultRow({ item }: { item: ProductListItem }) {
  return (
    <li className="border-b border-border">
      <Link href={editorHref(item)} className="flex min-h-16 items-center gap-3 py-2 transition-colors hover:bg-surface-sunken/60">
        <ProductThumb src={item.image} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] leading-[22px] font-semibold">{item.name}</span>
          <span className={cn("text-[13px] leading-[18px] tabular-nums", stockTone(item))}>
            {stockText(item.stock)}
            {item.sku && <span className="font-normal text-ink-muted"> · {item.sku}</span>}
          </span>
        </span>
        <StockLabel status={listStatus(item)} className="shrink-0" />
      </Link>
    </li>
  );
}
