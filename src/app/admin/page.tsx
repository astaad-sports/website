import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgePercent,
  CircleAlert,
  CircleCheck,
  Layers,
  MessageSquareQuote,
  Plus,
  Truck,
  type LucideIcon,
} from "lucide-react";

import { HomeAttention, type StockAttention } from "@/components/admin/home-attention";
import { offerHref } from "@/components/admin/offer-rows";
import { OrderRow } from "@/components/admin/order-rows";
import { byStoreOrder, matchesStockFilter, toProductListItem } from "@/components/admin/product-row";
import { BUTTON_SECONDARY, PAGE, SECTION_LABEL } from "@/components/admin/styles";
import { listActiveOffers } from "@/db/offers";
import { listOrdersForAdmin, listStaleShipments } from "@/db/orders";
import { listProductsWithImages } from "@/db/products";
import { countNewReviews } from "@/db/reviews";
import type { Order } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { formatOrderNumber } from "@/lib/format";
import { daysLeft, offerNote } from "@/lib/offers/model";
import { cn } from "@/lib/utils";

// The layout's title template only reaches child segments, so this page spells out its own.
export const metadata: Metadata = { title: { absolute: "Dashboard · Astaad admin" } };

/** Shipped this many days ago without a delivery means it is worth checking on. */
const STALE_SHIPMENT_DAYS = 7;

/** Home names at most this many products; the rest are one row pointing to Inventory. */
const STOCK_ROWS = 3;

/** An offer this close to its last day is worth a look: extend it, or let it go. */
const OFFER_ENDING_DAYS = 3;

const ATTENTION_HEADING = "attention-title";

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
  icon: LucideIcon;
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const Icon = item.icon;
  return (
    <li className="border-b border-border">
      <Link href={item.href} className="flex min-h-16 items-center gap-3 py-2.5 transition-colors hover:bg-surface-sunken/60">
        <Icon className="size-5 shrink-0 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
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

function SummaryCell({
  href,
  count,
  label,
  dot,
  first,
}: {
  href: string;
  count: number;
  label: string;
  /** The colour the labels use: yellow for low stock and running offers, red for out of stock. */
  dot?: string;
  first?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-16 min-w-0 flex-col justify-center gap-0.5 py-2 pr-1.5 transition-colors hover:bg-surface-sunken/60 lg:pr-2",
        !first && "border-l border-border pl-2.5 lg:pl-4"
      )}
    >
      <span className="text-xl leading-[26px] font-bold tabular-nums">{count}</span>
      <span className="flex items-start gap-1.5 text-xs leading-4 text-ink-muted">
        {dot && <span aria-hidden="true" className={cn("mt-[5px] size-1.5 shrink-0 rounded-full", dot)} />}
        {label}
      </span>
    </Link>
  );
}

const QUICK_ACTIONS = [
  { href: "/admin/products/new", label: "Add product", icon: Plus },
  { href: "/admin/offers/new", label: "Create offer", icon: BadgePercent },
  { href: "/admin/inventory", label: "Update stock", icon: Layers },
];

const QUICK_TILE =
  "flex min-h-14 items-center gap-2.5 rounded-sm bg-surface-sunken px-3.5 text-sm leading-5 font-semibold transition-colors hover:bg-border";

/** Add product, Create offer and Update stock: tiles at the foot of the page on phones, buttons beside the greeting on desktop. */
function QuickActions({ className, tiles }: { className?: string; tiles?: boolean }) {
  return (
    <nav aria-label="Quick actions" className={className}>
      {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={tiles ? QUICK_TILE : BUTTON_SECONDARY}>
          <Icon className={tiles ? "size-5 shrink-0" : undefined} strokeWidth={1.5} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Home: what needs the admin now (orders to ship, products running out,
 * reviews to check, offers about to end), then the latest orders. Not a report.
 */
export default async function AdminHomePage() {
  await requireAdmin("/admin");
  const [unshipped, stale, recent, products, offers, newReviews] = await Promise.all([
    listOrdersForAdmin({ filter: "pending" }),
    listStaleShipments(STALE_SHIPMENT_DAYS),
    listOrdersForAdmin({ limit: 5 }),
    listProductsWithImages(),
    listActiveOffers(),
    countNewReviews(),
  ]);
  const now = new Date();
  const toShip = unshipped.length;

  products.sort(byStoreOrder);
  const out = products.filter((product) => matchesStockFilter(product, "out"));
  const low = products.filter((product) => matchesStockFilter(product, "low")).sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
  const unset = products.filter((product) => matchesStockFilter(product, "unset")).length;

  // Out of stock before low; a few by name, the rest as one row.
  const flagged: StockAttention[] = [
    ...out.map((product) => ({ item: toProductListItem(product), kind: "out" as const })),
    ...low.map((product) => ({ item: toProductListItem(product), kind: "low" as const })),
  ];
  const stockRows = flagged.slice(0, STOCK_ROWS);
  const moreStock = flagged.length - stockRows.length;

  const orderRows = (orders: Order[], detail: (order: Order) => string): AttentionItem[] =>
    orders.map((order) => ({
      key: order.id,
      href: `/admin/orders/${order.number}`,
      title: `#${formatOrderNumber(order.number)}`,
      detail: detail(order),
      action: "Update",
      icon: Truck,
    }));
  const first = orderRows(unshipped, (order) => `${order.trackingNumber ? "Ready to ship" : "Needs tracking ID"} · ${order.shipName}`).map(
    (row, index) => {
      // Paid for more than was in stock: the owner restocks or refunds before anything else.
      const short = unshipped[index].stockShortfall;
      if (!short?.length) return row;
      return { ...row, detail: `Paid while out of stock: ${short.map((line) => line.name).join(", ")}`, action: "Check", icon: CircleAlert };
    }
  );
  const later: AttentionItem[] = [];
  if (moreStock > 0) {
    later.push({
      key: "more-stock",
      href: "/admin/inventory",
      title: `${moreStock} more ${moreStock === 1 ? "product needs" : "products need"} stock`,
      detail: "Low or out of stock",
      action: "Update stock",
      icon: Layers,
    });
  }
  later.push(...orderRows(stale, (order) => `Shipped ${daysSince(order.shippedAt, now)} days ago · check it arrived`));
  if (newReviews > 0) {
    later.push({
      key: "new-reviews",
      href: "/admin/reviews?tab=new",
      title: `${newReviews} new ${newReviews === 1 ? "review" : "reviews"}`,
      detail: "Sent by customers · publish or hide",
      action: "Check",
      icon: MessageSquareQuote,
    });
  }
  if (unset > 0) {
    later.push({
      key: "stock-not-set",
      href: "/admin/inventory",
      title: `Stock not set for ${unset} ${unset === 1 ? "product" : "products"}`,
      detail: "Count them to see what is running low",
      action: "Set counts",
      icon: Layers,
    });
  }
  // listActiveOffers puts the soonest to end first.
  for (const offer of offers.filter((entry) => daysLeft(entry, now) <= OFFER_ENDING_DAYS)) {
    later.push({
      key: offer.id,
      href: offerHref(offer),
      title: offer.name,
      detail: offerNote(offer, now),
      action: "View offer",
      icon: BadgePercent,
    });
  }
  const attentionCount = first.length + stockRows.length + later.length;

  return (
    <main className={PAGE}>
      <header className="flex items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="type-heading-lg">{greeting(now)}</h1>
          <p className="text-[13px] leading-[18px] text-ink-muted">{todayInIndia.format(now)}</p>
        </div>
        <QuickActions className="hidden items-center gap-2 lg:flex" />
      </header>

      <nav aria-label="Store summary" className="grid max-w-190 grid-cols-4 border-y border-border">
        <SummaryCell first href="/admin/orders?status=pending" count={toShip} label="To ship" />
        <SummaryCell href="/admin/products?stock=low" count={low.length} label="Low stock" dot="bg-brand-yellow-hover" />
        <SummaryCell href="/admin/products?stock=out" count={out.length} label="Out of stock" dot="bg-danger" />
        <SummaryCell
          href="/admin/offers"
          count={offers.length}
          label={offers.length === 1 ? "Active offer" : "Active offers"}
          dot="bg-brand-yellow ring-1 ring-brand-yellow-hover"
        />
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-10">
        <section aria-labelledby={ATTENTION_HEADING} className="flex flex-col">
          <div className="flex min-h-11 items-center justify-between">
            <h2 id={ATTENTION_HEADING} tabIndex={-1} className={cn(SECTION_LABEL, "focus:outline-none")}>
              Needs attention
            </h2>
            {attentionCount > 0 && (
              <span className="text-xs leading-4 font-semibold text-ink-muted tabular-nums">{attentionCount}</span>
            )}
          </div>
          <HomeAttention
            count={attentionCount}
            headingId={ATTENTION_HEADING}
            before={first.map((item) => (
              <AttentionRow key={item.key} item={item} />
            ))}
            stock={stockRows}
            after={later.map((item) => (
              <AttentionRow key={item.key} item={item} />
            ))}
            empty={
              <div className="flex items-center gap-3 border-y border-border py-5">
                <CircleCheck className="size-6 shrink-0 text-success" strokeWidth={1.5} aria-hidden="true" />
                <div className="flex flex-col">
                  <p className="text-[15px] leading-[22px] font-semibold">All caught up</p>
                  <p className="text-[13px] leading-[18px] text-ink-muted">New orders show up here as soon as they are paid.</p>
                </div>
              </div>
            }
          />
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

      <section aria-labelledby="quick-title" className="flex flex-col lg:hidden">
        <h2 id="quick-title" className={cn(SECTION_LABEL, "flex min-h-11 items-center")}>
          Quick actions
        </h2>
        <QuickActions tiles className="grid grid-cols-2 gap-2 [&>:last-child:nth-child(odd)]:col-span-2" />
      </section>
    </main>
  );
}
