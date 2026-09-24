import type { Metadata } from "next";

import { CatalogueProvider } from "@/components/cart/catalogue-provider";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { Eyebrow } from "@/components/storefront/eyebrow";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { getLastShippingAddress } from "@/db/orders";
import { requireUser } from "@/lib/auth/session";
import type { ShippingAddress } from "@/lib/checkout";
import { razorpayConfigured } from "@/lib/payments/razorpay";
import { getFreshStoreCatalogue } from "@/lib/products/catalogue";
import { getStoreSettings } from "@/lib/settings/store";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const [lastAddress, catalogue, settings] = await Promise.all([
    getLastShippingAddress(user.id),
    getFreshStoreCatalogue(),
    getStoreSettings(),
  ]);
  // Prefill from the last order, or at least the name and phone on the account.
  const defaults: Partial<ShippingAddress> = lastAddress ?? {
    name: user.name ?? undefined,
    phone: user.phone ?? undefined,
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
              email={user.email}
              defaults={defaults}
              paymentsReady={razorpayConfigured()}
              storeName={settings.storeName}
            />
          </CatalogueProvider>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
