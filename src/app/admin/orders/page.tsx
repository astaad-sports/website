import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Eyebrow } from "@/components/storefront/eyebrow";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { countOrdersByStatus, listOrdersForAdmin, type AdminOrderFilter, type OrderWithItems } from "@/db/orders";
import type { OrderStatus } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { formatOrderDate, formatOrderNumber, formatPaise } from "@/lib/format";
import { ORDER_STATUS_LABEL, orderStatusTone } from "@/lib/orders/status";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Orders · Store admin",
  robots: { index: false },
};

const TABS: { filter: AdminOrderFilter; label: string; statuses: OrderStatus[] }[] = [
  { filter: "to_ship", label: "To ship", statuses: ["paid"] },
  { filter: "shipped", label: "Shipped", statuses: ["shipped"] },
  { filter: "delivered", label: "Delivered", statuses: ["delivered"] },
  { filter: "all", label: "All", statuses: ["paid", "shipped", "delivered", "cancelled"] },
];

const EMPTY: Record<AdminOrderFilter, string> = {
  to_ship: "Nothing to ship. Paid orders appear here until they have an AWB.",
  shipped: "No orders in transit.",
  delivered: "No delivered orders yet.",
  all: "No paid orders yet.",
};

function itemCount(order: OrderWithItems): string {
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return `${units} ${units === 1 ? "item" : "items"}`;
}

/** Fulfilment: paid orders to pack and book with Trackon, then those in transit and delivered. */
export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin("/admin/orders");
  const { status } = await searchParams;
  const tab = TABS.find((entry) => entry.filter === status) ?? TABS[0];
  const [orders, counts] = await Promise.all([listOrdersForAdmin(tab.filter), countOrdersByStatus()]);

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-surface-sunken">
        <div className="site-shell flex flex-col gap-8 py-12 md:py-16">
          <div className="flex flex-col gap-3">
            <Eyebrow bar>Store admin</Eyebrow>
            <h1 className="type-heading-xl">Orders</h1>
          </div>

          <nav aria-label="Order status" className="flex flex-wrap gap-2">
            {TABS.map((entry) => {
              const total = entry.statuses.reduce((sum, value) => sum + (counts[value] ?? 0), 0);
              const active = entry.filter === tab.filter;
              return (
                <Link
                  key={entry.filter}
                  href={entry.filter === "to_ship" ? "/admin/orders" : `/admin/orders?status=${entry.filter}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 type-label transition-colors",
                    active
                      ? "border-surface-dark bg-surface-dark text-on-dark"
                      : "border-border bg-surface-raised hover:border-border-strong"
                  )}
                >
                  {entry.label}
                  <span className={cn("tabular-nums", active ? "text-on-dark-muted" : "text-ink-muted")}>{total}</span>
                </Link>
              );
            })}
          </nav>

          <section
            aria-label={`${tab.label} orders`}
            className="flex flex-col rounded-md border border-border bg-surface-raised shadow-card"
          >
            {orders.length === 0 ? (
              <p className="px-6 py-8 type-body text-ink-muted">{EMPTY[tab.filter]}</p>
            ) : (
              <ul className="flex flex-col">
                {orders.map((order) => (
                  <li key={order.id} className="border-b border-border last:border-b-0">
                    <Link
                      href={`/admin/orders/${order.number}`}
                      className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 px-6 py-4 transition-colors hover:bg-surface-sunken md:grid-cols-[7rem_6.5rem_minmax(0,1fr)_5rem_6rem_9rem_auto]"
                    >
                      <span className="font-semibold">{formatOrderNumber(order.number)}</span>
                      <span className="type-body-sm text-ink-muted">
                        {formatOrderDate(order.paidAt ?? order.createdAt)}
                      </span>
                      <span className="col-span-2 flex min-w-0 flex-col md:col-span-1">
                        <span className="truncate text-sm leading-5 font-semibold">{order.shipName}</span>
                        <span className="truncate type-body-sm text-ink-muted">
                          {order.shipCity}, {order.shipState} {order.shipPincode}
                        </span>
                      </span>
                      <span className="type-body-sm text-ink-muted">{itemCount(order)}</span>
                      <span className="font-semibold tabular-nums md:text-right">{formatPaise(order.totalPaise)}</span>
                      <span className="flex flex-col md:items-start">
                        <span className={cn("type-body-sm font-semibold", orderStatusTone(order.status))}>
                          {ORDER_STATUS_LABEL[order.status]}
                        </span>
                        {order.trackingNumber && (
                          <span className="type-body-sm text-ink-muted tabular-nums">AWB {order.trackingNumber}</span>
                        )}
                      </span>
                      <ChevronRight className="hidden size-5 text-ink-muted md:block" strokeWidth={1.5} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
