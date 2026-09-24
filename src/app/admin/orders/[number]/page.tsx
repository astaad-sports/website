import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, CircleAlert, Mail, Phone } from "lucide-react";

import { NextStepButton, StatusStepper } from "@/components/admin/fulfilment-controls";
import { StatusLabel } from "@/components/admin/status-label";
import { PAGE, SECTION_LABEL } from "@/components/admin/styles";
import { TrackingForm } from "@/components/admin/tracking-form";
import { getOrderForAdmin } from "@/db/orders";
import { primaryImagesBySlug } from "@/db/products";
import { requireAdmin } from "@/lib/auth/session";
import {
  formatMobile,
  formatOrderDate,
  formatOrderNumber,
  formatPaise,
  formatShortDate,
  mobileHref,
  parseOrderNumber,
} from "@/lib/format";
import { isFulfilmentStatus } from "@/lib/orders/fulfilment";
import { productImage } from "@/lib/orders/product-image";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/admin/orders/[number]">): Promise<Metadata> {
  const number = parseOrderNumber((await params).number);
  return { title: number ? `Order #${formatOrderNumber(number)}` : "Order" };
}

const placedAt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

function Section({ id, title, children, className }: { id: string; title: string; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={cn("flex flex-col gap-3 border-t border-border py-5", className)}>
      <h2 id={id} className={SECTION_LABEL}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** One order: move it along, add its tracking ID, and see who and what it is for. */
export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[number]">) {
  const { number: raw } = await params;
  await requireAdmin(`/admin/orders/${raw}`);
  const number = parseOrderNumber(raw);
  if (!number) notFound();
  const order = await getOrderForAdmin(number);
  if (!order) notFound();
  // The product's current primary photo; the built-in cut-out for a product since removed.
  const photos = await primaryImagesBySlug(order.items.map((item) => item.productSlug));

  const status = order.status;
  const inFulfilment = isFulfilmentStatus(status);
  const hasTracking = Boolean(order.trackingNumber);
  const customerName = order.customer.name?.trim() || order.shipName;
  const email = order.customer.email ?? order.email;

  return (
    <main className={cn(PAGE, "gap-4 pt-1 lg:gap-6 lg:pt-6")}>
      <div className="flex flex-col gap-1">
        <Link
          href="/admin/orders"
          className="-ml-1.5 inline-flex min-h-11 items-center gap-1 self-start rounded-sm pr-2 text-sm leading-5 font-semibold"
        >
          <ChevronLeft className="size-5" strokeWidth={1.5} aria-hidden="true" />
          Orders
        </Link>
        <h1 className="type-heading-lg tabular-nums">Order #{formatOrderNumber(order.number)}</h1>
        <div className="flex items-center justify-between gap-3 lg:justify-start lg:gap-4">
          <p className="text-[13px] leading-[18px] text-ink-muted">Placed {placedAt.format(order.createdAt)}</p>
          <StatusLabel status={status} />
        </div>
        {order.stockShortfall && order.stockShortfall.length > 0 && (
          <p className="mt-2 flex items-start gap-2 text-[15px] leading-[22px] font-semibold text-danger">
            <CircleAlert className="mt-0.5 size-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <span>
              Paid while out of stock:{" "}
              {order.stockShortfall
                .map((line) => `${line.name} (${line.missing} more than you had)`)
                .join(", ")}
              . Restock before shipping, or contact the customer about a refund.
            </span>
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-12">
        {/* On phones the controls come first; on desktop they sit in the right-hand column. */}
        <div className="flex flex-col lg:sticky lg:top-6 lg:order-2">
          {inFulfilment ? (
            <>
              <Section id="status-title" title="Status">
                <StatusStepper orderId={order.id} status={status} hasTracking={hasTracking} />
              </Section>
              <Section id="tracking-title" title="Tracking">
                <TrackingForm
                  orderId={order.id}
                  status={status}
                  carrier={order.carrier}
                  trackingNumber={order.trackingNumber}
                  shippedOn={order.shippedAt ? formatShortDate(order.shippedAt) : null}
                />
              </Section>
              <div className="border-t border-border pt-5 max-lg:hidden">
                <NextStepButton orderId={order.id} status={status} hasTracking={hasTracking} placement="inline" />
              </div>
            </>
          ) : (
            <Section id="status-title" title="Status">
              <p className={cn("text-[15px] leading-[22px] font-semibold", status === "cancelled" ? "text-ink-muted" : "text-danger")}>
                {status === "cancelled" ? "This order was cancelled." : "Not paid yet. Do not ship this order."}
              </p>
            </Section>
          )}
        </div>

        <div className="flex flex-col lg:order-1">
          <Section id="customer-title" title="Customer">
            <div className="flex flex-col items-start">
              <p className="text-[15px] leading-[22px] font-semibold">{customerName}</p>
              <a href={mobileHref(order.shipPhone)} className="flex min-h-11 items-center gap-2.5 text-[15px] leading-[22px] tabular-nums">
                <Phone className="size-5 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
                {formatMobile(order.shipPhone)}
              </a>
              {email && (
                <a href={`mailto:${email}`} className="flex min-h-11 items-center gap-2.5 text-[15px] leading-[22px] break-all">
                  <Mail className="size-5 shrink-0 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
                  {email}
                </a>
              )}
            </div>
          </Section>

          <Section id="address-title" title="Shipping address">
            <address className="flex flex-col text-[15px] leading-[22px] not-italic select-all">
              <span>{order.shipName}</span>
              <span>{order.shipLine1}</span>
              {order.shipLine2 && <span>{order.shipLine2}</span>}
              <span>
                {order.shipCity}, {order.shipState} {order.shipPincode}
              </span>
            </address>
          </Section>

          <Section id="product-title" title={order.items.length === 1 ? "Product" : "Products"}>
            <ul className="flex flex-col gap-4">
              {order.items.map((item) => {
                const image = photos.get(item.productSlug) ?? productImage(item.productKind, item.productSlug);
                return (
                  <li key={item.id} className="flex flex-col gap-2">
                    <div className="flex items-start gap-3">
                      <span className="relative size-12 shrink-0 overflow-hidden rounded-sm bg-surface-sunken">
                        {image && <Image src={image} alt="" fill sizes="48px" className="object-contain p-1" />}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[15px] leading-[22px] font-semibold">{item.productName}</span>
                        <span className="text-[13px] leading-[18px] text-ink-muted tabular-nums">
                          Qty {item.quantity}
                          {item.quantity > 1 && ` × ${formatPaise(item.unitPricePaise)}`}
                        </span>
                      </span>
                      <span className="text-[15px] leading-[22px] font-semibold whitespace-nowrap tabular-nums">
                        {formatPaise(item.lineTotalPaise)}
                      </span>
                    </div>
                    {item.options.length > 0 && (
                      <dl className="ml-15 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-[13px] leading-[18px]">
                        {item.options.map((option) => (
                          <div key={option.label} className="contents">
                            <dt className="text-ink-muted">{option.label}</dt>
                            <dd className={cn(option.label === "Engraving" && "font-bold tracking-[0.06em]")}>{option.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="flex items-start justify-between gap-3 border-t border-border pt-3">
              <span className="flex flex-col">
                <span className="text-[15px] leading-[22px] font-semibold">Total</span>
                <span className="text-[13px] leading-[18px] text-ink-muted">
                  {order.paidAt ? `Paid via Razorpay on ${formatOrderDate(order.paidAt)}` : "Not paid"}
                  {order.shippingPaise === 0 && " · Free delivery"}
                </span>
                {order.razorpayPaymentId && (
                  <span className="text-[13px] leading-[18px] break-all text-ink-muted">{order.razorpayPaymentId}</span>
                )}
              </span>
              <span className="text-[15px] leading-[22px] font-bold whitespace-nowrap tabular-nums">
                {formatPaise(order.totalPaise)}
              </span>
            </div>
          </Section>
        </div>
      </div>

      {inFulfilment && <NextStepButton orderId={order.id} status={status} hasTracking={hasTracking} placement="bar" />}
    </main>
  );
}
