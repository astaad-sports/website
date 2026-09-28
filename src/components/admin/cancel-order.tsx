"use client";

import { startTransition, useActionState, useRef, useState, type FormEvent } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { LoaderCircle, XCircle } from "lucide-react";

import { cancelOrderAction, type AdminActionState } from "@/lib/orders/admin-actions";
import type { FulfilmentStatus } from "@/lib/orders/fulfilment";
import { cn } from "@/lib/utils";

import { ErrorLine } from "./product-row";
import { Sheet } from "./restock";
import { safeAction } from "./safe-action";
import { BUTTON_BASE, BUTTON_SECONDARY } from "./styles";

const safeCancel = safeAction(cancelOrderAction);

/**
 * "Cancel order", confirmed in a sheet that says what happens: the customer
 * is emailed, the items go back in stock, and the refund is the admin's to
 * make in Razorpay. Once cancelled the page shows the order as cancelled and
 * this goes away.
 */
export function CancelOrder({
  orderId,
  status,
  orderNumber,
  total,
  test,
}: {
  orderId: string;
  status: FulfilmentStatus;
  /** "AST-10023" */
  orderNumber: string;
  /** "₹4,999" */
  total: string;
  test: boolean;
}) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [state, cancel, cancelling] = useActionState(
    async (previous: AdminActionState, form: FormData) => safeCancel(previous, form),
    {}
  );

  // Dispatched by hand, like Delete product, so a failure keeps the sheet open with its error.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cancelling) return;
    const data = new FormData(event.currentTarget);
    startTransition(() => cancel(data));
  }

  return (
    <>
      <button
        ref={opener}
        type="button"
        onClick={() => setOpen(true)}
        className={cn(BUTTON_BASE, "-ml-2 self-start px-2 text-danger hover:bg-surface-sunken")}
      >
        <XCircle strokeWidth={1.5} aria-hidden="true" />
        Cancel order
      </button>
      <Sheet
        open={open}
        onClose={() => {
          if (!cancelling) setOpen(false);
        }}
        // The question first, not the button that cancels.
        initialFocus={() => titleRef.current ?? true}
        finalFocus={() => opener.current ?? true}
      >
        <form onSubmit={submit} className="flex flex-col">
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="from" value={status} />
          <Dialog.Title ref={titleRef} tabIndex={-1} className="text-lg leading-6 font-semibold focus:outline-none">
            Cancel order #{orderNumber}?
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-[13px] leading-[18px] text-ink-muted">
            {test
              ? "The test account is emailed that it’s cancelled. It’s a test order, so there’s nothing to refund."
              : `The customer is emailed that it’s cancelled and that their refund of ${total} is on its way. Its items go back in stock. Make the refund yourself in the Razorpay dashboard.`}{" "}
            This can’t be undone.
          </Dialog.Description>
          <ErrorLine message={cancelling ? undefined : state.error} className="mt-4" />
          {/* aria-disabled, not disabled: a disabled button loses focus. */}
          <button
            type="submit"
            aria-disabled={cancelling}
            className={cn(
              BUTTON_BASE,
              "mt-5 min-h-12 bg-danger text-on-dark hover:bg-danger/90 aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
            )}
          >
            {cancelling ? (
              <>
                <LoaderCircle className="animate-spin" strokeWidth={2} aria-hidden="true" />
                Cancelling…
              </>
            ) : (
              "Cancel order"
            )}
          </button>
          <Dialog.Close disabled={cancelling} className={cn(BUTTON_SECONDARY, "mt-2 min-h-12")}>
            Keep order
          </Dialog.Close>
        </form>
      </Sheet>
    </>
  );
}
