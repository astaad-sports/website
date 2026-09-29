import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { ChangePassword } from "@/components/account/change-password";
import { ProfileCard } from "@/components/account/profile-card";
import { AccountQuickLinks } from "@/components/account/quick-links";
import { OrderProgress } from "@/components/orders/order-progress";
import { Eyebrow } from "@/components/storefront/eyebrow";
import { MobileTabBar } from "@/components/storefront/mobile-tab-bar";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { Button } from "@/components/ui/button";
import { getLastShippingAddress, listOrdersForUser, type OrderWithItems } from "@/db/orders";
import { formatMobile, signInMethods } from "@/lib/account/model";
import { getSignInProviders } from "@/lib/account/sign-in";
import { signOut, signOutEverywhere } from "@/lib/auth/actions";
import { isAdmin } from "@/lib/auth/admin";
import { requireUser } from "@/lib/auth/session";
import { isTestAccount } from "@/lib/auth/test-account";
import type { ShippingAddress } from "@/lib/checkout";
import { formatOrderDate, formatOrderNumber, formatPaise } from "@/lib/format";
import { ORDER_STATUS_LABEL, orderStatusTone } from "@/lib/orders/status";
import { listInWords } from "@/lib/words";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false },
};

const memberSince = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });

const CARD = "flex flex-col rounded-md border border-border bg-surface-raised shadow-card";
const TEXT_LINK = "type-body-sm font-semibold underline underline-offset-4";

/** "Astaad Run Machine × 2 and 1 more" */
function itemsLine(order: OrderWithItems): string {
  const [first, ...rest] = order.items;
  if (!first) return "";
  const lead = first.quantity > 1 ? `${first.productName} × ${first.quantity}` : first.productName;
  return rest.length > 0 ? `${lead} and ${rest.length} more` : lead;
}

/** An order still on its way: paid for, and neither delivered nor cancelled. */
function onItsWay(order: OrderWithItems | undefined): order is OrderWithItems {
  return Boolean(order) && order!.status !== "delivered" && order!.status !== "cancelled";
}

/** The customer's orders, newest first. A row is a table row where the card is wide enough, two lines where it is not. */
function OrdersList({ orders }: { orders: OrderWithItems[] }) {
  return (
    <section aria-labelledby="account-orders" className={cn(CARD, "@container")}>
      <h2 id="account-orders" className="type-heading-sm border-b border-border px-6 py-4">
        Your orders
      </h2>
      {orders.length === 0 ? (
        <div className="flex flex-col items-start gap-4 px-6 py-6">
          <p className="type-body text-ink-muted">No orders yet. Your orders will appear here.</p>
          <div className="flex flex-wrap gap-3">
            <Button render={<Link href="/shop/bats" />} nativeButton={false}>
              Shop bats
            </Button>
            <Button variant="outline" render={<Link href="/shop" />} nativeButton={false}>
              Shop all gear
            </Button>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col">
          {orders.map((order) => (
            <li key={order.id} className="border-b border-border last:border-b-0">
              <Link
                href={`/account/orders/${order.number}`}
                className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 px-6 py-4 transition-colors hover:bg-surface-sunken @[760px]:grid-cols-[7rem_7rem_minmax(0,1fr)_7rem_6rem_auto]"
              >
                <span className="font-semibold">{formatOrderNumber(order.number)}</span>
                <span className="type-body-sm text-ink-muted">{formatOrderDate(order.createdAt)}</span>
                <span className="type-body-sm col-span-2 truncate @[760px]:col-span-1">{itemsLine(order)}</span>
                <span className={cn("type-body-sm font-semibold", orderStatusTone(order.status))}>
                  {ORDER_STATUS_LABEL[order.status]}
                  {order.isTest && <span className="font-normal text-ink-muted"> · Test</span>}
                </span>
                <span className="font-semibold tabular-nums @[760px]:text-right">{formatPaise(order.totalPaise)}</span>
                <ChevronRight className="hidden size-5 text-ink-muted @[760px]:block" strokeWidth={1.5} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Where the last order went, which is where checkout starts. */
function AddressCard({ address }: { address: ShippingAddress | null }) {
  return (
    <section aria-labelledby="account-address" className={cn(CARD, "gap-3 p-6")}>
      <h2 id="account-address" className="type-heading-sm">
        Delivery address
      </h2>
      {address ? (
        <>
          <address className="flex flex-col type-body not-italic">
            <span className="font-semibold">{address.name}</span>
            <span>{address.line1}</span>
            {address.line2 && <span>{address.line2}</span>}
            <span>
              {address.city}, {address.state} {address.pincode}
            </span>
            <span className="text-ink-muted tabular-nums">+91 {formatMobile(address.phone)}</span>
          </address>
          <p className="type-body-sm text-ink-muted">
            From your last order. Checkout starts with this address, and you can change it there.
          </p>
        </>
      ) : (
        <p className="type-body text-ink-muted">
          No address yet. You will add one at checkout, and we will keep it for your next order.
        </p>
      )}
    </section>
  );
}

/** How the customer signs in, a new password for those who have one, and signing out here or everywhere. */
function SignInCard({ email, providers }: { email: string | null; providers: string[] }) {
  const methods = signInMethods(providers);
  return (
    <section aria-labelledby="account-sign-in" className={cn(CARD, "gap-4 p-6")}>
      <h2 id="account-sign-in" className="type-heading-sm">
        Sign-in and security
      </h2>
      {methods.length > 0 && <p className="type-body">You sign in with {listInWords(methods, "or")}.</p>}
      {email && providers.includes("password") && <ChangePassword email={email} />}
      <div className="flex flex-wrap gap-3 border-t border-border pt-4">
        <form action={signOut}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
        <form action={signOutEverywhere}>
          <Button type="submit" variant="ghost">
            Sign out of all devices
          </Button>
        </form>
      </div>
    </section>
  );
}

export default async function AccountPage() {
  const user = await requireUser("/account");
  const [orders, address, providers] = await Promise.all([
    listOrdersForUser(user.id),
    getLastShippingAddress(user.id),
    getSignInProviders(user.firebaseUid),
  ]);
  const firstName = user.name?.split(" ")[0];
  const [latest] = orders;

  return (
    <>
      <SiteHeader sticky />
      <main className="flex-1 bg-surface-sunken">
        <div className="site-shell flex flex-col gap-8 py-12 md:py-20">
          <div className="flex flex-col gap-3">
            <Eyebrow bar>Your account</Eyebrow>
            <h1 className="type-heading-xl">{firstName ? `Hello, ${firstName}` : "Your account"}</h1>
            {user.email && <p className="type-body text-ink-muted">Signed in as {user.email}</p>}
            {isTestAccount(user) && (
              <p className="max-w-[640px] type-body">
                <span className="font-semibold">Test account.</span> Orders you place are paid in Razorpay&apos;s
                test mode: no money is taken, no stock is used and nothing ships.
              </p>
            )}
            {isAdmin(user) && (
              <Link href="/admin" className={cn(TEXT_LINK, "inline-flex min-h-11 items-center gap-1.5 self-start")}>
                Store admin
                <ChevronRight className="size-4" strokeWidth={1.5} aria-hidden="true" />
              </Link>
            )}
          </div>

          <AccountQuickLinks />

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
            <div className="flex flex-col gap-8">
              {onItsWay(latest) && (
                <OrderProgress
                  order={latest}
                  title={`Your latest order, ${formatOrderNumber(latest.number)}`}
                  action={
                    <Link href={`/account/orders/${latest.number}`} className={TEXT_LINK}>
                      View order
                    </Link>
                  }
                />
              )}
              <OrdersList orders={orders} />
            </div>

            <div className="flex flex-col gap-4">
              <ProfileCard
                details={{
                  name: user.name,
                  phone: user.phone,
                  email: user.email,
                  emailVerified: user.emailVerified,
                  memberSince: memberSince.format(user.createdAt),
                }}
              />
              <AddressCard address={address} />
              <SignInCard email={user.email} providers={providers} />
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </>
  );
}
