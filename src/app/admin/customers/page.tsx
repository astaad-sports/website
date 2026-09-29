import type { Metadata } from "next";
import Link from "next/link";
import { Search, Users } from "lucide-react";

import { CustomerRow, CustomersTable } from "@/components/admin/customer-rows";
import { BUTTON_SECONDARY, PAGE, SEARCH_FIELD } from "@/components/admin/styles";
import { countCustomers, listCustomers } from "@/db/customers";
import { requireAdmin } from "@/lib/auth/session";
import { normaliseSearch } from "@/lib/orders/fulfilment";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Customers" };

/** Everyone with an account: search by name, email or mobile, and open one to see their orders and addresses. */
export default async function AdminCustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  const query = normaliseSearch((await searchParams).q);
  await requireAdmin(query ? `/admin/customers?q=${encodeURIComponent(query)}` : "/admin/customers");
  const [customers, total] = await Promise.all([listCustomers({ query }), countCustomers()]);

  return (
    <main className={PAGE}>
      <header className="flex flex-col gap-1">
        <h1 className="type-heading-lg">Customers</h1>
        <p className="hidden text-[13px] leading-[18px] text-ink-muted tabular-nums lg:block">
          {query ? customers.length : total} {(query ? customers.length : total) === 1 ? "customer" : "customers"}
          {query && ` matching “${query}”`}
        </p>
      </header>

      <form action="/admin/customers" role="search" className="lg:w-80">
        <label className="relative block">
          <span className="sr-only">Search customers by name, email or mobile number</span>
          <Search className="pointer-events-none absolute top-3 left-3 size-5 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
          <input type="search" name="q" defaultValue={query ?? ""} placeholder="Search customer…" className={SEARCH_FIELD} />
        </label>
      </form>

      {customers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
          <Users className="size-10 text-ink-subtle" strokeWidth={1.5} aria-hidden="true" />
          <p className="text-base leading-[22px] font-semibold break-all">
            {query ? `No customers match “${query}”` : "No customers yet"}
          </p>
          <p className="text-[13px] leading-[18px] text-ink-muted">
            {query ? "Search by name, email or mobile number." : "Customers show up here once they sign in to the store."}
          </p>
          {query && (
            <Link href="/admin/customers" className={cn(BUTTON_SECONDARY, "mt-2")}>
              Clear search
            </Link>
          )}
        </div>
      ) : (
        <>
          <ul aria-label="Customers" className="flex flex-col border-t border-border lg:hidden">
            {customers.map((customer) => (
              <CustomerRow key={customer.id} customer={customer} />
            ))}
          </ul>
          <CustomersTable customers={customers} className="hidden lg:table" />
        </>
      )}
    </main>
  );
}
