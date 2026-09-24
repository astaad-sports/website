import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleCheck, Truck } from "lucide-react";

import { OrderRow } from "@/components/admin/order-rows";
import { BUTTON_SECONDARY, PAGE, SECTION_LABEL } from "@/components/admin/styles";
import { countOrdersByStatus, listOrdersForAdmin, listStaleShipments } from "@/db/orders";
import type { Order } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { formatOrderNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

// The layout's title template only reaches child segments, so this page spells out its own.
export const metadata: Metadata = { title: { absolute: "Dashboard · Astaad admin" } };

/** Shipped this many days ago without a delivery means it is worth checking on. */
const STALE_SHIPMENT_DAYS = 7;

const hourInIndia = new Intl.DateTimeFormat("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Kolkata" });
const todayInIndia = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Asia/Kolkata",
});

function greeting(now: Date): string {
  const hour = Number(hourInIndia.format(now));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function daysSince(date: Date | null, now: Date): number {
  return date ? Math.floor((now.getTime() - date.getTime()) / 86_400_000) : 0;
}

interface AttentionItem {
  key: string;
  href: string;
  title: string;
  detail: string;
  action: string;
}

function AttentionRow({ item }: { item: AttentionItem }) {
  return (
    <li className="border-b border-border">
      <Link href={item.href} className="flex min-h-16 items-center gap-3 py-2.5 transition-colors hover:bg-surface-sunken/60">
        <Truck className="size-5 shrink-0 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] leading-[22px] font-semibold tabular-nums">{item.title}</span>
          <span className="truncate text-[13px] leading-[18px] text-ink-muted">{item.detail}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-sm leading-5 font-semibold">
          {item.action}
          <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
        </span>
      </Link>
    </li>
  );
}

function SummaryCell({ href, count, label, first }: { href: string; count: number; label: string; first?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-16 flex-col justify-center gap-0.5 pr-2 transition-colors hover:bg-surface-sunken/60",
        !first && "border-l border-border pl-4"
      )}
    >
      <span className="text-xl leading-[26px] font-bold tabular-nums">{count}</span>
      <span className="text-xs leading-4 text-ink-muted">{label}</span>
    </Link>
  );
}

/** Home: what needs the admin now, then the latest orders. Not a report. */
export default async function AdminHomePage() {
  await requireAdmin("/admin");
  const [unshipped, stale, recent, counts] = await Promise.all([
    listOrdersForAdmin({ filter: "pending" }),
    listStaleShipments(STALE_SHIPMENT_DAYS),
    listOrdersForAdmin({ limit: 5 }),
    countOrdersByStatus(),
  ]);
  const now = new Date();
  const toShip = unshipped.length;
  const inTransit = counts.shipped ?? 0;

  const attention: AttentionItem[] = [
    ...unshipped.map((order) => ({
      key: order.id,
      href: `/admin/orders/${order.number}`,
      title: `#${formatOrderNumber(order.number)}`,
      detail: `${order.trackingNumber ? "Ready to ship" : "Needs tracking ID"} · ${order.shipName}`,
      action: "Update",
    })),
    ...stale.map((order: Order) => ({
      key: order.id,
      href: `/admin/orders/${order.number}`,
      title: `#${formatOrderNumber(order.number)}`,
      detail: `Shipped ${daysSince(order.shippedAt, now)} days ago · check it arrived`,
      action: "Update",
    })),
  ];

  return (
    <main className={PAGE}>
      <header className="flex flex-col gap-1">
        <h1 className="type-heading-lg">{greeting(now)}</h1>
        <p className="text-[13px] leading-[18px] text-ink-muted">{todayInIndia.format(now)}</p>
      </header>

      <nav aria-label="Store summary" className="grid max-w-[380px] grid-cols-2 border-y border-border">
        <SummaryCell first href="/admin/orders?status=pending" count={toShip} label="To ship" />
        <SummaryCell href="/admin/orders?status=shipped" count={inTransit} label="In transit" />
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-10">
        <section aria-labelledby="attention-title" className="flex flex-col">
          <div className="flex min-h-11 items-center justify-between">
            <h2 id="attention-title" className={SECTION_LABEL}>
              Needs attention
            </h2>
            {attention.length > 0 && (
              <span className="text-xs leading-4 font-semibold text-ink-muted tabular-nums">{attention.length}</span>
            )}
          </div>
          {attention.length > 0 ? (
            <ul className="flex flex-col border-t border-border">
              {attention.map((item) => (
                <AttentionRow key={item.key} item={item} />
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-3 border-y border-border py-5">
              <CircleCheck className="size-6 shrink-0 text-success" strokeWidth={1.5} aria-hidden="true" />
              <div className="flex flex-col">
                <p className="text-[15px] leading-[22px] font-semibold">All caught up</p>
                <p className="text-[13px] leading-[18px] text-ink-muted">New orders show up here as soon as they are paid.</p>
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="recent-title" className="flex flex-col">
          <div className="flex min-h-11 items-center justify-between">
            <h2 id="recent-title" className={SECTION_LABEL}>
              Recent orders
            </h2>
          </div>
          {recent.length > 0 ? (
            <>
              <ul className="flex flex-col border-t border-border max-lg:[&>li:nth-child(n+4)]:hidden">
                {recent.map((order) => (
                  <OrderRow key={order.id} order={order} variant="compact" />
                ))}
              </ul>
              <Link href="/admin/orders" className={cn(BUTTON_SECONDARY, "mt-3 min-h-12")}>
                View all orders
                <ArrowRight aria-hidden="true" />
              </Link>
            </>
          ) : (
            <p className="border-y border-border py-5 text-[15px] leading-[22px] font-semibold">No orders yet</p>
          )}
        </section>
      </div>
    </main>
  );
}
