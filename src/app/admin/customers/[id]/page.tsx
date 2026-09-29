import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Mail, Phone } from "lucide-react";
import { z } from "zod";

import { AddressBook } from "@/components/addresses/address-book";
import { customerName } from "@/components/admin/customer-rows";
import { OrderRow } from "@/components/admin/order-rows";
import { ReviewRow } from "@/components/admin/review-rows";
import { PAGE, SECTION_LABEL } from "@/components/admin/styles";
import { listAddresses } from "@/db/addresses";
import { getCustomer } from "@/db/customers";
import { listOrdersForUser } from "@/db/orders";
import { listReviewsOfCustomer } from "@/db/review-customers";
import { makeDefaultCustomerAddress, removeCustomerAddress, saveCustomerAddress } from "@/lib/addresses/admin-actions";
import { requireAdmin } from "@/lib/auth/session";
import { formatMobile, formatOrderDate, mobileHref } from "@/lib/format";
import { cn } from "@/lib/utils";

async function findCustomer(id: string) {
  return z.uuid().safeParse(id).success ? getCustomer(id) : undefined;
}

// The same for everyone: the customer's name would tell a visitor who is not an admin that the account exists.
export const metadata: Metadata = { title: "Customer" };

/** One customer: how to reach them, the addresses they have saved (which the admin can change), their orders and their reviews. */
export default async function AdminCustomerPage({ params }: PageProps<"/admin/customers/[id]">) {
  const { id } = await params;
  await requireAdmin(`/admin/customers/${id}`);
  const customer = await findCustomer(id);
  if (!customer) notFound();
  const [addresses, orders, reviews] = await Promise.all([
    listAddresses(customer.id),
    listOrdersForUser(customer.id),
    listReviewsOfCustomer(customer.id),
  ]);
  const now = new Date();

  return (
    <main className={cn(PAGE, "gap-4 pt-1 lg:gap-6 lg:pt-6")}>
      <div className="flex flex-col gap-1">
        <Link
          href="/admin/customers"
          className="-ml-1.5 inline-flex min-h-11 items-center gap-1 self-start rounded-sm pr-2 text-sm leading-5 font-semibold"
        >
          <ChevronLeft className="size-5" strokeWidth={1.5} aria-hidden="true" />
          Customers
        </Link>
        <h1 className="type-heading-lg break-words">{customerName(customer)}</h1>
        <p className="text-[13px] leading-[18px] text-ink-muted">
          Joined {formatOrderDate(customer.createdAt)} · Last signed in {formatOrderDate(customer.lastSignInAt)}
        </p>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-12">
        <div className="flex flex-col">
          <section aria-labelledby="contact-title" className="flex flex-col gap-3 border-t border-border py-5">
            <h2 id="contact-title" className={SECTION_LABEL}>
              Contact
            </h2>
            <div className="flex flex-col items-start">
              {customer.phone && (
                <a href={mobileHref(customer.phone)} className="flex min-h-11 items-center gap-2.5 text-[15px] leading-[22px] tabular-nums">
                  <Phone className="size-5 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
                  {formatMobile(customer.phone)}
                </a>
              )}
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="flex min-h-11 items-center gap-2.5 text-[15px] leading-[22px] break-all">
                  <Mail className="size-5 shrink-0 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
                  {customer.email}
                  {!customer.emailVerified && <span className="text-[13px] leading-[18px] text-ink-muted">Not verified</span>}
                </a>
              )}
              {!customer.phone && !customer.email && (
                <p className="text-[15px] leading-[22px] text-ink-muted">No phone or email on this account.</p>
              )}
            </div>
          </section>

          <AddressBook
            skin="admin"
            addresses={addresses}
            actions={{
              save: saveCustomerAddress.bind(null, customer.id),
              remove: removeCustomerAddress.bind(null, customer.id),
              makeDefault: makeDefaultCustomerAddress.bind(null, customer.id),
            }}
            starting={{ name: customer.name ?? undefined, phone: customer.phone ?? undefined }}
            empty="No saved addresses. Add one and the customer's next checkout starts with it."
          />
        </div>

        <div className="flex flex-col gap-5 max-lg:mt-5 lg:gap-8">
          <section aria-labelledby="orders-title" className="flex flex-col border-t border-border pt-5">
            <div className="flex min-h-11 items-center justify-between pb-3">
              <h2 id="orders-title" className={SECTION_LABEL}>
                Orders
              </h2>
              <span className="text-xs leading-4 font-semibold text-ink-muted tabular-nums">{orders.length}</span>
            </div>
            {orders.length === 0 ? (
              <p className="border-t border-border py-4 text-[15px] leading-[22px] text-ink-muted">No orders yet.</p>
            ) : (
              <ul className="flex flex-col border-t border-border">
                {orders.map((order) => (
                  <OrderRow key={order.id} order={order} />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="reviews-title" className="flex flex-col border-t border-border pt-5">
            <div className="flex min-h-11 items-center justify-between pb-3">
              <h2 id="reviews-title" className={SECTION_LABEL}>
                Reviews
              </h2>
              <span className="text-xs leading-4 font-semibold text-ink-muted tabular-nums">{reviews.length}</span>
            </div>
            {reviews.length === 0 ? (
              <p className="border-t border-border py-4 text-[15px] leading-[22px] text-ink-muted">
                No reviews from this customer. To give them one, open the review and link it to them.
              </p>
            ) : (
              <ul className="flex flex-col border-t border-border">
                {reviews.map((review) => (
                  <ReviewRow key={review.id} review={review} now={now} showStatus />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
