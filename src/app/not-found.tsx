import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Eyebrow } from "@/components/storefront/eyebrow";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
};

/**
 * The store's 404: a wrong address, or a product that is no longer on sale.
 * Next sends the 404 status and a noindex tag with it.
 */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-surface-sunken">
        <div className="site-shell flex flex-col gap-8 py-16 md:py-24">
          <div className="flex max-w-[640px] flex-col gap-3">
            <Eyebrow bar>Error 404</Eyebrow>
            <h1 className="type-heading-xl">We can’t find that page</h1>
            <p className="type-body-lg text-ink-muted">
              The address may be mistyped, or the product is no longer on sale. Everything we make is in the shop.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 max-sm:flex-col">
            <Button size="lg" render={<Link href="/shop" />} nativeButton={false}>
              Shop Astaad
              <ArrowRight className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />
            </Button>
            <Button size="lg" variant="secondary" render={<Link href="/shop/bats" />} nativeButton={false}>
              See the bats
            </Button>
            <Button size="lg" variant="ghost" render={<Link href="/" />} nativeButton={false}>
              Go to the home page
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
