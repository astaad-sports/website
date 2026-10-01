import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, StoreDetails, type LegalSection } from "@/components/storefront/legal-page";
import { pageMetadata } from "@/lib/seo/metadata";
import { getStoreSettings } from "@/lib/settings/store";

export const metadata: Metadata = pageMetadata({
  title: "Warranty",
  description: "What the Astaad Sports warranty covers on bats and gear, for how long, and how to make a claim.",
  path: "/warranty",
});

const UPDATED = "28 September 2026";

/** The warranty in brief, at the top of the page. */
const PROMISES = [
  { figure: "3 months", detail: "on bats, if the handle comes loose or a fault in the willow breaks the blade" },
  { figure: "30 days", detail: "on pads, gloves, helmets and kitbags, for faults in how they were made" },
  { figure: "Free", detail: "repair or replacement, sent back to you at our cost" },
];

/**
 * The warranty, part of the terms of service. It covers faults that show up
 * after the returns policy's 7 days; faults found on delivery are returns.
 */
export default async function WarrantyPage() {
  const settings = await getStoreSettings();

  const sections: LegalSection[] = [
    {
      id: "bats",
      title: "Bats",
      body: (
        <>
          <p>
            Every Astaad bat, English willow, Kashmir willow or tennis, is covered for 3 months from the day it
            is delivered against faults in how it was made:
          </p>
          <ul>
            <li>
              <strong>Handle.</strong> The handle comes loose in the blade, or breaks, and the shoulders of the
              blade are not broken.
            </li>
            <li>
              <strong>Blade.</strong> The blade breaks through because of a hidden fault in the willow, not a
              mishit. We inspect the bat to tell the two apart.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "gear",
      title: "Pads, gloves, helmets and kitbags",
      body: (
        <>
          <p>
            Our gear is covered for 30 days from delivery against faults in its materials or in how it was made:
            for example, stitching that comes apart, or a strap, buckle or zip that fails.
          </p>
          <p>
            A helmet that has taken a hard blow can be weakened even when it looks fine. Replace it rather than
            playing on, whether or not the warranty covers it.
          </p>
        </>
      ),
    },
    {
      id: "not-covered",
      title: "What the warranty doesn’t cover",
      body: (
        <>
          <p>The warranty covers faults in how an item was made, not damage from how it was used. It doesn’t cover:</p>
          <ul>
            <li>
              cracks on the face, edges or toe that don’t go through the blade. Willow cracks as it is played, and
              that is <Link href="/terms#wear">normal wear</Link>;
            </li>
            <li>mishits: a ball off the edge or the splice, or a yorker jammed into the toe;</li>
            <li>a bat that faced a hard ball before it was knocked in (we knock in for free if you choose it);</li>
            <li>
              balls a bat isn’t made for: bowling machine balls, synthetic or rubber hard balls, or a leather ball on
              a tennis bat;
            </li>
            <li>damp and heat: a bat played in the wet, left out in the rain, or left in a hot car;</li>
            <li>changes made to an item, such as fitting a new handle or reshaping the blade;</li>
            <li>accidents, rough handling, and wear from use, such as scuffs, faded colours and worn printing;</li>
            <li>
              how a bat feels: its pickup, ping or grain, or its weight within the range you chose. Willow is
              natural, so no two bats are the same.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "claim",
      title: "How to make a claim",
      body: (
        <>
          <ol>
            <li>
              Contact us within the warranty period with your order number (it looks like AST-10019, and is in{" "}
              <Link href="/account">your account</Link>), or your bill from our shop, and tell us what happened.
            </li>
            <li>Send clear photos or a short video of the fault, showing the whole item and the damage up close.</li>
            <li>If we need to see the item, we ask you to send it to us, well packed, or bring it to our shop.</li>
            <li>We inspect it and tell you what we found, usually within 7 working days of it reaching us.</li>
          </ol>
          <p>
            You send the item to us at your own cost. If the fault is covered, we send the repaired or replacement
            item back free. If it isn’t, we explain why and send the item back at your cost, or you can collect it
            from our shop.
          </p>
        </>
      ),
    },
    {
      id: "repair-or-replace",
      title: "Repair or replacement",
      body: (
        <>
          <p>
            If the fault is covered, we repair the item or replace it with the same model, free. We decide which,
            depending on the fault. If that model is no longer made, we replace it with the nearest one at the same
            price.
          </p>
          <ul>
            <li>
              A replacement bat matches the weight range, profile and handle you chose, and we engrave it again for
              free if yours was engraved.
            </li>
            <li>A repaired or replacement item is covered for the rest of the original warranty, not a new one.</li>
            <li>Each item can be repaired or replaced once under the warranty.</li>
          </ul>
        </>
      ),
    },
    {
      id: "your-rights",
      title: "Faults on delivery, and your rights",
      body: (
        <>
          <p>
            If an item arrives damaged, defective or wrong, tell us within 7 days of delivery. Our{" "}
            <Link href="/returns">returns policy</Link> covers it, including the cost of sending it back, and you
            can choose a refund.
          </p>
          <p>
            This warranty is in addition to your rights under the Consumer Protection Act, 2019, and doesn’t take
            anything away from them.
          </p>
        </>
      ),
    },
    {
      id: "contact",
      title: "Contact us",
      body: (
        <>
          <p>To make a claim or ask about the warranty, contact us using the details below.</p>
          <StoreDetails settings={settings} />
          <p>
            This warranty is part of our <Link href="/terms">terms of service</Link>.
          </p>
        </>
      ),
    },
  ];

  return (
    <LegalPage
      eyebrow="Support"
      title="Warranty"
      updated={UPDATED}
      intro={
        <>
          <p>
            Every Astaad bat and piece of gear is covered against faults in how it was made. Here is what is
            covered, for how long, and how to claim.
          </p>
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
