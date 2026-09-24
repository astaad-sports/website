import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, ChevronRight, ExternalLink, LogOut } from "lucide-react";

import { PAGE } from "@/components/admin/styles";
import { signOut } from "@/lib/auth/actions";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "More" };

const ROW =
  "flex min-h-16 w-full cursor-pointer items-center gap-3 border-b border-border py-2.5 text-left text-[15px] leading-[22px] font-semibold transition-colors hover:bg-surface-sunken/60";

/** The rest of the admin on phones. Offers and Settings join this list as they are built. */
export default async function AdminMorePage() {
  const user = await requireAdmin("/admin/more");
  const name = user.name?.trim() || "Admin";

  return (
    <main className={PAGE}>
      <h1 className="type-heading-lg">More</h1>

      <nav aria-label="More sections" className="flex flex-col border-t border-border">
        <Link href="/admin/inventory" className={ROW}>
          <Boxes className="size-5 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
          <span className="flex flex-1 flex-col">
            Inventory
            <span className="text-[13px] leading-[18px] font-normal text-ink-muted">Stock counts for every product</span>
          </span>
          <ChevronRight className="size-5 text-ink-subtle" strokeWidth={1.5} aria-hidden="true" />
        </Link>
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
