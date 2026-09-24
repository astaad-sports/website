import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, StoreDetails, type LegalSection } from "@/components/storefront/legal-page";
import { getStoreSettings } from "@/lib/settings/store";

export const metadata: Metadata = {
  title: "Returns and refunds",
  description: "How to return an Astaad Sports order, what can be returned, and when refunds arrive.",
};

const UPDATED = "24 September 2026";

/** The three promises at the top of the page. */
const PROMISES = [
  { figure: "7 days", detail: "to return unused items in their original condition" },
  { figure: "Free", detail: "returns and full refunds for damaged, defective or wrong items" },
  { figure: "7 working days", detail: "to refund you once your return reaches us" },
];

/**
 * The returns policy, part of the terms of service (which summarise it).
 * Keeps the storefront's "Easy returns within 7 days" promise; only
 * engraved bats are excluded, unless damaged, defective or wrong.
 */
export default async function ReturnsPage() {
  const settings = await getStoreSettings();

  const sections: LegalSection[] = [
    {
      id: "how-to-return",
      title: "How to start a return",
      body: (
        <ol>
          <li>
            Contact us within 7 days of delivery with your order number (it looks like AST-10019, and is in{" "}
            <Link href="/account">your account</Link>) and what you would like to return. For damage or a defect,
            send photos of the item and its packaging.
          </li>
          <li>We confirm the return and tell you how to send the item back.</li>
          <li>Pack the item in its original packaging, with any cover, stickers and tags.</li>
          <li>Once it reaches us and we have checked it, we send your refund or replacement.</li>
        </ol>
      ),
    },
    {
      id: "damaged",
      title: "Damaged, defective or wrong items",
      body: (
        <>
          <p>
            If your order arrives damaged, has a manufacturing defect, or is not what you ordered, tell us within 7
            days of delivery. For damage in transit, please tell us within 48 hours.
          </p>
          <p>
            We arrange the return at our cost and send you a replacement, or refund you in full, including any
            delivery charge. This applies to every item, including engraved bats.
          </p>
        </>
      ),
    },
    {
      id: "change-of-mind",
      title: "Changed your mind",
      body: (
        <>
          <p>
            You can return most items within 7 days of delivery if they are unused and in their original
            condition. Contact us first and we will give you the return address. You send the item back at your
            own cost, well packed, and we refund the price of the item once it reaches us in its original
            condition.
          </p>
          <p>
            Want a different size or weight? Return the item this way and place a new order, so you don’t have to
            wait for the return to reach us.
          </p>
        </>
      ),
    },
    {
      id: "not-returnable",
      title: "What can’t be returned",
      body: (
        <>
          <p>Unless it arrived damaged, defective or wrong, we can’t take back:</p>
          <ul>
            <li>an engraved bat, because it is made for you alone;</li>
            <li>an item that has been used, played with, oiled or knocked in by you;</li>
            <li>an item without its original packaging, cover, stickers or tags.</li>
          </ul>
          <p>
            Knocking in done by us doesn’t stop a bat being returned. Cracks and marks from play are{" "}
            <Link href="/terms#wear">normal wear</Link>, not defects.
          </p>
        </>
      ),
    },
    {
      id: "refunds",
      title: "Refunds",
      body: (
        <p>
          Refunds go back to the payment method you used (UPI, card or net banking), within 7 working days of the
          return reaching us or the order being cancelled. Your bank may take a few more working days to show the
          money.
        </p>
      ),
    },
    {
      id: "cancelling",
      title: "Cancelling an order",
      body: (
        <p>
          You can cancel an order until we pack it. Contact us with your order number and we will refund you in
          full. Once an order is packed or shipped, it can’t be cancelled, but you can still return it as above.
        </p>
      ),
    },
    {
      id: "contact",
      title: "Contact us",
      body: (
        <>
          <p>To start a return or ask about a refund, contact us using the details below.</p>
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
      title="Returns and refunds"
      updated={UPDATED}
      intro={
        <>
          <p>Not right? Send it back. Here is how returns, refunds and cancellations work.</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {PROMISES.map((promise) => (
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
