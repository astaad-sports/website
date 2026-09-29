import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { CustomerSummary } from "@/db/customers";
import { formatMobile, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

function customerHref(customer: Pick<CustomerSummary, "id">) {
  return `/admin/customers/${customer.id}`;
}

/** The customer's name, or their email or number while they have given no name. */
export function customerName(customer: Pick<CustomerSummary, "name" | "email" | "phone">): string {
  return customer.name?.trim() || customer.email || (customer.phone ? formatMobile(customer.phone) : "No name");
}

/** "2 orders · 1 address", "No orders · 1 address". */
function holdings({ orders, addresses }: Pick<CustomerSummary, "orders" | "addresses">): string {
  const placed = orders ? `${orders} ${orders === 1 ? "order" : "orders"}` : "No orders";
  const saved = addresses ? `${addresses} ${addresses === 1 ? "address" : "addresses"}` : "No addresses";
  return `${placed} · ${saved}`;
}

/** One customer as a list row: who they are, how to reach them, and what they have with the store. */
export function CustomerRow({ customer }: { customer: CustomerSummary }) {
  const contact = [customer.name?.trim() ? customer.email : null, customer.phone ? formatMobile(customer.phone) : null].filter(Boolean);
  return (
    <li className="border-b border-border">
      <Link
        href={customerHref(customer)}
        className="flex min-h-16 items-center gap-3 py-3 transition-colors hover:bg-surface-sunken/60"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[15px] leading-[22px] font-semibold">{customerName(customer)}</span>
          {contact.length > 0 && (
            <span className="truncate text-[13px] leading-[18px] text-ink-muted tabular-nums">{contact.join(" · ")}</span>
          )}
          <span className="text-[13px] leading-[18px] text-ink-muted tabular-nums">{holdings(customer)}</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-ink-subtle" strokeWidth={1.5} aria-hidden="true" />
      </Link>
    </li>
  );
}

const TH = "h-10 bg-surface-sunken px-3 text-left text-xs leading-4 font-semibold tracking-[0.08em] text-ink-muted uppercase";
const TD = "h-14 border-b border-border px-3 text-sm leading-5";

/** The Customers list as a plain table on desktop. */
export function CustomersTable({ customers, className }: { customers: CustomerSummary[]; className?: string }) {
  return (
    <table className={cn("w-full border-collapse", className)}>
      <thead>
        <tr>
          <th scope="col" className={TH}>
            Customer
          </th>
          <th scope="col" className={TH}>
            Email
          </th>
          <th scope="col" className={cn(TH, "w-44")}>
            Mobile
          </th>
          <th scope="col" className={cn(TH, "w-24 text-right")}>
            Orders
          </th>
          <th scope="col" className={cn(TH, "w-28 text-right")}>
            Addresses
          </th>
          <th scope="col" className={cn(TH, "w-32 pl-8")}>
            Joined
          </th>
          <th scope="col" className={cn(TH, "w-14")}>
            <span className="sr-only">Open</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {customers.map((customer) => (
          <tr key={customer.id} className="transition-colors hover:bg-surface-sunken/60">
            <td className={cn(TD, "max-w-0 truncate")}>
              <Link href={customerHref(customer)} className="inline-flex min-h-11 items-center font-semibold">
                {customerName(customer)}
              </Link>
            </td>
            <td className={cn(TD, "max-w-0 truncate text-ink-muted")}>{customer.email}</td>
            <td className={cn(TD, "whitespace-nowrap text-ink-muted tabular-nums")}>
              {customer.phone ? formatMobile(customer.phone) : ""}
            </td>
            <td className={cn(TD, "text-right tabular-nums")}>{customer.orders}</td>
            <td className={cn(TD, "text-right tabular-nums")}>{customer.addresses}</td>
            <td className={cn(TD, "pl-8 whitespace-nowrap text-ink-muted tabular-nums")}>{formatShortDate(customer.createdAt)}</td>
            <td className={cn(TD, "pr-0")}>
              <Link
                href={customerHref(customer)}
                aria-label={`Open ${customerName(customer)}`}
                className="flex size-11 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-sunken"
              >
                <ChevronRight className="size-5" strokeWidth={1.5} aria-hidden="true" />
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
