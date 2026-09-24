import type { Metadata } from "next";
import Link from "next/link";
import { Search, ShoppingBag } from "lucide-react";

import { OrderRow, OrdersTable } from "@/components/admin/order-rows";
import { BUTTON_SECONDARY, CHIP, CHIP_OFF, CHIP_ON, PAGE, SEARCH_FIELD } from "@/components/admin/styles";
import { countOrdersByStatus, listOrdersForAdmin } from "@/db/orders";
import { requireAdmin } from "@/lib/auth/session";
import { normaliseSearch, ORDER_FILTERS, parseOrderFilter, type OrderFilter } from "@/lib/orders/fulfilment";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

function listHref(filter: OrderFilter, query: string | null): string {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("status", filter);
  if (query) params.set("q", query);
  const search = params.toString();
  return search ? `/admin/orders?${search}` : "/admin/orders";
}

/** Every paid order: search, filter by where it is, and open one to update it. */
export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const params = await searchParams;
  const filter = parseOrderFilter(params.status);
  const query = normaliseSearch(params.q);
  await requireAdmin(listHref(filter, query));
  const [orders, counts, allCounts] = await Promise.all([
    listOrdersForAdmin({ filter, query }),
    countOrdersByStatus(query),
    query ? countOrdersByStatus() : null,
  ]);

  const countFor = (statuses: readonly string[], from = counts) =>
    statuses.reduce((sum, status) => sum + (from[status as keyof typeof from] ?? 0), 0);
  const total = countFor(ORDER_FILTERS[0].statuses);
  const active = ORDER_FILTERS.find((entry) => entry.id === filter)!;

  let empty: { title: string; detail: string } | null = null;
  if (orders.length === 0) {
    if (query) empty = { title: `No orders match “${query}”`, detail: "Search by order ID, customer, phone, product or tracking ID." };
    else if ((allCounts ? countFor(ORDER_FILTERS[0].statuses, allCounts) : total) === 0)
      empty = { title: "No orders yet", detail: "New orders show up here as soon as they are paid." };
    else empty = { title: `No ${active.label.toLowerCase()} orders`, detail: "Orders show up here when their status changes." };
  }

  return (
    <main className={PAGE}>
      <header className="flex flex-col gap-1">
        <h1 className="type-heading-lg">Orders</h1>
        <p className="hidden text-[13px] leading-[18px] text-ink-muted tabular-nums lg:block">
          {total} {total === 1 ? "order" : "orders"}
          {query && ` matching “${query}”`}
        </p>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
        <form action="/admin/orders" role="search" className="lg:w-80 lg:shrink-0">
          {filter !== "all" && <input type="hidden" name="status" value={filter} />}
          <label className="relative block">
            <span className="sr-only">Search orders by order ID, customer, phone, product or tracking ID</span>
            <Search
              className="pointer-events-none absolute top-3 left-3 size-5 text-ink-muted"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <input type="search" name="q" defaultValue={query ?? ""} placeholder="Search order…" className={SEARCH_FIELD} />
          </label>
        </form>

        <nav aria-label="Filter by status" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
          {ORDER_FILTERS.map((entry) => {
            const on = entry.id === filter;
            return (
              <Link
                key={entry.id}
                href={listHref(entry.id, query)}
                aria-current={on ? "page" : undefined}
                className={cn(CHIP, on ? CHIP_ON : CHIP_OFF)}
              >
                {entry.label}
                <span className={cn("font-medium tabular-nums", on ? "text-on-yellow" : "text-ink-muted")}>
                  {countFor(entry.statuses)}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {empty ? (
        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
          <ShoppingBag className="size-10 text-ink-subtle" strokeWidth={1.5} aria-hidden="true" />
          <p className="text-base leading-[22px] font-semibold">{empty.title}</p>
          <p className="text-[13px] leading-[18px] text-ink-muted">{empty.detail}</p>
          {query && (
            <Link href={listHref(filter, null)} className={cn(BUTTON_SECONDARY, "mt-2")}>
              Clear search
            </Link>
          )}
        </div>
      ) : (
        <>
          <ul aria-label={`${active.label} orders`} className="flex flex-col border-t border-border lg:hidden">
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </ul>
          <OrdersTable orders={orders} className="hidden lg:table" />
        </>
      )}
    </main>
  );
}
