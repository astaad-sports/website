import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, StoreDetails, type LegalSection } from "@/components/storefront/legal-page";
import { getStoreSettings } from "@/lib/settings/store";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What personal data Astaad Sports collects, why, who it is shared with, and your rights.",
};

const UPDATED = "24 September 2026";

/**
 * Privacy policy. Describes what the site actually does: Firebase sign-in,
 * orders in our database, Razorpay payments, courier hand-off, one sign-in
 * cookie and a cart in local storage, with no analytics or advertising.
 * Update it when any of that changes.
 */
export default async function PrivacyPage() {
  const settings = await getStoreSettings();
  const store = settings.storeName;

  const sections: LegalSection[] = [
    {
      id: "who-we-are",
      title: "Who we are",
      body: (
        <p>
          {store} runs this website and decides how your personal data is used, which makes us responsible for
          it under India’s Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000.
          Our contact details are at the <a href="#contact">end of this policy</a>.
        </p>
      ),
    },
    {
      id: "what-we-collect",
      title: "What we collect",
      body: (
        <ul>
          <li>
            <strong>Your account:</strong> your name, email address and, if you sign in with Google, your profile
            photo. Google Firebase handles sign-in for us, so we never see or store your password.
          </li>
          <li>
            <strong>Your orders:</strong> the name, mobile number and delivery address you enter at checkout,
            your email address, what you bought (including any name you asked us to engrave), prices, coupons
            and the order’s delivery status.
          </li>
          <li>
            <strong>Payments:</strong> the payment and order references Razorpay gives us, and whether the
            payment succeeded. Your card, UPI and bank details go straight to Razorpay; we never see them.
          </li>
          <li>
            <strong>Messages:</strong> whatever you tell us when you contact us.
          </li>
          <li>
            <strong>Technical data:</strong> our hosting provider keeps short-lived logs of visits, such as IP
            address, browser and pages requested, to run the website and keep it secure.
          </li>
        </ul>
      ),
    },
    {
      id: "how-we-use-it",
      title: "How we use it",
      body: (
        <>
          <p>We use your data only to:</p>
          <ul>
            <li>take payment for, prepare, engrave and deliver your orders;</li>
            <li>show your orders and their tracking in your account;</li>
            <li>answer your questions and handle returns, refunds and complaints;</li>
            <li>prevent fraud and keep the website and your account secure;</li>
            <li>keep the invoices and records that GST and other laws require.</li>
          </ul>
          <p>
            We do not sell your data, show you advertising, or use analytics or tracking tools. We will only send
            you marketing messages if you ask us to.
          </p>
        </>
      ),
    },
    {
      id: "sharing",
      title: "Who we share it with",
      body: (
        <>
          <p>We share only what each service needs to do its job for us:</p>
          <ul>
            <li>
              <strong>Razorpay</strong> processes payments, and receives your name, email address, mobile number
              and the order amount.
            </li>
            <li>
              <strong>Couriers</strong> such as Trackon Couriers and Delhivery receive your name, mobile number
              and delivery address to deliver your parcel.
            </li>
            <li>
              <strong>Google Firebase</strong> manages sign-in and your login details.
            </li>
            <li>
              <strong>Neon</strong> hosts our database, and <strong>Vercel</strong> hosts the website.
            </li>
            <li>
              <strong>Government authorities,</strong> such as tax or law enforcement authorities, when the law
              requires it.
            </li>
          </ul>
          <p>
            Some of these services store data outside India, for example in Singapore or the United States. We
            use established providers that protect data to recognised security standards.
          </p>
        </>
      ),
    },
    {
      id: "cookies",
      title: "Cookies and your browser",
      body: (
        <>
          <p>We use one cookie, and only to keep you signed in:</p>
          <ul>
            <li>
              <strong>astaad_session</strong> is set when you sign in and lasts up to 14 days, or until you sign
              out.
            </li>
          </ul>
          <p>
            Your cart and any coupon you enter are saved in your browser’s local storage, on your device only,
            until you check out. Google’s sign-in window and Razorpay’s payment window may set their own cookies
            under their own privacy policies, for example to prevent fraud. When the home page shows our
            Instagram posts through Instagram’s own embed, Instagram may set cookies too, under Meta’s privacy
            policy. We use no advertising or analytics cookies.
          </p>
        </>
      ),
    },
    {
      id: "retention",
      title: "How long we keep it",
      body: (
        <ul>
          <li>Your account, until you ask us to delete it.</li>
          <li>
            Orders, invoices and payment records, for as long as tax and accounting laws require. For GST, that
            is six years from the due date of the annual return for the year of the order.
          </li>
          <li>Messages, for as long as we need them to resolve your request.</li>
        </ul>
      ),
    },
    {
      id: "your-rights",
      title: "Your rights",
      body: (
        <>
          <p>You can ask us to:</p>
          <ul>
            <li>tell you what personal data we hold about you and who we have shared it with;</li>
            <li>correct, complete or update it;</li>
            <li>delete your account and data, except records the law requires us to keep;</li>
            <li>withdraw your consent, which stops future use (though we then cannot take new orders from you);</li>
            <li>let someone you nominate act for you if you die or cannot act yourself.</li>
          </ul>
          <p>
            Contact us from the email address on your account, or with your order number, so we can confirm it
            is you. We will reply within 30 days. If you are not satisfied with our reply, you can complain to the
            Data Protection Board of India.
          </p>
        </>
      ),
    },
    {
      id: "security",
      title: "Security",
      body: (
        <p>
          The website uses encrypted connections (HTTPS), passwords are handled by Google Firebase, payments by
          Razorpay, and only the store’s staff can see order details. No system is completely secure. If a
          breach affects your data, we will tell you and the authorities as the law requires.
        </p>
      ),
    },
    {
      id: "children",
      title: "Children",
      body: (
        <p>
          Our website is for adults. If you are under 18, a parent or guardian must place orders for you. We do
          not knowingly collect children’s data without a parent’s or guardian’s consent.
        </p>
      ),
    },
    {
      id: "changes",
      title: "Changes to this policy",
      body: (
        <p>
          We will update this policy when we change how we use personal data, and the date at the top shows the
          latest version. For significant changes, we will also tell you by email or on the website.
        </p>
      ),
    },
    {
      id: "contact",
      title: "Contact and grievances",
      body: (
        <>
          <p>
            For privacy questions, requests or complaints, contact us using the details below. Our grievance
            officer is the owner of {store}.
          </p>
          <StoreDetails settings={settings} />
          <p>
            Buying from us is also covered by our <Link href="/terms">terms of service</Link>.
          </p>
        </>
      ),
    },
  ];

  return (
    <LegalPage
      title="Privacy policy"
      updated={UPDATED}
      intro={
        <p>
          What personal data {store} collects when you shop with us, why we need it, who we share it with, and
          how you can see, change or delete it.
        </p>
      }
      sections={sections}
    />
  );
}
