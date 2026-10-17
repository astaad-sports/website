import type { Metadata } from "next";

import { UnsubscribeForm } from "@/components/cart-reminders/unsubscribe-form";
import { Eyebrow } from "@/components/storefront/eyebrow";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";

export const metadata: Metadata = {
  title: "Unsubscribe from cart reminders",
  robots: { index: false },
};

/**
 * Where a cart reminder's "Unsubscribe" link goes. The link carries the
 * reminder's id, not an email address; the button stops reminders to the
 * address that reminder went to.
 */
export default async function UnsubscribePage({ params }: PageProps<"/unsubscribe/[id]">) {
  const { id } = await params;
  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-surface-sunken">
        <div className="site-shell flex flex-col gap-8 py-12 md:py-16">
          <div className="flex max-w-[640px] flex-col gap-3">
            <Eyebrow bar>Emails</Eyebrow>
            <h1 className="type-heading-xl">Stop cart reminders?</h1>
            <p className="type-body-lg text-ink-muted">
              We send one reminder when items are left in a cart. You can stop these, and emails about orders you
              place will still come as usual.
            </p>
          </div>
          <div className="max-w-[640px] rounded-md border border-border bg-surface-raised p-6 shadow-card">
            <UnsubscribeForm id={id} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
