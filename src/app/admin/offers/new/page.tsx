import type { Metadata } from "next";

import { OfferForm } from "@/components/admin/offer-form";
import { loadOfferWorkspace, OffersOverview, offersHref, OfferWorkspace, parseOfferTab } from "@/components/admin/offer-overview";
import { requireAdmin } from "@/lib/auth/session";
import { dayInIndia } from "@/lib/offers/model";

export const metadata: Metadata = { title: "Create offer" };

/** A new offer. On desktop the list stays beside the form; its tabs (`?tab=`) keep the form open. */
export default async function NewOfferPage({ searchParams }: PageProps<"/admin/offers/new">) {
  const tab = parseOfferTab((await searchParams).tab);
  await requireAdmin("/admin/offers/new");
  const { offers, products } = await loadOfferWorkspace();
  const now = new Date();

  return (
    <OfferWorkspace
      list={<OffersOverview offers={offers} tab={tab} now={now} path="/admin/offers/new" current="new" heading="h2" />}
    >
      <OfferForm products={products} today={dayInIndia(now)} backHref={offersHref(tab)} />
    </OfferWorkspace>
  );
}
