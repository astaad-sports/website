import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, StoreDetails, type LegalSection } from "@/components/storefront/legal-page";
import { formatPaise } from "@/lib/format";
import { pageMetadata } from "@/lib/seo/metadata";
import { deliveryFeePaise } from "@/lib/settings/model";
import { getStoreSettings } from "@/lib/settings/store";
import { CARRIERS } from "@/lib/shipping";

export const metadata: Metadata = pageMetadata({
  title: "Delivery",
  description:
    "Where Astaad Sports delivers, what it costs, how long it takes, and how to track your cricket bat or gear on its way.",
  path: "/delivery",
});

const UPDATED = "7 October 2026";

/** How long a parcel takes from the courier picking it up, in days; the store's figure for its couriers. */
const TRANSIT_DAYS = { from: 3, to: 7 };

/**
 * The delivery policy: part of the terms of service, which summarise it.
 * Everything here that comes from Settings (the charge, the dispatch time)
 * reads the same on the product pages and in the cart, so the three can't
 * disagree. Google's merchant checks look for exactly this page: where we
 * deliver, what it costs, how long it takes, and what happens when it goes
 * wrong.
 */
export default async function DeliveryPage() {
  const settings = await getStoreSettings();
  const fee = deliveryFeePaise(settings);
  const couriers = Object.values(CARRIERS).map((carrier) => carrier.name);

  const promises = [
    { figure: fee ? formatPaise(fee) : "Free", detail: fee ? "per order, across India" : "delivery across India, on every order" },
    { figure: `${TRANSIT_DAYS.from}–${TRANSIT_DAYS.to} days`, detail: "from dispatch to your door, depending on your pincode" },
    { figure: "Tracked", detail: "every parcel, with the courier’s tracking number in your email" },
  ];

  const sections: LegalSection[] = [
    {
      id: "where",
      title: "Where we deliver",
      body: (
        <p>
          We deliver within India only, to every pincode our couriers serve. We do not ship outside India, and we
          do not offer cash on delivery.
        </p>
      ),
    },
    {
      id: "cost",
      title: "What it costs",
      body: (
        <p>
          {fee
            ? `Delivery costs ${formatPaise(fee)} per order, however many items it holds. The charge is shown in your cart and at checkout before you pay.`
            : "Delivery is free across India, on every order and every item. The price you see on the product page is the price you pay, including GST."}
        </p>
      ),
    },
    {
      id: "when",
      title: "When your order ships",
      body: (
        <>
          <p>
            {settings.dispatchTime
              ? `Orders ship from our shop in Delhi: ${settings.dispatchTime.replace(/\.$/, "")}.`
              : "Orders ship from our shop in Delhi."}{" "}
            A bat built to order, with your choice of weight, profile, engraving or knocking in, is made for you
            before it ships.
          </p>
          <p>
            Once the courier has picked up your parcel, it usually arrives within {TRANSIT_DAYS.from} to{" "}
            {TRANSIT_DAYS.to} days. Metro cities are at the quicker end; remote pincodes can take longer, and
            couriers can be delayed by weather, strikes and other events outside our control.
          </p>
        </>
      ),
    },
    {
      id: "tracking",
      title: "Tracking your parcel",
      body: (
        <>
          <p>
            We ship with trusted couriers such as {couriers.join(" and ")}. When your order ships, we email you
            the courier’s name and tracking number, and both appear on your order page.
          </p>
          <p>
            You can follow the parcel on our <Link href="/track-order">track order</Link> page or on the courier’s
            own site. Signed-in customers see every order under <Link href="/account">your account</Link>.
          </p>
        </>
      ),
    },
    {
      id: "problems",
      title: "If something goes wrong",
      body: (
        <ul>
          <li>
            <strong>Damaged in transit.</strong> Check the parcel when it arrives. If it is damaged, tell us within
            48 hours with photos of the item and its packaging; we collect it at our cost and replace it or refund
            you in full (see <Link href="/returns">returns and refunds</Link>).
          </li>
          <li>
            <strong>Wrong address, or nobody to accept it.</strong> Please check your delivery address and mobile
            number before you pay. If a parcel comes back to us because the address was wrong or it could not be
            delivered, we refund the order minus any extra shipping costs, or send it again once you have paid for
            the new delivery.
          </li>
          <li>
            <strong>Late or missing.</strong> If the tracking has not moved for several days, contact us with your
            order number and we will chase the courier for you.
          </li>
        </ul>
      ),
    },
    {
      id: "contact",
      title: "Contact us",
      body: (
        <>
          <p>For anything about a delivery, contact us with your order number (it looks like AST-10019).</p>
          <StoreDetails settings={settings} />
          <p>
            This policy is part of our <Link href="/terms">terms of service</Link>.
          </p>
        </>
      ),
    },
  ];

  return (
    <LegalPage
      eyebrow="Support"
      title="Delivery"
      updated={UPDATED}
      intro={
        <>
          <p>Where we deliver, what it costs, how long it takes, and how to follow your parcel.</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {promises.map((promise) => (
              <li key={promise.figure} className="flex flex-col gap-1 rounded-md bg-surface-sunken p-4">
                <span className="type-heading-md">{promise.figure}</span>
                <span className="type-body-sm text-ink-muted">{promise.detail}</span>
              </li>
            ))}
          </ul>
        </>
      }
      sections={sections}
    />
  );
}
