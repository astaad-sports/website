import { Check, ExternalLink } from "lucide-react";

import type { Order } from "@/db/schema";
import { formatOrderDate } from "@/lib/format";
import { CARRIERS, carrierName, isCarrierId, orderTimeline } from "@/lib/shipping";
import { cn } from "@/lib/utils";

import { CopyButton } from "./copy-button";

type ProgressOrder = Pick<
  Order,
  "status" | "createdAt" | "paidAt" | "packedAt" | "shippedAt" | "deliveredAt" | "carrier" | "trackingNumber"
>;

/** The carrier, the AWB with a copy button, and a link to the carrier's tracking page. */
export function TrackingDetails({ order }: { order: ProgressOrder }) {
  // A tracking ID on an order moved back before Shipped may be wrong; show it only once shipped.
  if (!order.trackingNumber || !order.shippedAt) return null;
  const carrier = isCarrierId(order.carrier) ? CARRIERS[order.carrier] : null;

  return (
    <div className="flex flex-col gap-2 rounded-sm bg-surface-sunken p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex flex-col gap-0.5">
        <span className="type-body-sm text-ink-muted">{carrierName(order.carrier)} AWB</span>
        <span className="text-lg leading-6 font-bold tracking-[0.04em] tabular-nums select-all">
          {order.trackingNumber}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-5">
        <CopyButton value={order.trackingNumber} label="Copy AWB" />
        {carrier && (
          <a
            href={carrier.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 type-body-sm font-semibold underline underline-offset-4"
          >
            Track on {carrier.name.split(" ")[0]}
            <ExternalLink className="size-4" strokeWidth={1.5} aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
      </div>
    </div>
  );
}

/** Placed, paid, packed, shipped, delivered, with dates, and the tracking details once shipped. */
export function OrderProgress({ order, className }: { order: ProgressOrder; className?: string }) {
  if (order.status === "cancelled") return null;
  const steps = orderTimeline(order);
  const current = steps.findLastIndex((step) => step.date !== null);

  return (
    <section
      aria-labelledby="order-progress"
      className={cn(
        "flex flex-col gap-5 rounded-md border border-border bg-surface-raised p-6 shadow-card",
        className
      )}
    >
      <h2 id="order-progress" className="type-heading-sm">
        Delivery progress
      </h2>
      <ol className="grid gap-4 md:grid-cols-5 md:gap-3">
        {steps.map((step, index) => {
          const done = step.date !== null;
          return (
            <li
              key={step.label}
              aria-current={index === current ? "step" : undefined}
              className="flex items-center gap-3 md:flex-col md:items-start md:gap-2"
            >
              <span className="flex w-full items-center gap-3 md:gap-2">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border-[1.5px]",
                    done ? "border-surface-dark bg-surface-dark text-on-dark" : "border-border-strong/30 text-transparent"
                  )}
                >
                  <Check className="size-4" strokeWidth={2.4} aria-hidden="true" />
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "hidden h-0.5 flex-1 md:block",
                    index === steps.length - 1 ? "md:hidden" : steps[index + 1].date ? "bg-surface-dark" : "bg-border"
                  )}
                />
              </span>
              <span className="flex flex-col">
                <span className={cn("text-sm leading-5", done ? "font-semibold" : "text-ink-muted")}>
                  {step.label}
                  <span className="sr-only">{done ? ", done" : ", not yet"}</span>
                </span>
                {step.date && <span className="type-body-sm text-ink-muted">{formatOrderDate(step.date)}</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <TrackingDetails order={order} />
    </section>
  );
}
