import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import { Crest } from "@/components/astaad";
import { STORE_CATEGORIES } from "@/lib/catalogue";
import { mobileHref } from "@/lib/format";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/instagram/model";
import { getStoreSettings } from "@/lib/settings/store";

import { InstagramGlyph } from "./instagram-glyph";

const SUPPORT_LINKS = [
  { label: "Track Order", href: "/track-order" },
  { label: "Returns", href: "/returns" },
  { label: "Size Guide", href: "/size-guide" },
  { label: "Contact Us", href: "/contact" },
];

const LINK = "text-[15px] leading-[22px] text-on-dark transition-colors hover:text-on-dark-muted";

function FooterNav({
  label,
  links,
}: {
  label: string;
  links: { label: string; href: string }[];
}) {
  return (
    <nav aria-label={label} className="flex flex-col gap-3">
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
 * The near-black footer: crest and blurb, Shop and Support columns (with the
 * store's contact details), and the legal line with the store's name and GSTIN.
 */
export async function SiteFooter() {
  const settings = await getStoreSettings();
  // "Astaad Sports Pvt. Ltd." would otherwise end the sentence with two full stops.
  const holder = settings.storeName.replace(/\.+$/, "");

  return (
    <footer className="bg-surface-dark-sunken text-on-dark">
      <div className="site-shell flex flex-col gap-8 pt-14 pb-8">
        <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr]">
          <div className="flex flex-col items-start gap-4">
            <Crest size={56} />
            <p className="max-w-[360px] text-[15px] leading-[22px] text-on-dark-subtle">
              Astaad Sports makes premium cricket equipment for players who never
              settle. Designed, built and sold by Astaad, across India.
            </p>
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
          </div>
          <FooterNav
            label="Shop"
            links={STORE_CATEGORIES.map((category) => ({
              label: category.name,
              href: category.href,
            }))}
          />
          <div className="flex flex-col gap-5">
            <FooterNav label="Support" links={SUPPORT_LINKS} />
            <FooterContact
              email={settings.supportEmail}
              phone={settings.supportPhone}
              address={settings.storeAddress}
            />
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-border-dark pt-6 text-[13px] leading-[18px] text-on-dark-subtle sm:flex-row sm:items-center sm:justify-between">
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              © {new Date().getFullYear()} {holder}. All rights reserved.
            </span>
            {settings.gstin && <span className="tabular-nums">GSTIN {settings.gstin}</span>}
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
    </footer>
  );
}
