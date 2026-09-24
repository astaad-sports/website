import type { Metadata } from "next";
import Link from "next/link";
import { Layers } from "lucide-react";

import { InventoryList } from "@/components/admin/inventory-list";
import { matchesStockFilter, toProductListItem } from "@/components/admin/product-row";
import { BUTTON_SECONDARY, PAGE } from "@/components/admin/styles";
import { listProductsWithImages } from "@/db/products";
import type { Product } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Inventory" };

/** Out of stock first, then low, then never counted, then everything else. */
function attentionRank(product: Product): number {
  if (matchesStockFilter(product, "out")) return 0;
  if (matchesStockFilter(product, "low")) return 1;
  if (matchesStockFilter(product, "unset")) return 2;
  return 3;
}

/** Stock counts for every product, hidden ones included, on one page. */
export default async function AdminInventoryPage() {
  await requireAdmin("/admin/inventory");
  const products = (await listProductsWithImages()).sort(
    (a, b) => attentionRank(a) - attentionRank(b) || a.name.localeCompare(b.name)
  );
  const count = (rank: number) => products.filter((product) => attentionRank(product) === rank).length;
  const [out, low, unset] = [count(0), count(1), count(2)];

  return (
    <main className={PAGE}>
      <header className="flex flex-col gap-1">
        <h1 className="type-heading-lg">Inventory</h1>
        <p className="text-[13px] leading-[18px] text-ink-muted tabular-nums">
          {low} low stock · {out} out of stock
          {unset > 0 && ` · ${unset} not counted`}
        </p>
      </header>

      <InventoryList
        items={products.map(toProductListItem)}
        empty={
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center lg:py-16">
            <Layers className="size-10 text-ink-subtle" strokeWidth={1.5} aria-hidden="true" />
            <p className="text-base leading-[22px] font-semibold">No products yet</p>
            <p className="text-[13px] leading-[18px] text-ink-muted">Add a product and its stock shows up here.</p>
            <Link href="/admin/products/new" className={cn(BUTTON_SECONDARY, "mt-2")}>
              Add product
            </Link>
          </div>
        }
      />
    </main>
  );
}
