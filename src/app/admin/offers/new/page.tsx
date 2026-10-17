import type { Metadata } from "next";
import { z } from "zod";

import { OfferForm, type OfferTemplate } from "@/components/admin/offer-form";
import { loadOfferWorkspace, OffersOverview, offersHref, OfferWorkspace, parseOfferTab } from "@/components/admin/offer-overview";
import { getOffer } from "@/db/offers";
import { requireAdmin } from "@/lib/auth/session";
import { dayInIndia } from "@/lib/offers/model";

export const metadata: Metadata = { title: "Create offer" };

/** Run again: the offer to copy (`?from=`), without its dates or code. */
async function templateFrom(from: unknown): Promise<OfferTemplate | null> {
  if (typeof from !== "string" || !z.uuid().safeParse(from).success) return null;
  const offer = await getOffer(from);
  if (!offer) return null;
  return {
    name: offer.name,
    percentOff: offer.percentOff,
    scope: offer.scope,
    categories: offer.categories,
    productIds: offer.productIds,
    // A copied coupon has no code yet, so it starts as an automatic offer would.
    announce: offer.code ? true : offer.announce,
    headline: offer.headline,
  };
}

/**
 * A new offer, or a copy of one (`?from=` an offer id, from Run again). On
 * desktop the list stays beside the form; its tabs (`?tab=`) keep the form open.
 */
export default async function NewOfferPage({ searchParams }: PageProps<"/admin/offers/new">) {
  const params = await searchParams;
  const tab = parseOfferTab(params.tab);
  await requireAdmin("/admin/offers/new");
  const [{ offers, products }, template] = await Promise.all([loadOfferWorkspace(), templateFrom(params.from)]);
  const now = new Date();

  return (
    <OfferWorkspace
      list={<OffersOverview offers={offers} tab={tab} now={now} path="/admin/offers/new" current="new" heading="h2" />}
    >
      <OfferForm
        key={typeof params.from === "string" ? params.from : "new"}
        template={template}
        products={products}
        today={dayInIndia(now)}
        backHref={offersHref(tab)}
      />
    </OfferWorkspace>
  );
}
