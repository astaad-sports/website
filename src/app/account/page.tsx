import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Eyebrow } from "@/components/storefront/eyebrow";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { listOrdersForUser, type OrderWithItems } from "@/db/orders";
import { requireUser } from "@/lib/auth/session";
import { formatOrderDate, formatOrderNumber, formatPaise } from "@/lib/format";
import { ORDER_STATUS_LABEL, orderStatusTone } from "@/lib/orders/status";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false },
};

const memberSince = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });

/** "Astaad Run Machine × 2 and 1 more" */
function itemsLine(order: OrderWithItems): string {
  const [first, ...rest] = order.items;
  if (!first) return "";
  const lead = first.quantity > 1 ? `${first.productName} × ${first.quantity}` : first.productName;
  return rest.length > 0 ? `${lead} and ${rest.length} more` : lead;
}

function OrdersList({ orders }: { orders: OrderWithItems[] }) {
  return (
    <section
      aria-labelledby="account-orders"
      className="flex max-w-[880px] flex-col rounded-md border border-border bg-surface-raised shadow-card"
    >
      <h2 id="account-orders" className="type-heading-sm border-b border-border px-6 py-4">
        Your orders
      </h2>
      {orders.length === 0 ? (
        <div className="flex flex-col items-start gap-4 px-6 py-6">
          <p className="type-body text-ink-muted">No orders yet. Your orders will appear here.</p>
          <Button variant="outline" render={<Link href="/#collection" />} nativeButton={false}>
            Shop bats
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col">
          {orders.map((order) => (
            <li key={order.id} className="border-b border-border last:border-b-0">
              <Link
                href={`/account/orders/${order.number}`}
                className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 px-6 py-4 transition-colors hover:bg-surface-sunken md:grid-cols-[7rem_7rem_minmax(0,1fr)_7rem_6rem_auto]"
              >
                <span className="font-semibold">{formatOrderNumber(order.number)}</span>
                <span className="type-body-sm text-ink-muted md:order-none">{formatOrderDate(order.createdAt)}</span>
                <span className="type-body-sm col-span-2 truncate md:col-span-1">{itemsLine(order)}</span>
                <span className={cn("type-body-sm font-semibold", orderStatusTone(order.status))}>
                  {ORDER_STATUS_LABEL[order.status]}
                </span>
                <span className="font-semibold tabular-nums md:text-right">{formatPaise(order.totalPaise)}</span>
                <ChevronRight className="hidden size-5 text-ink-muted md:block" strokeWidth={1.5} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function AccountPage() {
  const user = await requireUser("/account");
  const orders = await listOrdersForUser(user.id);
  const firstName = user.name?.split(" ")[0];

  const details = [
    { label: "Name", value: user.name ?? "Not added" },
    {
      label: "Email",
      value: user.email ?? "Not added",
      status: user.email
        ? user.emailVerified
          ? { text: "Verified", className: "text-success" }
          : { text: "Not verified", className: "text-ink-muted" }
        : undefined,
    },
    { label: "Phone", value: user.phone ?? "Not added" },
    { label: "Member since", value: memberSince.format(user.createdAt) },
  ];

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-surface-sunken">
        <div className="site-shell flex flex-col gap-8 py-12 md:py-20">
          <div className="flex flex-col gap-3">
            <Eyebrow bar>Your account</Eyebrow>
            <h1 className="type-heading-xl">{firstName ? `Hello, ${firstName}` : "Your account"}</h1>
            {user.email && <p className="type-body text-ink-muted">Signed in as {user.email}</p>}
          </div>

          <OrdersList orders={orders} />

          <section
            aria-labelledby="account-details"
            className="flex max-w-[640px] flex-col rounded-md border border-border bg-surface-raised shadow-card"
          >
            <h2 id="account-details" className="type-heading-sm border-b border-border px-6 py-4">
              Account details
            </h2>
            <dl className="flex flex-col">
              {details.map((row) => (
                <div
                  key={row.label}
                  className="flex flex-col gap-1 border-b border-border px-6 py-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-6"
                >
                  <dt className="type-body-sm text-ink-muted sm:w-36 sm:shrink-0">{row.label}</dt>
                  <dd className="type-body flex flex-wrap items-center gap-x-3 break-all">
                    {row.value}
                    {row.status && (
                      <span className={`type-body-sm font-semibold ${row.status.className}`}>
                        {row.status.text}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <form action={signOut}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
