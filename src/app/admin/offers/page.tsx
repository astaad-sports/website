import type { Metadata } from "next";

import { OfferDoneToast } from "@/components/admin/offer-done-toast";
import { OffersOverview, offersHref, parseOfferTab } from "@/components/admin/offer-overview";
import { PAGE } from "@/components/admin/styles";
import { listOffers } from "@/db/offers";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Offers" };

/**
 * Every offer, on Active, Upcoming and Expired tabs. Rows open the offer;
 * the form sends the admin back here with ?done=created or ?done=deleted.
 */
export default async function AdminOffersPage({ searchParams }: PageProps<"/admin/offers">) {
  const params = await searchParams;
  const tab = parseOfferTab(params.tab);
  const done = params.done === "created" || params.done === "deleted" ? params.done : null;
  await requireAdmin(offersHref(tab));
  const offers = await listOffers();

  return (
    <main className={PAGE}>
      <OffersOverview offers={offers} tab={tab} now={new Date()} />
      <OfferDoneToast done={done} href={offersHref(tab)} />
    </main>
  );
}
