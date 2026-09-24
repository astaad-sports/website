import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, StoreDetails, type LegalSection } from "@/components/storefront/legal-page";
import { formatPaise } from "@/lib/format";
import { deliveryFeePaise } from "@/lib/settings/model";
import { getStoreSettings } from "@/lib/settings/store";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms for buying from Astaad Sports: orders, payment, delivery, custom bats, returns and refunds.",
};

const UPDATED = "24 September 2026";

/**
 * Terms of service. The full returns policy is its own page (/returns);
 * this summarises it. Store details, the delivery charge and the dispatch
 * time come from Settings.
 */
export default async function TermsPage() {
  const settings = await getStoreSettings();
  const store = settings.storeName;
  const fee = deliveryFeePaise(settings);

  const sections: LegalSection[] = [
    {
      id: "about",
      title: "About these terms",
      body: (
        <>
          <p>
            This website is run by {store}, a business registered in India
            {settings.gstin ? ` under GSTIN ${settings.gstin}` : ""}. In these terms, “we”, “us” and “our”
            mean {store}, and “you” means the person using the website or placing an order.
          </p>
          <p>
            By using this website or placing an order, you agree to these terms and to our{" "}
            <Link href="/privacy">privacy policy</Link>. If you do not agree, please do not use the website.
          </p>
        </>
      ),
    },
    {
      id: "account",
      title: "Your account",
      body: (
        <>
          <p>
            You need an account to place an order. You can sign in with Google or with an email address and
            password. Please give us accurate details and keep your password to yourself: you are responsible
            for orders placed from your account.
          </p>
          <p>
            You must be 18 or older to place an order. If you are younger, a parent or guardian must place the
            order for you.
          </p>
          <p>We may suspend an account that is used for fraud or to misuse the website.</p>
        </>
      ),
    },
    {
      id: "products",
      title: "Products and prices",
      body: (
        <>
          <p>
            We describe and photograph our products as accurately as we can. Willow is a natural material, so
            the grain, colour and markings of your bat will differ a little from the photos, and its weight
            will fall within the range you chose.
          </p>
          <ul>
            <li>Prices are in Indian rupees and include GST.</li>
            <li>
              Offers lower prices automatically for a limited time. Only the best offer applies to an item, and
              you can use one coupon per order.
            </li>
            <li>We can change prices or end offers at any time. This does not affect orders already paid for.</li>
            <li>
              If a product was listed at a clearly wrong price, we may cancel the order and refund you in full.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "custom-bats",
      title: "Custom bats",
      body: (
        <>
          <p>
            Some bats can be built to your choice of weight, profile and handle, with free name engraving and
            free knocking in.
          </p>
          <ul>
            <li>
              We engrave your text exactly as it appears in your cart: capital letters, numbers and spaces, up to
              15 characters. Please check it before you pay.
            </li>
            <li>
              We may refuse engraving that is offensive or uses someone else’s trademark. If we do, we will
              contact you before going ahead, or cancel the order and refund you in full.
            </li>
            <li>
              An engraved bat is made for you alone, so it can only be returned if it arrives damaged, has a
              defect, or is not what you ordered (see our <Link href="/returns">returns policy</Link>).
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "orders",
      title: "Orders and payment",
      body: (
        <>
          <p>
            Payments are handled by Razorpay. You can pay by UPI, card or net banking. We do not offer cash on
            delivery. Your card, UPI and bank details go straight to Razorpay; we never see or store them.
          </p>
          <p>
            Your order is confirmed once your payment succeeds, and it then appears in your account. If money
            left your account but you have no order, contact us with the Razorpay payment ID and we will sort it
            out.
          </p>
          <p>
            We may cancel an order and refund you in full if the item has sold out, the price was clearly
            wrong, we cannot deliver to your address, or we suspect fraud.
          </p>
        </>
      ),
    },
    {
      id: "delivery",
      title: "Delivery",
      body: (
        <>
          <p>
            We deliver within India only.{" "}
            {fee
              ? `Delivery costs ${formatPaise(fee)} per order, shown in your cart before you pay.`
              : "Delivery is free across India."}
            {settings.dispatchTime ? ` Current dispatch time: ${settings.dispatchTime}.` : ""}
          </p>
          <p>
            We ship with trusted couriers such as Trackon Couriers and Delhivery. Once your order ships, your
            account shows the courier and tracking number. Delivery times depend on your pincode, and couriers
            can be delayed by events outside our control.
          </p>
          <p>
            Please check that your delivery address and mobile number are correct. If a parcel is returned to us
            because the address was wrong or nobody accepted it, we will refund the order minus any extra
            shipping costs, or send it again once you have paid for the new delivery.
          </p>
        </>
      ),
    },
    {
      id: "returns",
      title: "Cancellations, returns and refunds",
      body: (
        <>
          <p>
            Our <Link href="/returns">returns policy</Link> is part of these terms. In short:
          </p>
          <ul>
            <li>You can cancel an order until we pack it, for a full refund.</li>
            <li>
              You can return most items within 7 days of delivery if they are unused and in their original
              condition.
            </li>
            <li>
              Damaged, defective or wrong items are replaced or refunded in full, and we cover the cost of
              sending them back.
            </li>
            <li>Engraved bats can only be returned if they are damaged, defective or wrong.</li>
            <li>Refunds go back to the payment method you used, within 7 working days.</li>
          </ul>
        </>
      ),
    },
    {
      id: "wear",
      title: "Bat care and normal wear",
      body: (
        <p>
          A cricket bat is made from natural willow and is shaped by use. Surface cracks, marks on the face and
          edges, and changes in colour from play are normal wear, not defects. A new bat needs knocking in
          before it faces a hard ball (we do it for free if you choose it), and care while you use it. A
          fault in how a bat was made is a defect, and is covered by our{" "}
          <Link href="/returns">returns policy</Link>.
        </p>
      ),
    },
    {
      id: "use",
      title: "Using this website",
      body: (
        <>
          <p>
            The Astaad name, the lion crest, and the photos, text and designs on this website belong to us. You
            may not copy or reuse them without our written permission.
          </p>
          <p>
            Please do not misuse the website: for example, by trying to break into accounts or systems, copying
            it with automated tools, or placing fraudulent orders.
          </p>
        </>
      ),
    },
    {
      id: "liability",
      title: "Our responsibility to you",
      body: (
        <>
          <p>
            As far as the law allows, our total responsibility for any order is limited to the amount you paid
            for it, and we are not responsible for indirect losses, such as lost matches or earnings.
          </p>
          <p>Nothing in these terms takes away your rights under the Consumer Protection Act, 2019.</p>
        </>
      ),
    },
    {
      id: "law",
      title: "Law and disputes",
      body: (
        <p>
          These terms are governed by the laws of India. If we cannot settle a dispute together, it will be
          decided by the courts in Delhi.
        </p>
      ),
    },
    {
      id: "changes",
      title: "Changes to these terms",
      body: (
        <p>
          We may update these terms from time to time, and the date at the top of this page shows the latest
          version. Each order is covered by the terms in force when you placed it.
        </p>
      ),
    },
    {
      id: "contact",
      title: "Contact and complaints",
      body: (
        <>
          <p>
            For questions, returns or complaints, contact us using the details below. Our grievance officer is
            the owner of {store}. We will acknowledge a complaint within 48 hours and resolve it within one month.
          </p>
          <StoreDetails settings={settings} />
        </>
      ),
    },
  ];

  return (
    <LegalPage
      title="Terms of service"
      updated={UPDATED}
      intro={
        <p>
          The terms for buying cricket gear from {store}: your account, orders and payment, delivery, custom
          bats, and returns and refunds.
        </p>
      }
      sections={sections}
    />
  );
}
