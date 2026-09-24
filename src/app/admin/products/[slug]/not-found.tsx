import Link from "next/link";
import { ChevronLeft, PackageX } from "lucide-react";

import { BUTTON_SECONDARY, PAGE } from "@/components/admin/styles";
import { isAdmin } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

/**
 * An unknown product. Admins get a way back to Products; anyone else (who
 * reached here through requireAdmin's 404) sees a plain "not found" that
 * says nothing about the admin.
 */
export default async function ProductNotFound() {
  if (!isAdmin(await getCurrentUser())) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-24 text-center">
        <h1 className="type-heading-lg">Page not found</h1>
        <p className="text-[15px] leading-[22px] text-ink-muted">This page could not be found.</p>
      </main>
    );
  }
  return (
    <main className={cn(PAGE, "pt-1 lg:pt-6")}>
      <Link
        href="/admin/products"
        className="-ml-1.5 inline-flex min-h-11 items-center gap-1 self-start rounded-sm pr-2 text-sm leading-5 font-semibold"
      >
        <ChevronLeft className="size-5" strokeWidth={1.5} aria-hidden="true" />
        Products
      </Link>
      <div className="flex flex-col items-center gap-2 border-y border-border py-12 text-center">
        <PackageX className="size-8 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
        <h1 className="text-base leading-[22px] font-semibold">This product doesn&apos;t exist</h1>
        <p className="text-[13px] leading-[18px] text-ink-muted">Its link may be out of date. Find it in Products.</p>
        <Link href="/admin/products" className={cn(BUTTON_SECONDARY, "mt-2")}>
          Show all products
        </Link>
      </div>
    </main>
  );
}
