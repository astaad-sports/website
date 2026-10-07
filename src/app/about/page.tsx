import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Eyebrow } from "@/components/storefront/eyebrow";
import { InstagramGlyph } from "@/components/storefront/instagram-glyph";
import { StoreDetails } from "@/components/storefront/legal-page";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { HOME_TRUST, TrustStrip } from "@/components/storefront/trust-strip";
import { STORE_CATEGORIES } from "@/lib/catalogue";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/instagram/model";
import { deliveryPromise } from "@/components/storefront/delivery";
import { pageMetadata } from "@/lib/seo/metadata";
import { deliveryFeePaise } from "@/lib/settings/model";
import { getStoreSettings } from "@/lib/settings/store";
import { siteImage } from "@/lib/site-images";

export const metadata: Metadata = pageMetadata({
  title: "About Astaad Sports",
  description:
    "Astaad Sports designs and builds cricket bats and gear in Delhi and sells them directly to players across India. Who we are, what we make, and how to reach us.",
  path: "/about",
});

const WORKSHOP = siteImage("home/bats-in-the-workshop");
const WORKBENCH = siteImage("craft/bat-on-the-workbench");

/**
 * How a bat is made, in the words of the home page's "From cleft to crease"
 * row (src/components/storefront/craft.tsx), so the two never disagree.
 */
const CRAFT = [
  "English willow clefts are air-dried and graded before a blade is cut.",
  "A Singapore cane handle with three rubber inserts is spliced deep into the shoulders of the blade.",
  "A drawknife takes each blade to its profile; the face and edges are planed and sanded smooth.",
  "The handle is turned and finished on the lathe, then the bat is knocked in, gripped and stickered.",
];

const LINK = "underline underline-offset-4 transition-colors hover:text-ink-muted";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex flex-col gap-3 scroll-mt-6">
      <h2 id={`${id}-title`} className="type-heading-md">
        {title}
      </h2>
      <div className="type-body flex flex-col gap-3 text-ink [&_li]:pl-1 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

/**
 * Who Astaad Sports is: the brand story the home page starts, the workshop,
 * what the store sells and promises, and the business's name, address and
 * contact details from Settings. Search engines and Google's merchant checks
 * read this page for the business's identity, so it names the business the
 * way the terms and the footer do.
 */
export default async function AboutPage() {
  const settings = await getStoreSettings();
  const categories = STORE_CATEGORIES.filter((category) => category.kind !== "bats");

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-surface">
        <section className="relative overflow-hidden bg-surface-dark text-on-dark">
          <div className="site-shell flex flex-col gap-6 py-12 md:flex-row md:items-center md:justify-between md:gap-12 md:py-16">
            <div className="flex max-w-[560px] flex-col gap-4">
              <Eyebrow bar className="text-on-dark-muted">
                Our story
              </Eyebrow>
              <h1 className="type-display text-[length:min(56px,(100vw_-_32px)/6.65)] leading-[0.88] tracking-[-0.03em] md:text-[72px]">
                More than
                <br />
                equipment<span className="text-brand-yellow">.</span>
              </h1>
              <p className="max-w-[480px] text-[15px] leading-[22px] text-on-dark-subtle md:text-lg md:leading-7">
                Astaad Sports is built for players who expect more from their game. Every piece of kit is made
                by us, tested on the pitch, and sold directly to you.
              </p>
            </div>
            <div className="relative -mx-4 h-[240px] shrink-0 md:mx-0 md:h-[360px] md:w-[480px]">
              <Image
                src={WORKSHOP.src}
                alt="Astaad bats standing among willow clefts in the workshop"
                fill
                priority
                sizes="(min-width: 768px) 480px, 100vw"
                className="object-cover object-[50%_45%]"
              />
            </div>
          </div>
        </section>

        <div className="site-shell grid gap-10 py-12 md:py-16 lg:grid-cols-[minmax(0,720px)_1fr] lg:gap-16">
          <div className="flex flex-col gap-10">
            <Section id="who-we-are" title="Who we are">
              <p>
                {settings.storeName} is a cricket equipment maker and shop in Delhi
                {settings.storeAddress ? `, at ${settings.storeAddress}` : ""}. We design and build our own bats
                and gear and sell them directly: on this website, delivered across India, and over the counter at
                the shop.
              </p>
              <p>
                The business is registered in India
                {settings.gstin ? ` under GSTIN ${settings.gstin}` : ""}. Our <Link href="/terms" className={LINK}>terms of service</Link>,{" "}
                <Link href="/returns" className={LINK}>returns policy</Link> and{" "}
                <Link href="/privacy" className={LINK}>privacy policy</Link> say how we trade.
              </p>
            </Section>

            <Section id="what-we-make" title="What we make">
              <p>
                <Link href="/shop/bats" className={LINK}>Cricket bats</Link> in English willow and Kashmir willow,
                from junior sizes to long handle. Most English willow bats can be built to your choice of weight,
                profile, toe shape and handle, with free name engraving and free knocking in.
              </p>
              <p>And the rest of the kit:</p>
              <ul>
                {categories.map((category) => (
                  <li key={category.slug}>
                    <Link href={category.href} className={LINK}>
                      {category.name}
                    </Link>
                    {" · "}
                    <span className="text-ink-muted">{category.tagline}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="how-a-bat-is-made" title="How a bat is made">
              <p>Every Astaad bat is shaped by hand in our workshop:</p>
              <ul>
                {CRAFT.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
              <p>
                Willow is a natural material, so the grain and colour of your bat will be its own, and its weight
                falls within the range you chose.
              </p>
            </Section>

            <Section id="our-promises" title="Our promises">
              <ul>
                <li>{deliveryPromise(deliveryFeePaise(settings))}, by courier, with tracking (<Link href="/delivery" className={LINK}>delivery</Link>).</li>
                <li>
                  7 days to return unused items, and free returns with a full refund for anything damaged,
                  defective or wrong (<Link href="/returns" className={LINK}>returns and refunds</Link>).
                </li>
                <li>
                  A warranty of 3 months on bats and 30 days on gear against faults in how they were made (
                  <Link href="/warranty" className={LINK}>warranty</Link>).
                </li>
                <li>
                  Secure payment through Razorpay by UPI, card or net banking. Your payment details never reach
                  us.
                </li>
              </ul>
            </Section>

            <Section id="find-us" title="Where to find us">
              <StoreDetails settings={settings} />
              <p>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${LINK} inline-flex items-center gap-2`}
                >
                  <InstagramGlyph className="size-4 shrink-0 text-ink-muted" />@{INSTAGRAM_HANDLE} on Instagram
                </a>
              </p>
              <p>
                Questions about an order, sizing or a custom bat? <Link href="/contact" className={LINK}>Contact us</Link>.
              </p>
            </Section>
          </div>

          <div className="relative hidden aspect-[3/4] overflow-hidden rounded-md lg:block lg:self-start">
            <Image
              src={WORKBENCH.src}
              alt="A finished Astaad bat on the workbench among wood shavings"
              fill
              sizes="(min-width: 1024px) 400px, 0px"
              className="object-cover"
            />
          </div>
        </div>

        <TrustStrip items={HOME_TRUST} />
      </main>
      <SiteFooter />
    </>
  );
}
