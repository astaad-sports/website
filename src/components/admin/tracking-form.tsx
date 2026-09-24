"use client";

import { useActionState, useState } from "react";
import { ChevronDown, CircleAlert, Pencil } from "lucide-react";

import { saveTracking, type AdminActionState } from "@/lib/orders/admin-actions";
import { CARRIERS, carrierName, DEFAULT_CARRIER, isCarrierId, type CarrierId } from "@/lib/shipping";
import { cn } from "@/lib/utils";

import { TRACKING_FIELD_ID } from "./fulfilment-controls";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, FIELD, FIELD_LABEL } from "./styles";
import { Toast } from "./toast";

const CARRIER_IDS = Object.keys(CARRIERS) as CarrierId[];

/** The action's result, plus when the last successful save happened (it survives a later failed one). */
interface TrackingState extends AdminActionState {
  savedAt?: number;
}

async function saveAndRemember(previous: TrackingState, form: FormData): Promise<TrackingState> {
  const result = await saveTracking(previous, form);
  return { ...result, savedAt: result.saved ? result.at : previous.savedAt };
}

/**
 * Courier and tracking ID. With none saved it is a short form; once saved it
 * reads "Tracking: … Courier: …" with an Edit button. Saving a tracking ID
 * on an order that has not shipped marks it shipped.
 */
export function TrackingForm({
  orderId,
  carrier,
  trackingNumber,
  shipped,
  shippedOn,
}: {
  orderId: string;
  carrier: string | null;
  trackingNumber: string | null;
  /** Whether the order is already shipped or delivered. */
  shipped: boolean;
  /** "22 Oct 2026", once shipped. */
  shippedOn: string | null;
}) {
  const [state, action, pending] = useActionState(saveAndRemember, {});
  const savedCarrier: CarrierId = isCarrierId(carrier) ? carrier : DEFAULT_CARRIER;
  const [courier, setCourier] = useState<CarrierId>(savedCarrier);
  const [value, setValue] = useState(trackingNumber ?? "");
  // The value that was last sent, so an error about it disappears once the admin types something else.
  const [sent, setSent] = useState<string | null>(null);
  const fieldError = state.fieldError && value === sent ? state.fieldError : undefined;
  // Editing starts on "Edit" and ends with the next successful save (or Cancel).
  // It remembers which save it started after, so no clocks are compared.
  const [editingAfter, setEditingAfter] = useState<number | null>(null);
  const lastSavedAt = state.savedAt ?? 0;
  const editing = !trackingNumber || (editingAfter !== null && editingAfter === lastSavedAt);

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <dl className="flex min-w-0 flex-col gap-0.5 text-[15px] leading-[22px]">
            <div className="flex gap-1.5">
              <dt className="text-ink-muted">Tracking:</dt>
              <dd className="font-semibold tracking-[0.02em] break-all tabular-nums select-all">{trackingNumber}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-ink-muted">Courier:</dt>
              <dd className="font-semibold">{carrierName(carrier)}</dd>
            </div>
          </dl>
          {shippedOn && <p className="text-[13px] leading-[18px] text-ink-muted">Shipped {shippedOn}</p>}
        </div>
        <button
          type="button"
          onClick={() => {
            setValue(trackingNumber ?? "");
            setCourier(savedCarrier);
            setEditingAfter(lastSavedAt);
          }}
          className="-mr-2 inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-sm px-2 text-sm leading-5 font-semibold hover:bg-surface-sunken"
        >
          <Pencil className="size-4" strokeWidth={1.5} aria-hidden="true" />
          Edit<span className="sr-only"> tracking</span>
        </button>
        <Toast message={state.saved} at={state.at} />
      </div>
    );
  }

  const fieldErrorId = `${TRACKING_FIELD_ID}-error`;
  return (
    <form action={action} onSubmit={() => setSent(value)} className="flex flex-col gap-4">
      <p className="text-[15px] leading-[22px] font-semibold">{trackingNumber ? "Change tracking ID" : "Add tracking ID"}</p>
      <input type="hidden" name="orderId" value={orderId} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${TRACKING_FIELD_ID}-courier`} className={FIELD_LABEL}>
          Courier
        </label>
        <div className="relative">
          <select
            id={`${TRACKING_FIELD_ID}-courier`}
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
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={TRACKING_FIELD_ID} className={FIELD_LABEL}>
          Tracking ID
        </label>
        <input
          id={TRACKING_FIELD_ID}
          name="trackingNumber"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? fieldErrorId : `${TRACKING_FIELD_ID}-help`}
          className={cn(FIELD, "tabular-nums")}
        />
        {fieldError ? (
          <p id={fieldErrorId} role="alert" className="flex items-start gap-1.5 text-[13px] leading-[18px] text-danger">
            <CircleAlert className="mt-px size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            {fieldError}
          </p>
        ) : (
          <p id={`${TRACKING_FIELD_ID}-help`} className="text-[13px] leading-[18px] text-ink-muted">
            {shipped ? "The customer sees the new ID on their order." : "Saving it marks the order as shipped."}
          </p>
        )}
      </div>

      {state.error && (
        <p role="alert" className="flex items-start gap-1.5 text-[13px] leading-[18px] text-danger">
          <CircleAlert className="mt-px size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        {trackingNumber && (
          <button type="button" onClick={() => setEditingAfter(null)} className={BUTTON_SECONDARY}>
            Cancel
          </button>
        )}
        <button type="submit" disabled={pending} className={cn(BUTTON_PRIMARY, "flex-1")}>
          {pending ? "Saving…" : "Update tracking"}
        </button>
      </div>
      <Toast message={state.saved} at={state.at} />
    </form>
  );
}
