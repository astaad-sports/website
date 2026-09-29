"use client";

import { startTransition, useActionState, useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { BadgeCheck, LoaderCircle } from "lucide-react";

import type { ReviewLinkSource } from "@/db/schema";
import { formatMobile, formatOrderNumber } from "@/lib/format";
import type { ReviewCustomerState } from "@/lib/reviews/customer-actions";
import { isProvenLink, LINK_SOURCE_NOTE } from "@/lib/reviews/customers";
import { cn } from "@/lib/utils";

import { EditorSection, FieldHelp } from "./product-editor-fields";
import { ErrorLine } from "./product-row";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, FIELD, FIELD_LABEL } from "./styles";
import { Toast } from "./toast";

type Action = (previous: ReviewCustomerState, form: FormData) => Promise<ReviewCustomerState>;

/** The customer a review belongs to, as the section shows them. */
export interface ReviewCustomerView {
  id: string;
  /** Their name, or their email or number while they have given none. */
  name: string;
  email: string | null;
  phone: string | null;
  linkedBy: ReviewLinkSource;
  /** Their paid orders with the review's product in them, the latest first. */
  bought: { orderNumber: number; on: string }[];
}

/** A customer in the list to choose from. */
export interface ReviewCustomerOption {
  id: string;
  /** "Arjun Singh Gill · player@example.test" */
  label: string;
}

const LINK_BUTTON =
  "inline-flex min-h-11 cursor-pointer items-center text-sm leading-5 font-semibold underline underline-offset-4 transition-colors hover:text-ink-muted disabled:cursor-not-allowed disabled:opacity-60";

/** What the store knows about the customer and the product the review names. */
function Purchase({ customer, productName }: { customer: ReviewCustomerView; productName: string | null }) {
  if (!productName) {
    return <FieldHelp>The review names no product, so it can&apos;t show as a verified buyer&apos;s.</FieldHelp>;
  }
  if (customer.bought.length === 0) {
    return <FieldHelp>None of their paid orders has the {productName}, so it doesn&apos;t show as a verified buyer&apos;s.</FieldHelp>;
  }
  const proven = isProvenLink(customer.linkedBy);
  return (
    <p className="flex items-start gap-2 text-[13px] leading-[18px]">
      <BadgeCheck className={cn("mt-px size-4 shrink-0", proven ? "text-success" : "text-ink-muted")} strokeWidth={1.75} aria-hidden="true" />
      <span>
        Bought the {productName} in{" "}
        {customer.bought.map((order, index) => (
          <span key={order.orderNumber}>
            {index > 0 && ", "}
            <Link href={`/admin/orders/${order.orderNumber}`} className="font-semibold underline underline-offset-4 tabular-nums">
              #{formatOrderNumber(order.orderNumber)}
            </Link>{" "}
            ({order.on})
          </span>
        ))}
        . {proven ? "The store shows “Verified buyer” on this review." : "Once you confirm it is them, the store shows “Verified buyer”."}
      </span>
    </p>
  );
}

/**
 * Whose review this is: the customer's account, how the two came together
 * and whether they bought the product, with Confirm (for a contact that
 * matched), Change and Remove. With no customer, a list to choose one from.
 */
export function ReviewCustomer({
  customer,
  productName,
  customers,
  setCustomer,
  confirmCustomer,
}: {
  customer: ReviewCustomerView | null;
  productName: string | null;
  customers: ReviewCustomerOption[];
  setCustomer: Action;
  confirmCustomer: Action;
}) {
  const id = useId();
  const [setState, change, changing] = useActionState(setCustomer, {});
  const [confirmState, confirm, confirming] = useActionState(confirmCustomer, {});
  // The list is open from Change until a later result says it was saved.
  const [openedAt, setOpenedAt] = useState<ReviewCustomerState | null>(null);
  const [chosen, setChosen] = useState("");
  const choosing = customer === null || (openedAt !== null && (setState === openedAt || !setState.saved));
  const busy = changing || confirming;
  const latest = busy ? {} : (setState.at ?? 0) >= (confirmState.at ?? 0) ? setState : confirmState;

  // Sent by hand: a form with an `action` is reset once it answers, which puts the list back on its first line.
  function link(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(() => change(form));
  }

  return (
    <EditorSection id={`${id}-title`} title="Customer">
      {customer && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col">
            <Link
              href={`/admin/customers/${customer.id}`}
              className="inline-flex min-h-11 items-center self-start text-[15px] leading-[22px] font-semibold break-all underline underline-offset-4"
            >
              {customer.name}
            </Link>
            <span className="text-[13px] leading-[18px] break-all text-ink-muted tabular-nums">
              {[customer.email, customer.phone ? formatMobile(customer.phone) : null].filter(Boolean).join(" · ")}
            </span>
          </div>
          <FieldHelp>{LINK_SOURCE_NOTE[customer.linkedBy]}</FieldHelp>
          <Purchase customer={customer} productName={productName} />
          {!choosing && (
            <div className="flex flex-wrap items-center gap-x-5">
              {!isProvenLink(customer.linkedBy) && (
                <form action={confirm}>
                  <button type="submit" disabled={busy} className={cn(BUTTON_SECONDARY, "mr-1")}>
                    {confirming && <LoaderCircle className="animate-spin" strokeWidth={2} aria-hidden="true" />}
                    Confirm it is them
                  </button>
                </form>
              )}
              <button type="button" disabled={busy} onClick={() => setOpenedAt(setState)} className={LINK_BUTTON}>
                Change<span className="sr-only"> customer</span>
              </button>
              <form action={change}>
                <input type="hidden" name="userId" value="" />
                <button type="submit" disabled={busy} className={LINK_BUTTON}>
                  Remove<span className="sr-only"> customer</span>
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {choosing && (
        <form onSubmit={link} className="flex flex-col gap-3">
          {!customer && <p className="text-[15px] leading-[22px]">This review is not on a customer&apos;s account.</p>}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-customer`} className={FIELD_LABEL}>
              {customer ? "Change to" : "Link to a customer"}
            </label>
            <select
              id={`${id}-customer`}
              name="userId"
              value={chosen}
              onChange={(event) => setChosen(event.target.value)}
              aria-describedby={`${id}-help`}
              className={FIELD}
            >
              <option value="">Choose a customer</option>
              {customers
                .filter((option) => option.id !== customer?.id)
                .map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
            </select>
            <FieldHelp id={`${id}-help`}>
              For a review you know is theirs. If they bought the product, the store shows “Verified buyer” on it.
            </FieldHelp>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy || !chosen} className={BUTTON_PRIMARY}>
              {changing && <LoaderCircle className="animate-spin" strokeWidth={2} aria-hidden="true" />}
              Link customer
            </button>
            {customer && (
              <button type="button" disabled={busy} onClick={() => setOpenedAt(null)} className={BUTTON_SECONDARY}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      <ErrorLine message={latest.error} />
      <Toast message={latest.saved} at={latest.at} className="max-lg:bottom-36" />
    </EditorSection>
  );
}
