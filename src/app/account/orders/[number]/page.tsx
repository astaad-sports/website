import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleCheck } from "lucide-react";

import { lineOfferText, RegularPrice } from "@/components/cart/line-offer";
import { OrderProgress } from "@/components/orders/order-progress";
import { Eyebrow } from "@/components/storefront/eyebrow";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { getOrderForUser } from "@/db/orders";
import { requireUser } from "@/lib/auth/session";
import { formatOrderDate, formatOrderNumber, formatPaise, parseOrderNumber } from "@/lib/format";
import { ORDER_STATUS_LABEL, orderStatusTone } from "@/lib/orders/status";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: PageProps<"/account/orders/[number]">): Promise<Metadata> {
  const number = parseOrderNumber((await params).number);
  return {
    title: number ? `Order ${formatOrderNumber(number)}` : "Order",
    robots: { index: false },
  };
}

/**
 * One order: its items (with the offer or coupon behind each price), totals
 * with the discount and coupon, delivery address and payment. Only its owner
 * can see it.
 */
export default async function OrderPage({ params, searchParams }: PageProps<"/account/orders/[number]">) {
  const { number: raw } = await params;
  const { placed } = await searchParams;
  const user = await requireUser(`/account/orders/${raw}`);
  const number = parseOrderNumber(raw);
  if (!number) notFound();
  const order = await getOrderForUser(user.id, number);
  if (!order) notFound();

  const confirmed = order.status !== "pending_payment" && order.status !== "cancelled";
  const justPlaced = placed === "1" && confirmed;

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-surface-sunken">
        <div className="site-shell flex flex-col gap-8 py-12 md:py-16">
          <div className="flex flex-col gap-3">
            <Eyebrow bar>
              <Link href="/account" className="transition-colors hover:text-foreground">
                Your account
              </Link>
              <span aria-hidden="true">·</span>
              <span>Order {formatOrderNumber(order.number)}</span>
            </Eyebrow>
            {justPlaced ? (
              <h1 className="flex items-center gap-3 type-heading-xl">
                <CircleCheck className="size-8 shrink-0 text-success" strokeWidth={1.75} aria-hidden="true" />
                Thank you. Your order is confirmed.
              </h1>
            ) : (
              <h1 className="type-heading-xl">Order {formatOrderNumber(order.number)}</h1>
            )}
            <p className="type-body text-ink-muted">
              {justPlaced && <>Order {formatOrderNumber(order.number)} · </>}
              Placed on {formatOrderDate(order.createdAt)} ·{" "}
              <span className={cn("font-semibold", orderStatusTone(order.status))}>
                {ORDER_STATUS_LABEL[order.status]}
              </span>
            </p>
            {order.status === "pending_payment" && (
              <p className="max-w-[640px] type-body text-ink-muted">
                We have not received the payment for this order. If money left your account, it
                will show as confirmed within a few minutes.
              </p>
            )}
          </div>

          {confirmed && <OrderProgress order={order} />}

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
            <section
              aria-labelledby="order-items"
              className="flex flex-col rounded-md border border-border bg-surface-raised shadow-card"
            >
              <h2 id="order-items" className="type-heading-sm border-b border-border px-6 py-4">
                Items
              </h2>
              <ul className="flex flex-col">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-2 border-b border-border px-6 py-5 last:border-b-0 sm:flex-row sm:justify-between sm:gap-6"
                  >
                    <div className="flex flex-col gap-1">
                      <p className="font-semibold">{item.productName}</p>
                      {item.options.length > 0 && (
                        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 type-body-sm">
                          {item.options.map((option) => (
                            <div key={option.label} className="contents">
                              <dt className="text-ink-muted">{option.label}</dt>
                              <dd>{option.value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      {item.offer && <p className="type-body-sm font-semibold">{lineOfferText(item.offer)}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col sm:items-end">
                      <span className="flex flex-wrap items-baseline gap-x-2 sm:justify-end">
                        <span className="font-semibold tabular-nums">{formatPaise(item.lineTotalPaise)}</span>
                        {item.offer && item.offer.regularPricePaise > item.unitPricePaise && (
                          <RegularPrice paise={item.offer.regularPricePaise * item.quantity} />
                        )}
                      </span>
                      <span className="type-body-sm text-ink-muted">
                        {item.quantity} × {formatPaise(item.unitPricePaise)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <div className="flex flex-col gap-4">
              <section
                aria-labelledby="order-total"
                className="flex flex-col gap-3 rounded-md border border-border bg-surface-raised p-6 shadow-card"
              >
                <h2 id="order-total" className="type-heading-sm">
                  Payment
                </h2>
                <dl className="flex flex-col gap-2 type-body">
                  {/* At regular prices, so the rows add up with the discount taken off. */}
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-muted">Subtotal</dt>
                    <dd className="tabular-nums">{formatPaise(order.subtotalPaise + order.discountPaise)}</dd>
                  </div>
                  {order.discountPaise > 0 && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-muted">Discount</dt>
                      <dd className="tabular-nums">&minus;{formatPaise(order.discountPaise)}</dd>
                    </div>
                  )}
                  {order.couponCode && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-muted">Coupon</dt>
                      <dd className="font-semibold">{order.couponCode}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-muted">Delivery</dt>
                    <dd>{order.shippingPaise ? formatPaise(order.shippingPaise) : "Free"}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
                    <dt className="font-semibold">Total</dt>
                    <dd className="type-price-lg tabular-nums">{formatPaise(order.totalPaise)}</dd>
                  </div>
                </dl>
                {order.razorpayPaymentId && order.paidAt && (
                  <p className="type-body-sm text-ink-muted">
                    Paid on {formatOrderDate(order.paidAt)} · Razorpay payment {order.razorpayPaymentId}
                  </p>
                )}
              </section>

              <section
                aria-labelledby="order-address"
                className="flex flex-col gap-3 rounded-md border border-border bg-surface-raised p-6 shadow-card"
              >
                <h2 id="order-address" className="type-heading-sm">
                  Delivery address
                </h2>
                <address className="flex flex-col type-body not-italic">
                  <span className="font-semibold">{order.shipName}</span>
                  <span>{order.shipLine1}</span>
                  {order.shipLine2 && <span>{order.shipLine2}</span>}
                  <span>
                    {order.shipCity}, {order.shipState} {order.shipPincode}
                  </span>
                  <span className="text-ink-muted">+91 {order.shipPhone}</span>
                </address>
              </section>

              <Link
                href="/account"
                className="inline-flex items-center gap-2 self-start type-body-sm font-semibold underline underline-offset-4"
              >
                <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden="true" />
                All orders
              </Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
