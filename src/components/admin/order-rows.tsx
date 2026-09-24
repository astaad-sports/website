import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { OrderWithItems } from "@/db/orders";
import { formatOrderNumber, formatPaise, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { StatusLabel } from "./status-label";

/** "Run Machine", "Pro Batting Pads + Elite Batting Gloves", or "Run Machine + 2 more". */
export function itemsSummary(order: OrderWithItems): string {
  const names = order.items.map((item) => item.productName);
  if (names.length <= 2) return names.join(" + ");
  return `${names[0]} + ${names.length - 1} more`;
}

function orderHref(order: OrderWithItems) {
  return `/admin/orders/${order.number}`;
}

/**
 * One order as a list row. `full` (the Orders list) adds the date line;
 * `compact` (Home) keeps it to two lines.
 */
export function OrderRow({ order, variant = "full" }: { order: OrderWithItems; variant?: "full" | "compact" }) {
  const date = formatShortDate(order.paidAt ?? order.createdAt);
  return (
    <li className="border-b border-border">
      <Link
        href={orderHref(order)}
        className="flex min-h-16 flex-col justify-center gap-0.5 py-3 transition-colors hover:bg-surface-sunken/60"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="text-[15px] leading-[22px] font-semibold tabular-nums">#{formatOrderNumber(order.number)}</span>
          <span className="text-[15px] leading-[22px] font-semibold whitespace-nowrap tabular-nums">
            {formatPaise(order.totalPaise)}
          </span>
        </span>
        {variant === "full" ? (
          <>
            <span className="truncate text-[13px] leading-[18px] text-ink-muted">
              {order.shipName} · {itemsSummary(order)}
            </span>
            <span className="mt-0.5 flex items-center justify-between gap-3">
              <span className="text-[13px] leading-[18px] text-ink-muted tabular-nums">{date}</span>
              <StatusLabel status={order.status} />
            </span>
          </>
        ) : (
          <span className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-[13px] leading-[18px] text-ink-muted">
              {order.shipName} · {itemsSummary(order)}
            </span>
            <StatusLabel status={order.status} className="shrink-0" />
          </span>
        )}
      </Link>
    </li>
  );
}

const TH = "h-10 bg-surface-sunken px-3 text-left text-xs leading-4 font-semibold tracking-[0.08em] text-ink-muted uppercase";
const TD = "h-14 border-b border-border px-3 text-sm leading-5";

/** The Orders list as a plain table on desktop. */
export function OrdersTable({ orders, className }: { orders: OrderWithItems[]; className?: string }) {
  return (
    <table className={cn("w-full border-collapse", className)}>
      <thead>
        <tr>
          <th scope="col" className={cn(TH, "w-36")}>
            Order
          </th>
          <th scope="col" className={cn(TH, "w-28")}>
            Date
          </th>
          <th scope="col" className={cn(TH, "w-52")}>
            Customer
          </th>
          <th scope="col" className={TH}>
            Product
          </th>
          <th scope="col" className={cn(TH, "w-32 text-right")}>
            Amount
          </th>
          <th scope="col" className={cn(TH, "w-36 pl-8")}>
            Status
          </th>
          <th scope="col" className={cn(TH, "w-14")}>
            <span className="sr-only">Open</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id} className="transition-colors hover:bg-surface-sunken/60">
            <td className={TD}>
              <Link href={orderHref(order)} className="inline-flex min-h-11 items-center font-semibold tabular-nums">
                #{formatOrderNumber(order.number)}
              </Link>
            </td>
            <td className={cn(TD, "text-ink-muted tabular-nums")}>{formatShortDate(order.paidAt ?? order.createdAt)}</td>
            <td className={cn(TD, "max-w-52 truncate")}>{order.shipName}</td>
            <td className={cn(TD, "max-w-0 truncate")}>{itemsSummary(order)}</td>
            <td className={cn(TD, "text-right font-semibold whitespace-nowrap tabular-nums")}>{formatPaise(order.totalPaise)}</td>
            <td className={cn(TD, "pl-8")}>
              <StatusLabel status={order.status} />
            </td>
            <td className={cn(TD, "pr-0")}>
              <Link
                href={orderHref(order)}
                aria-label={`Open order #${formatOrderNumber(order.number)}`}
                className="flex size-11 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken"
              >
                <ChevronRight className="size-5" strokeWidth={1.5} aria-hidden="true" />
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
