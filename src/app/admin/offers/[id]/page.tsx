import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { z } from "zod";

import { OfferForm, type OfferFormOffer } from "@/components/admin/offer-form";
import { loadOfferWorkspace, OffersOverview, offersHref, OfferWorkspace, parseOfferTab } from "@/components/admin/offer-overview";
import { getOffer } from "@/db/offers";
import type { Offer } from "@/db/schema";
import { isAdmin } from "@/lib/auth/admin";
import { getCurrentUser, requireAdmin } from "@/lib/auth/session";
import { dayInIndia, offerNote, offerStatus } from "@/lib/offers/model";

/** One database read for the title and the page; a malformed id is simply not found. */
const loadOffer = cache(async (id: string) => (z.uuid().safeParse(id).success ? getOffer(id) : undefined));

export async function generateMetadata({ params }: PageProps<"/admin/offers/[id]">): Promise<Metadata> {
  // Only an admin learns an offer's name from the title; everyone else gets a 404.
  if (!isAdmin(await getCurrentUser())) return {};
  const offer = await loadOffer((await params).id);
  return { title: offer ? offer.name : "Offer not found" };
}

function toFormOffer(offer: Offer, now: Date): OfferFormOffer {
  return {
    id: offer.id,
    name: offer.name,
    percentOff: offer.percentOff,
    startDate: dayInIndia(offer.startsAt),
    endDate: dayInIndia(offer.endsAt),
    scope: offer.scope,
    categories: offer.categories,
    productIds: offer.productIds,
    code: offer.code,
    status: offerStatus(offer, now),
    note: offerNote(offer, now),
    updatedAt: offer.updatedAt.getTime(),
  };
}

/**
 * Edit an offer, end it early or delete it. On desktop the list stays beside
 * the form, open on the offer's own tab unless `?tab=` picks another.
 */
export default async function EditOfferPage({ params, searchParams }: PageProps<"/admin/offers/[id]">) {
  const { id } = await params;
  await requireAdmin(`/admin/offers/${id}`);
  const offer = await loadOffer(id);
  if (!offer) notFound();

  const now = new Date();
  const status = offerStatus(offer, now);
  const tab = parseOfferTab((await searchParams).tab, status);
  const { offers, products } = await loadOfferWorkspace();

  return (
    <OfferWorkspace
      list={<OffersOverview offers={offers} tab={tab} now={now} path={`/admin/offers/${offer.id}`} current={offer.id} heading="h2" />}
    >
      <OfferForm
        key={offer.id}
        offer={toFormOffer(offer, now)}
        products={products}
        today={dayInIndia(now)}
        backHref={offersHref(status)}
      />
    </OfferWorkspace>
  );
}
