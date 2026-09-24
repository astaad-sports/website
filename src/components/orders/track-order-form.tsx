"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatOrderDate, formatOrderNumber } from "@/lib/format";
import { ORDER_STATUS_LABEL, orderStatusTone } from "@/lib/orders/status";
import { trackOrder, type TrackedOrder, type TrackOrderState } from "@/lib/orders/track";
import { cn } from "@/lib/utils";

import { OrderProgress } from "./order-progress";

/** "Astaad Run Machine × 2, Pro Batting Gloves" */
function itemsLine(order: TrackedOrder): string {
  return order.items.map((item) => (item.quantity > 1 ? `${item.name} × ${item.quantity}` : item.name)).join(", ");
}

function TrackedOrderResult({ order }: { order: TrackedOrder }) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // A new result replaces the form's message area; take screen readers and keyboards to it.
  useEffect(() => {
    headingRef.current?.focus();
  }, [order]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 rounded-md border border-border bg-surface-raised p-6 shadow-card">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 ref={headingRef} tabIndex={-1} className="type-heading-md outline-none">
            Order {formatOrderNumber(order.number)}
          </h2>
          <span className={cn("type-body font-semibold", orderStatusTone(order.status))}>
            {ORDER_STATUS_LABEL[order.status]}
          </span>
        </div>
        <p className="type-body-sm text-ink-muted">Placed {formatOrderDate(order.createdAt)}</p>
        {order.items.length > 0 && <p className="type-body mt-1">{itemsLine(order)}</p>}
        {order.status === "cancelled" && (
          <p className="type-body mt-2 text-ink-muted">
            This order was cancelled. If you paid for it, the refund goes back to the payment method you used.
          </p>
        )}
      </div>
      <OrderProgress order={order} />
    </div>
  );
}

/**
 * Order number and mobile number in, delivery progress out. Works signed
 * out; the fields keep what was typed when a lookup fails.
 */
export function TrackOrderForm() {
  const id = useId();
  const [state, lookUp, pending] = useActionState<TrackOrderState, FormData>(trackOrder, {});
  const [number, setNumber] = useState("");
  const [phone, setPhone] = useState("");
  const fieldErrors = pending ? {} : (state.fieldErrors ?? {});
  const error = pending ? undefined : state.error;

  return (
    <div className="flex flex-col gap-8">
      <form
        action={lookUp}
        noValidate
        className="flex flex-col gap-5 rounded-md border border-border bg-surface-raised p-6 shadow-card md:p-8"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-number`}>Order number</Label>
            <Input
              id={`${id}-number`}
              name="number"
              placeholder="AST-10019"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={number}
              onChange={(event) => setNumber(event.target.value)}
              aria-invalid={fieldErrors.number ? true : undefined}
              aria-describedby={fieldErrors.number ? `${id}-number-error` : `${id}-number-help`}
            />
            {fieldErrors.number ? (
              <p id={`${id}-number-error`} className="type-body-sm text-danger">
                {fieldErrors.number}
              </p>
            ) : (
              <p id={`${id}-number-help`} className="type-body-sm text-ink-muted">
                In your order confirmation
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-phone`}>Mobile number</Label>
            <Input
              id={`${id}-phone`}
              name="phone"
              type="tel"
              inputMode="tel"
              placeholder="98765 43210"
              autoComplete="tel-national"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              aria-invalid={fieldErrors.phone ? true : undefined}
              aria-describedby={fieldErrors.phone ? `${id}-phone-error` : `${id}-phone-help`}
            />
            {fieldErrors.phone ? (
              <p id={`${id}-phone-error`} className="type-body-sm text-danger">
                {fieldErrors.phone}
              </p>
            ) : (
              <p id={`${id}-phone-help`} className="type-body-sm text-ink-muted">
                The one on the delivery address
              </p>
            )}
          </div>
        </div>
        {error && (
          <p role="alert" className="type-body-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto sm:self-start">
          {pending ? (
            <>
              <LoaderCircle className="animate-spin" strokeWidth={2} aria-hidden="true" />
              Finding your order…
            </>
          ) : (
            "Track order"
          )}
        </Button>
      </form>

      {state.order && !pending && <TrackedOrderResult order={state.order} />}
    </div>
  );
}
