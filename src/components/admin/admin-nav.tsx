"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, House, LogOut, Menu, Search, ShoppingBag, type LucideIcon } from "lucide-react";

import { Crest } from "@/components/astaad/crest";
import { signOut } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

import { AdminWordmark } from "./admin-header";

interface Section {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Also active for these deeper paths. */
  matches: (path: string) => boolean;
}

// Products, Offers, Inventory and Settings join these as they are built.
const DASHBOARD: Section = { href: "/admin", label: "Dashboard", icon: House, matches: (path) => path === "/admin" };
const ORDERS: Section = {
  href: "/admin/orders",
  label: "Orders",
  icon: ShoppingBag,
  matches: (path) => path.startsWith("/admin/orders") || path.startsWith("/admin/search"),
};
const MORE: Section = { href: "/admin/more", label: "More", icon: Menu, matches: (path) => path.startsWith("/admin/more") };

function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "min-w-5 rounded-full bg-brand-yellow px-1.5 text-center text-[11px] leading-5 font-bold text-on-yellow tabular-nums",
        className
      )}
    >
      {count}
    </span>
  );
}

/** The dark sidebar on desktop: crest, search, sections, then the admin's account. */
export function AdminSidebar({ toShip, name, email }: { toShip: number; name: string; email: string | null }) {
  const path = usePathname();
  const sections = [DASHBOARD, ORDERS];

  return (
    <aside className="sticky top-0 hidden h-dvh w-58 shrink-0 flex-col bg-surface-dark text-on-dark lg:flex">
      <Link href="/admin" aria-label="Astaad Sports admin, dashboard" className="flex h-18 shrink-0 items-center gap-2.5 px-4">
        <Crest size={40} priority />
        <AdminWordmark />
      </Link>

      <form action="/admin/search" role="search" className="px-3 pb-3">
        <label className="relative block">
          <span className="sr-only">Search orders</span>
          <Search
            className="pointer-events-none absolute top-2.5 left-2.5 size-5 text-on-dark-muted"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <input
            type="search"
            name="q"
            placeholder="Search…"
            className="h-10 w-full rounded-sm border border-border-on-dark bg-surface-dark-raised pr-2.5 pl-9.5 text-sm text-on-dark placeholder:text-on-dark-muted focus-visible:outline-brand-yellow"
          />
        </label>
      </form>

      <nav aria-label="Admin sections" className="flex flex-col gap-0.5 px-2">
        {sections.map((section) => {
          const active = section.matches(path);
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-sm px-3 text-sm leading-5 transition-colors focus-visible:outline-brand-yellow",
                active ? "bg-surface-dark-raised font-semibold text-on-dark" : "font-medium text-on-dark-muted hover:text-on-dark"
              )}
            >
              <Icon className={cn("size-5", active && "text-brand-yellow")} strokeWidth={1.5} aria-hidden="true" />
              <span className="flex-1">{section.label}</span>
              {section === ORDERS && (
                <>
                  <CountBadge count={toShip} />
                  {toShip > 0 && <span className="sr-only">, {toShip} to ship</span>}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-surface-dark-raised px-2 pt-3 pb-4">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-dark-raised text-[13px] font-semibold"
          >
            {name.charAt(0).toUpperCase()}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm leading-5 font-semibold">{name}</span>
            {email && <span className="truncate text-xs leading-4 text-on-dark-muted">{email}</span>}
          </span>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 items-center gap-3 rounded-sm px-3 text-sm leading-5 font-medium text-on-dark-muted transition-colors hover:text-on-dark focus-visible:outline-brand-yellow"
        >
          <ExternalLink className="size-5" strokeWidth={1.5} aria-hidden="true" />
          View store
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <form action={signOut}>
          <button
            type="submit"
            className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-sm px-3 text-sm leading-5 font-medium text-on-dark-muted transition-colors hover:text-on-dark focus-visible:outline-brand-yellow"
          >
            <LogOut className="size-5" strokeWidth={1.5} aria-hidden="true" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

/** Order detail pages end in their own action bar, so the tabs step aside there. */
function isOrderDetail(path: string): boolean {
  return /^\/admin\/orders\/[^/]+\/?$/.test(path);
}

/** The bottom navigation on phones and tablets. */
export function AdminTabBar({ toShip }: { toShip: number }) {
  const path = usePathname();
  if (isOrderDetail(path)) return null;
  const sections = [{ ...DASHBOARD, label: "Home" }, ORDERS, MORE];

  return (
    <>
      <div aria-hidden="true" className="h-16 shrink-0 lg:hidden" />
      <nav
        aria-label="Admin sections"
        className="fixed inset-x-0 bottom-0 z-30 grid h-16 border-t border-surface-dark-raised bg-surface-dark pb-[env(safe-area-inset-bottom)] lg:hidden"
        style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}
      >
        {sections.map((section) => {
          const active = section.matches(path);
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[11px] leading-[14px] focus-visible:outline-brand-yellow",
                active ? "font-semibold text-brand-yellow" : "font-medium text-[#b5b3ae]"
              )}
            >
              <span className="relative">
                <Icon className="size-[22px]" strokeWidth={1.5} aria-hidden="true" />
                {section === ORDERS && <CountBadge count={toShip} className="absolute -top-1.5 left-3.5 min-w-4 px-1 text-[10px] leading-4" />}
              </span>
              {section.label}
              {section === ORDERS && toShip > 0 && <span className="sr-only">, {toShip} to ship</span>}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
