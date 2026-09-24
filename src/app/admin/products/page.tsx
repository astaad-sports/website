import type { Metadata } from "next";
import Link from "next/link";
import { Package, Plus, Search, X } from "lucide-react";

import { ProductList } from "@/components/admin/product-list";
import {
  byStoreOrder,
  isStockFilter,
  matchesProductSearch,
  matchesStockFilter,
  STOCK_FILTERS,
  toProductListItem,
  type StockFilter,
} from "@/components/admin/product-row";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, CHIP, CHIP_OFF, CHIP_ON, PAGE, SEARCH_FIELD } from "@/components/admin/styles";
import { listProductsWithImages } from "@/db/products";
import { requireAdmin } from "@/lib/auth/session";
import { normaliseSearch } from "@/lib/orders/fulfilment";
import {
  BAT_SUBCATEGORIES,
  CATEGORY_SLUGS,
  categoryName,
  isBatSubcategory,
  isCategorySlug,
  subcategoryName,
  type BatSubcategory,
  type CategorySlug,
} from "@/lib/products/model";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Products" };

interface ListView {
  query: string | null;
  category: CategorySlug | null;
  sub: BatSubcategory | null;
  stock: StockFilter | null;
}

function listHref(view: ListView): string {
  const params = new URLSearchParams();
  if (view.query) params.set("q", view.query);
  if (view.category) params.set("category", view.category);
  if (view.category === "bats" && view.sub) params.set("sub", view.sub);
  if (view.stock) params.set("stock", view.stock);
  const search = params.toString();
  return search ? `/admin/products?${search}` : "/admin/products";
}

interface EmptyStateProps {
  title: string;
  detail: string;
  action: { href: string; label: string };
}

function EmptyState({ title, detail, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center lg:py-16">
      <Package className="size-10 text-ink-subtle" strokeWidth={1.5} aria-hidden="true" />
      <p className="text-base leading-[22px] font-semibold break-words">{title}</p>
      <p className="text-[13px] leading-[18px] text-ink-muted">{detail}</p>
      <Link href={action.href} className={cn(BUTTON_SECONDARY, "mt-2")}>
        {action.label}
      </Link>
    </div>
  );
}

/** How an empty, filtered category reads: "Nothing in Helmets is out of stock". */
const STOCK_PHRASE: Record<Exclude<StockFilter, "unset">, string> = { out: "out of stock", low: "low on stock" };

const SCROLL_ROW = "-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden";

/** Search, category chips (and bat types under Bats), and the stock filter Home links to, as a removable chip. */
function Filters({
  view,
  categoryChips,
  batCounts,
}: {
  view: ListView;
  categoryChips: { slug: CategorySlug | null; label: string; count: number }[];
  batCounts: Record<BatSubcategory, number>;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
        <form action="/admin/products" role="search" className="lg:w-80 lg:shrink-0">
          {view.category && <input type="hidden" name="category" value={view.category} />}
          {view.sub && <input type="hidden" name="sub" value={view.sub} />}
          {view.stock && <input type="hidden" name="stock" value={view.stock} />}
          <label className="relative block">
            <span className="sr-only">Search products by name, SKU, grade or range</span>
            <Search className="pointer-events-none absolute top-3 left-3 size-5 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
            <input type="search" name="q" defaultValue={view.query ?? ""} placeholder="Search products…" className={SEARCH_FIELD} />
          </label>
        </form>

        <nav aria-label="Filter by category" className={SCROLL_ROW}>
          {categoryChips.map((chip) => {
            const on = chip.slug === view.category;
            return (
              <Link
                key={chip.label}
                href={listHref({ ...view, category: chip.slug, sub: null })}
                aria-current={on ? "page" : undefined}
                className={cn(CHIP, "px-4", on ? CHIP_ON : CHIP_OFF)}
              >
                {chip.label}
                <span className={cn("font-medium tabular-nums", on ? "text-on-yellow" : "text-ink-muted")}>{chip.count}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {view.category === "bats" && (
        <nav aria-label="Filter by bat type" className={cn(SCROLL_ROW, "lg:pl-84")}>
          {BAT_SUBCATEGORIES.map((entry) => {
            const on = entry.slug === view.sub;
            return (
              <Link
                key={entry.slug}
                href={listHref({ ...view, sub: on ? null : entry.slug })}
                aria-current={on ? "page" : undefined}
                className={cn(
                  CHIP,
                  "border text-[13px] leading-[18px]",
                  on ? "border-brand-yellow bg-brand-yellow text-on-yellow" : "border-border bg-surface-raised hover:bg-surface-sunken"
                )}
              >
                {entry.name}
                <span className="font-medium text-ink-muted tabular-nums">{batCounts[entry.slug]}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {view.stock && (
        <div className="flex">
          <Link
            href={listHref({ ...view, stock: null })}
            aria-label={`Remove filter: ${STOCK_FILTERS[view.stock]}`}
            className={cn(CHIP, CHIP_ON, "pr-3")}
          >
            {STOCK_FILTERS[view.stock]}
            <X className="size-4" strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * Every product, hidden ones included: search, filter by category (and bat
 * type), or by stock when Home links here. Rows open the editor; out-of-stock
 * rows can be restocked on the spot.
 */
export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  const params = await searchParams;
  const category = isCategorySlug(params.category) ? params.category : null;
  const view: ListView = {
    query: normaliseSearch(params.q),
    category,
    sub: category === "bats" && isBatSubcategory(params.sub) ? params.sub : null,
    stock: isStockFilter(params.stock) ? params.stock : null,
  };
  await requireAdmin(listHref(view));

  const all = (await listProductsWithImages()).sort(byStoreOrder);
  // Search and the stock filter narrow everything; the chips count within that.
  const matching = all.filter(
    (product) =>
      (!view.query || matchesProductSearch(product, view.query)) && (!view.stock || matchesStockFilter(product, view.stock))
  );
  const inCategory = matching.filter((product) => !view.category || product.category === view.category);
  const rows = inCategory.filter((product) => !view.sub || product.subcategory === view.sub).map(toProductListItem);

  const categoryChips = [
    { slug: null, label: "All", count: matching.length },
    ...CATEGORY_SLUGS.map((slug) => ({
      slug,
      label: categoryName(slug),
      count: matching.filter((product) => product.category === slug).length,
    })),
  ];

  const batCounts = Object.fromEntries(
    BAT_SUBCATEGORIES.map((entry) => [entry.slug, inCategory.filter((product) => product.subcategory === entry.slug).length])
  ) as Record<BatSubcategory, number>;

  let empty: EmptyStateProps | null = null;
  if (rows.length === 0) {
    const addProduct = { href: "/admin/products/new", label: "Add product" };
    const showAll = { href: "/admin/products", label: "Show all products" };
    if (view.query) {
      empty = {
        title: `No products match “${view.query}”.`,
        detail: "Search by name, SKU, grade or range.",
        action: { href: listHref({ ...view, query: null }), label: "Clear search" },
      };
    } else if (view.stock && matching.length > 0) {
      // Some are, just not in the chosen category.
      const scope = (view.sub && subcategoryName(view.sub)) || categoryName(view.category ?? "");
      empty = {
        title:
          view.stock === "unset"
            ? `Everything in ${scope} has a stock count`
            : `Nothing in ${scope} is ${STOCK_PHRASE[view.stock]}`,
        detail: `${matching.length} in other categories.`,
        action: { href: listHref({ ...view, category: null, sub: null }), label: "Show all categories" },
      };
    } else if (view.stock === "out") {
      empty = { title: "No products are out of stock", detail: "Everything can be bought right now.", action: showAll };
    } else if (view.stock === "low") {
      empty = { title: "No products are low on stock", detail: "Products show up here when only a few are left.", action: showAll };
    } else if (view.stock === "unset") {
      empty = { title: "Every product has a stock count", detail: "New products show up here until you count them.", action: showAll };
    } else if (view.sub) {
      empty = { title: `No ${subcategoryName(view.sub)} products yet`, detail: "Add one and it shows up here.", action: addProduct };
    } else if (view.category) {
      empty = { title: `No ${categoryName(view.category)} yet`, detail: "Add one and it shows up here.", action: addProduct };
    } else {
      empty = { title: "No products yet", detail: "Add your first product and it shows up here.", action: addProduct };
    }
  }

  return (
    <main className={PAGE}>
      <header className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="type-heading-lg">Products</h1>
          <p className="hidden text-[13px] leading-[18px] text-ink-muted tabular-nums lg:block">
            {all.length} {all.length === 1 ? "product" : "products"}
          </p>
        </div>
        <Link href="/admin/products/new" className={BUTTON_PRIMARY}>
          <Plus strokeWidth={2} aria-hidden="true" />
          Add product
        </Link>
      </header>

      <div className="flex flex-col gap-4">
        <Filters view={view} categoryChips={categoryChips} batCounts={batCounts} />
        <ProductList items={rows} label="Products" empty={empty && <EmptyState {...empty} />} />
      </div>
    </main>
  );
}
