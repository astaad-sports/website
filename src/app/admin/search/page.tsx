import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Search } from "lucide-react";

import { OrderRow } from "@/components/admin/order-rows";
import { PAGE, SEARCH_FIELD, SECTION_LABEL } from "@/components/admin/styles";
import { listOrdersForAdmin } from "@/db/orders";
import { requireAdmin } from "@/lib/auth/session";
import { normaliseSearch } from "@/lib/orders/fulfilment";

export const metadata: Metadata = { title: "Search" };

/**
 * One search box for the whole admin. Today it finds orders by order ID,
 * customer name, phone or email, product, or tracking ID; products join it
 * when the product pages arrive.
 */
export default async function AdminSearchPage({ searchParams }: PageProps<"/admin/search">) {
  const query = normaliseSearch((await searchParams).q);
  await requireAdmin(query ? `/admin/search?q=${encodeURIComponent(query)}` : "/admin/search");
  const orders = query ? await listOrdersForAdmin({ query, limit: 50 }) : [];

  return (
    <main className={PAGE}>
      <div className="flex items-center gap-1">
        <Link
          href="/admin"
          aria-label="Close search"
          className="-ml-3 flex size-11 shrink-0 items-center justify-center rounded-sm lg:hidden"
        >
          <ChevronLeft className="size-6" strokeWidth={1.5} aria-hidden="true" />
        </Link>
        <h1 className="sr-only lg:not-sr-only lg:type-heading-lg">Search</h1>
        <form action="/admin/search" role="search" className="flex-1 lg:hidden">
          <label className="relative block">
            <span className="sr-only">Search orders by order ID, customer, phone, product or tracking ID</span>
            <Search className="pointer-events-none absolute top-3 left-3 size-5 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
            <input
              type="search"
              name="q"
              defaultValue={query ?? ""}
              placeholder="Search orders, products, customers…"
              autoFocus={!query}
              className={SEARCH_FIELD}
            />
          </label>
        </form>
      </div>

      <form action="/admin/search" role="search" className="hidden lg:block lg:max-w-lg">
        <label className="relative block">
          <span className="sr-only">Search orders by order ID, customer, phone, product or tracking ID</span>
          <Search className="pointer-events-none absolute top-3 left-3 size-5 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
          <input
            type="search"
            name="q"
            defaultValue={query ?? ""}
            placeholder="Search orders, products, customers…"
            className={SEARCH_FIELD}
          />
        </label>
      </form>

      {!query ? (
        <div className="flex flex-col gap-1">
          <p className="text-[15px] leading-[22px] font-semibold">Search by order ID, product or customer</p>
          <p className="text-[13px] leading-[18px] text-ink-muted">
            Try an order number like 10024, a customer’s name or phone, a product, or a tracking ID.
          </p>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
          <Search className="size-10 text-ink-subtle" strokeWidth={1.5} aria-hidden="true" />
          <p className="text-base leading-[22px] font-semibold break-all">No results for “{query}”</p>
          <p className="text-[13px] leading-[18px] text-ink-muted">
            Check the spelling, or try an order ID, product or customer name.
          </p>
        </div>
      ) : (
        <section aria-labelledby="orders-found" className="flex flex-col">
          <div className="flex min-h-11 items-center justify-between">
            <h2 id="orders-found" className={SECTION_LABEL}>
              Orders
            </h2>
            <span className="text-xs leading-4 font-semibold text-ink-muted tabular-nums">{orders.length}</span>
          </div>
          <ul className="flex flex-col border-t border-border">
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
