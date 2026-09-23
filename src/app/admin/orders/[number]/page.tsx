import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ShipmentForm } from "@/components/admin/shipment-form";
import { OrderProgress } from "@/components/orders/order-progress";
import { Eyebrow } from "@/components/storefront/eyebrow";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { getOrderForAdmin } from "@/db/orders";
import { requireAdmin } from "@/lib/auth/session";
import { formatOrderDate, formatOrderNumber, formatPaise, parseOrderNumber } from "@/lib/format";
import { ORDER_STATUS_LABEL, orderStatusTone } from "@/lib/orders/status";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Order · Store admin",
  robots: { index: false },
};

const CARD = "flex flex-col gap-4 rounded-md border border-border bg-surface-raised p-6 shadow-card";

/** One order for fulfilment: what to pack, where it goes, and its Trackon shipment. */
export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[number]">) {
  const { number: raw } = await params;
  await requireAdmin(`/admin/orders/${raw}`);
  const number = parseOrderNumber(raw);
  if (!number) notFound();
  const order = await getOrderForAdmin(number);
  if (!order) notFound();

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-surface-sunken">
        <div className="site-shell flex flex-col gap-8 py-12 md:py-16">
          <div className="flex flex-col gap-3">
            <Eyebrow bar>
              <Link href="/admin/orders" className="transition-colors hover:text-foreground">
                Store admin · Orders
              </Link>
            </Eyebrow>
            <h1 className="type-heading-xl">{formatOrderNumber(order.number)}</h1>
            <p className="type-body text-ink-muted">
              Placed on {formatOrderDate(order.createdAt)} ·{" "}
              <span className={cn("font-semibold", orderStatusTone(order.status))}>
                {ORDER_STATUS_LABEL[order.status]}
              </span>{" "}
              · {formatPaise(order.totalPaise)}
            </p>
          </div>

          <OrderProgress order={order} />

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
            <div className="flex flex-col gap-8">
              <section aria-labelledby="pack" className="flex flex-col rounded-md border border-border bg-surface-raised shadow-card">
                <h2 id="pack" className="type-heading-sm border-b border-border px-6 py-4">
                  To pack
                </h2>
                <ul className="flex flex-col">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex flex-col gap-2 border-b border-border px-6 py-5 last:border-b-0">
                      <p className="font-semibold">
                        {item.quantity} × {item.productName}
                      </p>
                      {item.options.length > 0 && (
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 type-body-sm">
                          {item.options.map((option) => (
                            <div key={option.label} className="contents">
                              <dt className="text-ink-muted">{option.label}</dt>
                              <dd className={cn(option.label === "Engraving" && "font-bold tracking-[0.06em]")}>
                                {option.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              <div className="grid gap-8 md:grid-cols-2">
                <section aria-labelledby="ship-to" className={CARD}>
                  <h2 id="ship-to" className="type-heading-sm">
                    Ship to
                  </h2>
                  <address className="flex flex-col type-body not-italic select-all">
                    <span className="font-semibold">{order.shipName}</span>
                    <span>{order.shipLine1}</span>
                    {order.shipLine2 && <span>{order.shipLine2}</span>}
                    <span>
                      {order.shipCity}, {order.shipState}
                    </span>
                    <span>PIN {order.shipPincode}</span>
                    <span>Mobile +91 {order.shipPhone}</span>
                  </address>
                </section>

                <section aria-labelledby="customer" className={CARD}>
                  <h2 id="customer" className="type-heading-sm">
                    Customer and payment
                  </h2>
                  <dl className="flex flex-col gap-1 type-body-sm">
                    <dt className="text-ink-muted">Account</dt>
                    <dd>{order.customer.name ?? "No name"}</dd>
                    <dd className="break-all">{order.customer.email ?? order.email ?? "No email"}</dd>
                    {order.razorpayPaymentId && (
                      <>
                        <dt className="mt-2 text-ink-muted">Razorpay payment</dt>
                        <dd className="break-all">{order.razorpayPaymentId}</dd>
                      </>
                    )}
                  </dl>
                </section>
              </div>
            </div>

            <section aria-labelledby="shipment" className={cn(CARD, "lg:sticky lg:top-6")}>
              <h2 id="shipment" className="type-heading-sm">
                Shipment
              </h2>
              {(order.status === "paid" || order.status === "shipped") && (
                <>
                  <p className="type-body-sm text-ink-muted">
                    {order.status === "paid"
                      ? "Book this parcel with Trackon, then enter the AWB from the consignment note. The customer sees it on their order straight away."
                      : "In transit with Trackon. Correct the AWB here, or mark the order delivered once Trackon shows it delivered."}
                  </p>
                  {/* One slot for both statuses, so the form keeps its "Shipped" message after saving. */}
                  <ShipmentForm
                    orderId={order.id}
                    status={order.status}
                    carrier={order.carrier}
                    trackingNumber={order.trackingNumber}
                  />
                </>
              )}
              {order.status === "delivered" && (
                <p className="type-body-sm font-semibold text-success">
                  Delivered on {order.deliveredAt ? formatOrderDate(order.deliveredAt) : "an unknown date"}.
                </p>
              )}
              {order.status === "pending_payment" && (
                <p className="type-body-sm text-danger">Not paid. Do not ship this order.</p>
              )}
              {order.status === "cancelled" && <p className="type-body-sm text-ink-muted">This order was cancelled.</p>}
            </section>
          </div>

          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 self-start type-body-sm font-semibold underline underline-offset-4"
          >
            <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden="true" />
            All orders
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
