import Link from "next/link";

import { Crest } from "@/components/astaad";
import { STORE_CATEGORIES } from "@/lib/catalogue";

const SUPPORT_LINKS = [
  { label: "Track Order", href: "/track-order" },
  { label: "Returns", href: "/returns" },
  { label: "Size Guide", href: "/size-guide" },
  { label: "Contact Us", href: "/contact" },
];

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
        <Link
          key={link.href}
          href={link.href}
          className="text-[15px] leading-[22px] text-on-dark transition-colors hover:text-on-dark-muted"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

/** The near-black footer: crest and blurb, Shop and Support columns, legal line. */
export function SiteFooter() {
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
          </div>
          <FooterNav
            label="Shop"
            links={STORE_CATEGORIES.map((category) => ({
              label: category.name,
              href: category.href,
            }))}
          />
          <FooterNav label="Support" links={SUPPORT_LINKS} />
        </div>
        <div className="flex flex-col gap-3 border-t border-border-dark pt-6 text-[13px] leading-[18px] text-on-dark-subtle sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Astaad Sports. All rights reserved.</span>
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
