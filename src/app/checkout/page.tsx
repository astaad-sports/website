import type { Metadata } from "next";

import { CatalogueProvider } from "@/components/cart/catalogue-provider";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { Eyebrow } from "@/components/storefront/eyebrow";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { listAddresses } from "@/db/addresses";
import { getLastShippingAddress } from "@/db/orders";
import { getCurrentUser } from "@/lib/auth/session";
import { isTestAccount } from "@/lib/auth/test-account";
import { BUY_NOW_CHECKOUT, type ShippingAddress } from "@/lib/checkout";
import { razorpayConfigured } from "@/lib/payments/razorpay";
import { getFreshStoreCatalogue } from "@/lib/products/catalogue";
import { getStoreSettings } from "@/lib/settings/store";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

/**
 * Checkout for the cart, or with "?buy=now" for the one product "Buy it now"
 * chose. No account is needed: a signed-out customer checks out as a guest.
 */
export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  const buyNow = (await searchParams).buy === "now";
  const user = await getCurrentUser();
  const test = user ? isTestAccount(user) : false;
  const [addresses, lastAddress, catalogue, settings] = await Promise.all([
    user ? listAddresses(user.id) : [],
    user ? getLastShippingAddress(user.id) : null,
    getFreshStoreCatalogue(),
    getStoreSettings(),
  ]);
  // With no saved address to start on: the last order's, or at least the name and phone on the account.
  const defaults: Partial<ShippingAddress> = lastAddress ?? {
    name: user?.name ?? undefined,
    phone: user?.phone ?? undefined,
  };

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-surface-sunken">
        <div className="site-shell flex flex-col gap-8 py-12 md:py-16">
          <div className="flex flex-col gap-3">
            <Eyebrow bar>Secure checkout</Eyebrow>
            <h1 className="type-heading-xl">Checkout</h1>
          </div>
          {/* Priced from the database, as placeOrder prices it, rather than
              the root layout's cached catalogue; the nearest provider wins. */}
          <CatalogueProvider catalogue={catalogue}>
            <CheckoutView
              buyNow={buyNow}
              guest={!user}
              signInHref={`/login?next=${encodeURIComponent(buyNow ? BUY_NOW_CHECKOUT : "/checkout")}`}
              email={user?.email ?? null}
              defaults={defaults}
              addresses={addresses}
              paymentsReady={razorpayConfigured({ test })}
              testAccount={test}
              storeName={settings.storeName}
            />
          </CatalogueProvider>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
