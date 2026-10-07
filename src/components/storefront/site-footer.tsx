import Link from "next/link";
import { ChevronDown, ExternalLink, Lock, Mail, MapPin, Phone } from "lucide-react";

import { CustomerReviewsBadge } from "@/components/analytics/customer-reviews-badge";
import { Crest } from "@/components/astaad";
import { STORE_CATEGORIES } from "@/lib/catalogue";
import { MERCHANT_ID } from "@/lib/customer-reviews";
import { mobileHref } from "@/lib/format";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/instagram/model";
import { getStoreSettings } from "@/lib/settings/store";
import { MAP_EMBED_URL, mapsPlaceUrl } from "@/lib/store-location";
import { cn } from "@/lib/utils";

import { InstagramGlyph } from "./instagram-glyph";
import { WhatsAppButton } from "./whatsapp-button";

const SUPPORT_LINKS = [
  { label: "About Astaad", href: "/about" },
  { label: "Track Order", href: "/track-order" },
  { label: "Delivery", href: "/delivery" },
  { label: "Returns", href: "/returns" },
  { label: "Warranty", href: "/warranty" },
  { label: "Size Guide", href: "/size-guide" },
  { label: "Reviews", href: "/reviews" },
  { label: "Contact Us", href: "/contact" },
];

const LINK = "text-[15px] leading-[22px] text-on-dark transition-colors hover:text-on-dark-muted";

interface FooterLinks {
  label: string;
  links: { label: string; href: string }[];
}

function FooterNav({ label, links, className }: FooterLinks & { className?: string }) {
  return (
    <nav aria-label={label} className={cn("flex flex-col gap-3", className)}>
      <span className="text-xs leading-4 font-semibold tracking-[0.2em] text-on-dark-subtle uppercase">
        {label}
      </span>
      {links.map((link) => (
        <Link key={link.href} href={link.href} className={LINK}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

/** Phones: each group of links folds away under its heading. */
function FooterFolds({ groups, className }: { groups: FooterLinks[]; className?: string }) {
  return (
    <div className={cn("border-t border-border-dark", className)}>
      {groups.map((group) => (
        <details key={group.label} className="group border-b border-border-dark">
          <summary className="flex h-14 cursor-pointer list-none items-center justify-between text-xs leading-4 font-semibold tracking-[0.2em] text-on-dark uppercase [&::-webkit-details-marker]:hidden">
            {group.label}
            <ChevronDown
              className="size-[18px] text-on-dark-subtle transition-transform group-open:rotate-180"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </summary>
          <nav aria-label={group.label} className="flex flex-col gap-3.5 pb-5">
            {group.links.map((link) => (
              <Link key={link.href} href={link.href} className={LINK}>
                {link.label}
              </Link>
            ))}
          </nav>
        </details>
      ))}
    </div>
  );
}

/** The support email, phone and shop address from Settings, under the Support links. Nothing when none is set. */
function FooterContact({
  email,
  phone,
  address,
}: {
  email: string | null;
  phone: string | null;
  address: string | null;
}) {
  if (!email && !phone && !address) return null;
  return (
    <address className="flex flex-col gap-3 not-italic">
      {email && (
        <a href={`mailto:${email}`} className={`${LINK} inline-flex items-center gap-2 break-all`}>
          <Mail className="size-4 shrink-0 text-on-dark-subtle" strokeWidth={1.5} aria-hidden="true" />
          {email}
        </a>
      )}
      {phone && (
        <a href={mobileHref(phone)} className={`${LINK} inline-flex items-center gap-2 tabular-nums`}>
          <Phone className="size-4 shrink-0 text-on-dark-subtle" strokeWidth={1.5} aria-hidden="true" />
          {phone}
        </a>
      )}
      {address && (
        <span className="flex max-w-[280px] items-start gap-2 text-[15px] leading-[22px] text-on-dark">
          <MapPin className="mt-[3px] size-4 shrink-0 text-on-dark-subtle" strokeWidth={1.5} aria-hidden="true" />
          {address}
        </span>
      )}
    </address>
  );
}

/**
 * A small Google map of the shop under the address, with a link that opens
 * the listing in Google Maps for directions. The map is Google's own embed
 * (no API key) and loads only once the footer scrolls into view, so pages
 * stay as quick as before for anyone who never reaches it. At this size
 * Google leaves its own marker out, so the pin is drawn here: the embed is
 * centred on the shop, so the pin's tip sits on the map's centre.
 */
function FooterMap({ address }: { address: string | null }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-40 w-full max-w-[320px] overflow-hidden rounded-md border border-border-dark bg-surface-dark-raised">
        <iframe
          src={MAP_EMBED_URL}
          title="Map of the Astaad Sports shop in Pitampura, Delhi"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          className="size-full"
        />
        <MapPin
          className="pointer-events-none absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-full text-brand-yellow [&_circle]:fill-surface-dark"
          fill="currentColor"
          stroke="var(--color-surface-dark, #0e0e0e)"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </div>
      <a
        href={mapsPlaceUrl(address)}
        target="_blank"
        rel="noopener noreferrer"
        className={`${LINK} inline-flex items-center gap-1.5 text-[13px] leading-[18px]`}
      >
        Open in Google Maps
        <ExternalLink className="size-3.5 shrink-0 text-on-dark-subtle" strokeWidth={1.5} aria-hidden="true" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </div>
  );
}

/**
 * The near-black footer: crest and blurb, Shop and Support columns (with the
 * store's contact details and a map of the shop), and the legal line with the
 * store's name, GSTIN and the ways to pay.
 * On phones the two columns fold away under their headings. Under the crest
 * is Google's Customer Reviews badge, once Google has a rating to show. It
 * also carries the WhatsApp button pinned to the corner of every page that
 * has a footer.
 */
export async function SiteFooter() {
  const settings = await getStoreSettings();
  // "Astaad Sports Pvt. Ltd." would otherwise end the sentence with two full stops.
  const holder = settings.storeName.replace(/\.+$/, "");
  const shop: FooterLinks = {
    label: "Shop",
    links: STORE_CATEGORIES.map((category) => ({ label: category.name, href: category.href })),
  };
  const support: FooterLinks = { label: "Support", links: SUPPORT_LINKS };

  return (
    <footer className="bg-surface-dark-sunken text-on-dark">
      <div className="site-shell flex flex-col gap-8 pt-10 pb-8 md:pt-14">
        <div className="grid gap-6 md:grid-cols-[2fr_1fr_1fr] md:gap-10">
          {/* min-w-0: a badge wider than a phone is clipped, not left to widen the page. */}
          <div className="flex min-w-0 flex-col items-start gap-4">
            <Crest size={56} />
            <p className="max-w-[360px] text-[15px] leading-[22px] text-on-dark-subtle">
              Astaad Sports makes premium cricket equipment for players who never
              settle. Designed, built and sold by Astaad, across India.
            </p>
            {/* One item of the column, so the badge adds no gap until Google shows it. */}
            <div className="flex max-w-full flex-col items-start">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${LINK} inline-flex items-center gap-2`}
              >
                <InstagramGlyph className="size-4 shrink-0 text-on-dark-subtle" />
                @{INSTAGRAM_HANDLE}
                <span className="sr-only"> on Instagram</span>
              </a>
              <CustomerReviewsBadge merchantId={MERCHANT_ID} className="mt-4" />
            </div>
          </div>
          <FooterNav {...shop} className="hidden md:flex" />
          <div className="flex flex-col gap-5">
            <FooterNav {...support} className="hidden md:flex" />
            <FooterFolds groups={[shop, support]} className="md:hidden" />
            <FooterContact
              email={settings.supportEmail}
              phone={settings.supportPhone}
              address={settings.storeAddress}
            />
            <FooterMap address={settings.storeAddress} />
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-border-dark pt-6 text-[13px] leading-[18px] text-on-dark-subtle sm:flex-row sm:items-center sm:justify-between">
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              © {new Date().getFullYear()} {holder}. All rights reserved.
            </span>
            {settings.gstin && <span className="tabular-nums">GSTIN {settings.gstin}</span>}
            {/* The ways to pay, where Google's merchant checks look for them. */}
            <span className="inline-flex items-center gap-1.5">
              <Lock className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
              Secure payments by Razorpay: UPI, cards and net banking
            </span>
          </span>
          <span className="inline-flex gap-6">
            <Link href="/privacy" className="transition-colors hover:text-on-dark">
              Privacy policy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-on-dark">
              Terms of service
            </Link>
          </span>
        </div>
      </div>
      <WhatsAppButton phone={settings.supportPhone} />
    </footer>
  );
}
