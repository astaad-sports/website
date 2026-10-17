"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import Link from "next/link";
import { ChevronDown, CircleAlert, PackageCheck, Truck } from "lucide-react";

import { changeStatus, saveTracking, type AdminActionState } from "@/lib/orders/admin-actions";
import type { FulfilmentStatus } from "@/lib/orders/fulfilment";
import { CARRIERS, carrierName, isCarrierId, type CarrierId } from "@/lib/shipping";
import { cn } from "@/lib/utils";

import { BUTTON_PRIMARY, BUTTON_SECONDARY, FIELD, SECTION_LABEL } from "./styles";
import { Toast } from "./toast";

const CARRIER_IDS = Object.keys(CARRIERS) as CarrierId[];

/** An order as Home's Ship and deliver section shows it. */
export interface QuickOrder {
  id: string;
  /** "10009", as in its admin address. */
  number: number;
  /** "AST-10009". */
  label: string;
  status: FulfilmentStatus;
  customer: string;
  items: string;
  carrier: string | null;
  trackingNumber: string | null;
  /** Whole days since it shipped; null before it ships. */
  shippedDaysAgo: number | null;
  /** Shipped long enough ago that it has probably arrived. */
  overdue: boolean;
  /** Paid for more than was in stock: what to restock first. */
  stockNote: string | null;
}

type Done = (message: string) => void;

function ErrorLine({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-[13px] leading-[18px] text-danger">
      <CircleAlert className="mt-px size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      {message}
    </p>
  );
}

function OrderHeading({ order }: { order: QuickOrder }) {
  return (
    <div className="flex min-w-0 flex-col">
      <Link
        href={`/admin/orders/${order.number}`}
        className="self-start text-[15px] leading-[22px] font-semibold tabular-nums underline-offset-4 hover:underline"
      >
        {order.label}
        <span className="font-normal text-ink-muted"> · {order.customer}</span>
      </Link>
      <span className="truncate text-[13px] leading-[18px] text-ink-muted">{order.items}</span>
    </div>
  );
}

/**
 * An order to ship: the courier and tracking ID right in the row. Saving them
 * marks it shipped and emails the customer, as on the order page.
 */
function ShipRow({ order, defaultCarrier, onDone }: { order: QuickOrder; defaultCarrier: CarrierId; onDone: Done }) {
  const [courier, setCourier] = useState<CarrierId>(isCarrierId(order.carrier) ? order.carrier : defaultCarrier);
  // An order with its tracking ID saved but not marked shipped yet starts with that ID.
  const [value, setValue] = useState(order.trackingNumber ?? "");
  const [state, save, saving] = useActionState(async (previous: AdminActionState, form: FormData) => {
    const result = await saveTracking(previous, form);
    if (result.saved) onDone(`${order.label} marked as shipped`);
    return result;
  }, {});
  const fieldId = `ship-${order.id}`;
  const errorId = `${fieldId}-error`;

  // Dispatched by hand so a failed save keeps the courier chosen (a form action resets the select).
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => save(data));
  }

  return (
    <li className="flex flex-col gap-3 border-b border-border py-4">
      <OrderHeading order={order} />
      {order.stockNote && <ErrorLine message={order.stockNote} />}
      <form onSubmit={submit} className="flex flex-col gap-2 @lg:flex-row @lg:items-start">
        <input type="hidden" name="orderId" value={order.id} />
        <input type="hidden" name="from" value={order.status} />
        <div className="relative @lg:w-44 @lg:shrink-0">
          <label htmlFor={`${fieldId}-courier`} className="sr-only">
            Courier for {order.label}
          </label>
          <select
            id={`${fieldId}-courier`}
            name="carrier"
            value={courier}
            onChange={(event) => setCourier(event.target.value as CarrierId)}
            className={cn(FIELD, "cursor-pointer appearance-none pr-10")}
          >
            {CARRIER_IDS.map((id) => (
              <option key={id} value={id}>
                {CARRIERS[id].name}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-3.5 right-3 size-5 text-ink-muted"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor={fieldId} className="sr-only">
            Tracking ID for {order.label}
          </label>
          <input
            id={fieldId}
            name="trackingNumber"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Tracking ID"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            required
            aria-invalid={state.fieldError ? true : undefined}
            aria-describedby={state.fieldError ? errorId : undefined}
            className={cn(FIELD, "tabular-nums")}
          />
          <ErrorLine id={errorId} message={state.fieldError} />
        </div>
        <button type="submit" disabled={saving} className={cn(BUTTON_PRIMARY, "min-h-12")}>
          <Truck aria-hidden="true" strokeWidth={1.75} />
          {saving ? "Saving…" : "Mark shipped"}
        </button>
      </form>
      <ErrorLine message={state.error} />
    </li>
  );
}

/**
 * An order on its way: its courier, AWB and how long ago it shipped, and
 * Mark delivered. That emails the customer, so it asks once before it does.
 */
function DeliverRow({ order, onDone }: { order: QuickOrder; onDone: Done }) {
  const [confirming, setConfirming] = useState(false);
  const [state, deliver, saving] = useActionState(async (previous: AdminActionState, form: FormData) => {
    const result = await changeStatus(previous, form);
    if (result.saved) onDone(`${order.label} marked as delivered`);
    return result;
  }, {});
  const days = order.shippedDaysAgo ?? 0;
  const ago = days === 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;

  return (
    <li className="flex flex-col gap-3 border-b border-border py-4">
      <div className="flex items-start justify-between gap-3">
        <OrderHeading order={order} />
        {!confirming && (
          <button type="button" onClick={() => setConfirming(true)} className={cn(BUTTON_SECONDARY, "@max-md:hidden")}>
            <PackageCheck aria-hidden="true" strokeWidth={1.75} />
            Mark delivered
          </button>
        )}
      </div>
      <p className="text-[13px] leading-[18px] text-ink-muted tabular-nums">
        {carrierName(order.carrier)} · <span className="select-all">{order.trackingNumber}</span> ·{" "}
        <span className={cn(order.overdue && "font-semibold text-foreground")}>
          Shipped {ago}
          {order.overdue && ", check it arrived"}
        </span>
      </p>
      {confirming ? (
        <form action={deliver} className="flex flex-col gap-2 rounded-sm bg-surface-sunken p-3">
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="from" value="shipped" />
          <input type="hidden" name="to" value="delivered" />
          <p className="text-[13px] leading-[18px]">
            Mark {order.label} delivered? {order.customer} gets the delivery email and a request for a review.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirming(false)} className={cn(BUTTON_SECONDARY, "bg-surface-raised")}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={cn(BUTTON_PRIMARY, "flex-1 @md:flex-none")}>
              {saving ? "Saving…" : "Yes, mark delivered"}
            </button>
          </div>
          <ErrorLine message={state.error} />
        </form>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={cn(BUTTON_SECONDARY, "@md:hidden")}>
          <PackageCheck aria-hidden="true" strokeWidth={1.75} />
          Mark delivered
        </button>
      )}
    </li>
  );
}

/**
 * Home's Ship and deliver: every paid order not shipped yet, with its courier
 * and tracking ID fields, then every order on its way, with Mark delivered.
 * The same actions as the order page, so the same emails go.
 */
export function QuickFulfilment({
  toShip,
  onTheWay,
  defaultCarrier,
}: {
  toShip: QuickOrder[];
  onTheWay: QuickOrder[];
  defaultCarrier: CarrierId;
}) {
  const [toast, setToast] = useState<{ message: string; at: number } | null>(null);
  const done: Done = (message) => setToast({ message, at: Date.now() });

  return (
    <section aria-labelledby="ship-title" className="@container flex flex-col gap-6">
      <h2 id="ship-title" className="sr-only">
        Ship and deliver
      </h2>
      <div className="flex flex-col">
        <h3 className={cn(SECTION_LABEL, "flex min-h-11 items-center justify-between")}>
          To ship
          {toShip.length > 0 && <span className="tracking-normal tabular-nums">{toShip.length}</span>}
        </h3>
        {toShip.length > 0 ? (
          <ul className="flex flex-col border-t border-border">
            {toShip.map((order) => (
              <ShipRow key={order.id} order={order} defaultCarrier={defaultCarrier} onDone={done} />
            ))}
          </ul>
        ) : (
          <p className="border-y border-border py-4 text-[13px] leading-[18px] text-ink-muted">Nothing waiting to ship.</p>
        )}
      </div>
      <div className="flex flex-col">
        <h3 className={cn(SECTION_LABEL, "flex min-h-11 items-center justify-between")}>
          On the way
          {onTheWay.length > 0 && <span className="tracking-normal tabular-nums">{onTheWay.length}</span>}
        </h3>
        {onTheWay.length > 0 ? (
          <ul className="flex flex-col border-t border-border">
            {onTheWay.map((order) => (
              <DeliverRow key={order.id} order={order} onDone={done} />
            ))}
          </ul>
        ) : (
          <p className="border-y border-border py-4 text-[13px] leading-[18px] text-ink-muted">No parcels on the way.</p>
        )}
      </div>
      <Toast message={toast?.message} at={toast?.at} />
    </section>
  );
}
