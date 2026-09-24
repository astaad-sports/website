"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

import { Crest } from "@/components/astaad/crest";

/** "ASTAAD SPORTS / Admin" beside the crest, for the mobile header and the desktop sidebar. */
export function AdminWordmark() {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="font-display text-sm leading-[14px] font-black tracking-[0.02em] text-on-dark uppercase italic">
        Astaad Sports
      </span>
      <span className="text-[11px] leading-[14px] font-medium tracking-[0.12em] text-on-dark-muted uppercase">Admin</span>
    </span>
  );
}

/** The dark top bar on phones and tablets: crest home link and search. The Search page has its own bar. */
export function AdminHeader() {
  const path = usePathname();
  if (path.startsWith("/admin/search")) return null;
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between bg-surface-dark pr-1 pl-3 lg:hidden">
      <Link
        href="/admin"
        aria-label="Astaad Sports admin, home"
        className="flex min-h-11 items-center gap-2.5 rounded-sm focus-visible:outline-brand-yellow"
      >
        <Crest size={40} priority />
        <AdminWordmark />
      </Link>
      <Link
        href="/admin/search"
        aria-label="Search orders"
        className="flex size-11 items-center justify-center rounded-full text-on-dark transition-colors hover:bg-surface-dark-raised focus-visible:outline-brand-yellow"
      >
        <Search className="size-[22px]" strokeWidth={1.5} aria-hidden="true" />
      </Link>
    </header>
  );
}
