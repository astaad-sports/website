import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgePercent,
  Boxes,
  ChevronRight,
  ExternalLink,
  LogOut,
  MessageSquareQuote,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { matchesStockFilter } from "@/components/admin/product-row";
import { PAGE } from "@/components/admin/styles";
import { listOffers } from "@/db/offers";
import { listProductsWithImages } from "@/db/products";
import { listReviewsForAdmin } from "@/db/reviews";
import { signOut } from "@/lib/auth/actions";
import { requireAdmin } from "@/lib/auth/session";
import { offerStatus } from "@/lib/offers/model";

export const metadata: Metadata = { title: "More" };

const ROW =
  "flex min-h-16 w-full cursor-pointer items-center gap-3 border-b border-border py-2.5 text-left text-[15px] leading-[22px] font-semibold transition-colors hover:bg-surface-sunken/60";

/** "1 active · 2 upcoming", leaving out what is zero; `none` when everything is. */
function counts(parts: [number, string][], none: string): string {
  const shown = parts.filter(([count]) => count > 0).map(([count, label]) => `${count} ${label}`);
  return shown.length ? shown.join(" · ") : none;
}

function SectionRow({ href, icon: Icon, title, detail }: { href: string; icon: LucideIcon; title: string; detail: string }) {
  return (
    <Link href={href} className={ROW}>
      <Icon className="size-5 shrink-0 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
      <span className="flex min-w-0 flex-1 flex-col">
        {title}
        <span className="text-[13px] leading-[18px] font-normal text-ink-muted tabular-nums">{detail}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-ink-subtle" strokeWidth={1.5} aria-hidden="true" />
    </Link>
  );
}

/** The rest of the admin on phones: Offers, Inventory, Reviews and Settings, then the admin's account. */
export default async function AdminMorePage() {
  const user = await requireAdmin("/admin/more");
  const name = user.name?.trim() || "Admin";
  const [offers, products, reviews] = await Promise.all([listOffers(), listProductsWithImages(), listReviewsForAdmin()]);

  const now = new Date();
  const offersRunning = offers.filter((offer) => offerStatus(offer, now) === "active").length;
  const offersToCome = offers.filter((offer) => offerStatus(offer, now) === "upcoming").length;
  const low = products.filter((product) => matchesStockFilter(product, "low")).length;
  const out = products.filter((product) => matchesStockFilter(product, "out")).length;
  const newReviews = reviews.filter((review) => review.status === "new").length;
  const published = reviews.filter((review) => review.status === "published").length;

  return (
    <main className={PAGE}>
      <h1 className="type-heading-lg">More</h1>

      <nav aria-label="More sections" className="flex flex-col border-t border-border">
        <SectionRow
          href="/admin/offers"
          icon={BadgePercent}
          title="Offers"
          detail={counts(
            [
              [offersRunning, "active"],
              [offersToCome, "upcoming"],
            ],
            "No active offers"
          )}
        />
        <SectionRow
          href="/admin/inventory"
          icon={Boxes}
          title="Inventory"
          detail={counts(
            [
              [low, "low stock"],
              [out, "out of stock"],
            ],
            "Stock counts for every product"
          )}
        />
        <SectionRow
          href="/admin/reviews"
          icon={MessageSquareQuote}
          title="Reviews"
          detail={counts(
            [
              [newReviews, "new"],
              [published, "on the site"],
            ],
            "Reviews and feedback from customers"
          )}
        />
        <SectionRow href="/admin/settings" icon={Settings} title="Settings" detail="Store, shipping, payment, account" />
      </nav>

      <section aria-label="Account" className="flex flex-col border-t border-border">
        <div className="flex min-h-16 items-center gap-3 border-b border-border py-2.5">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-dark text-[15px] font-semibold text-on-dark"
          >
            {name.charAt(0).toUpperCase()}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[15px] leading-[22px] font-semibold">{name}</span>
            {user.email && <span className="truncate text-[13px] leading-[18px] text-ink-muted">{user.email}</span>}
          </span>
        </div>
        <a href="/" target="_blank" rel="noopener noreferrer" className={ROW}>
          <ExternalLink className="size-5 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
          View store
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <form action={signOut}>
          <button type="submit" className={ROW}>
            <LogOut className="size-5 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
