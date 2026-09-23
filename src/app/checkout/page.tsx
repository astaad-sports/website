import type { Metadata } from "next";

import { CheckoutView } from "@/components/checkout/checkout-view";
import { Eyebrow } from "@/components/storefront/eyebrow";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { getLastShippingAddress } from "@/db/orders";
import { requireUser } from "@/lib/auth/session";
import type { ShippingAddress } from "@/lib/checkout";
import { razorpayConfigured } from "@/lib/payments/razorpay";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  // Prefill from the last order, or at least the name and phone on the account.
  const defaults: Partial<ShippingAddress> = (await getLastShippingAddress(user.id)) ?? {
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
          <CheckoutView email={user.email} defaults={defaults} paymentsReady={razorpayConfigured()} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
