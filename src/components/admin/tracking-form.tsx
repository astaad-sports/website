"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { ChevronDown, CircleAlert, Pencil } from "lucide-react";

import { removeTracking, saveTracking, type AdminActionState } from "@/lib/orders/admin-actions";
import { stepIndex, type FulfilmentStatus } from "@/lib/orders/fulfilment";
import { CARRIERS, carrierName, isCarrierId, type CarrierId } from "@/lib/shipping";
import { cn } from "@/lib/utils";

import { TRACKING_FIELD_ID } from "./fulfilment-controls";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, FIELD, FIELD_LABEL } from "./styles";
import { Toast } from "./toast";

const CARRIER_IDS = Object.keys(CARRIERS) as CarrierId[];

/** The action's result, plus when the last successful save happened (it survives a later failed one). */
interface TrackingState extends AdminActionState {
  savedAt?: number;
}

function remember(result: AdminActionState, previous: TrackingState): TrackingState {
  return { ...result, savedAt: result.saved ? result.at : previous.savedAt };
}

async function saveAndRemember(previous: TrackingState, form: FormData): Promise<TrackingState> {
  return remember(await saveTracking(previous, form), previous);
}

async function removeAndRemember(previous: TrackingState, form: FormData): Promise<TrackingState> {
  return remember(await removeTracking(previous, form), previous);
}

function ErrorLine({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-[13px] leading-[18px] text-danger">
      <CircleAlert className="mt-px size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      {message}
    </p>
  );
}

/**
 * Courier and tracking ID. With none saved it is a short form; once saved it
 * reads "Tracking: … Courier: …" with an Edit button. Saving a tracking ID
 * on an order that has not shipped marks it shipped. A wrong ID on an order
 * that has not shipped can be removed.
 */
export function TrackingForm({
  orderId,
  status,
  carrier,
  trackingNumber,
  shippedOn,
  defaultCarrier,
}: {
  orderId: string;
  /** The status the admin sees, so a save never undoes someone else's change. */
  status: FulfilmentStatus;
  carrier: string | null;
  trackingNumber: string | null;
  /** "22 Oct", once shipped. */
  shippedOn: string | null;
  /** The courier the form starts on while the order has none (Settings). */
  defaultCarrier: CarrierId;
}) {
  const [saveState, save, saving] = useActionState(saveAndRemember, {});
  const [removeState, remove, removing] = useActionState(removeAndRemember, {});
  const shipped = stepIndex(status) >= stepIndex("shipped");
  const savedCarrier: CarrierId = isCarrierId(carrier) ? carrier : defaultCarrier;
  const [courier, setCourier] = useState<CarrierId>(savedCarrier);
  const [value, setValue] = useState(trackingNumber ?? "");
  // The value that was last sent, so an error about it disappears once the admin types something else.
  const [sent, setSent] = useState<string | null>(null);
  const fieldError = saveState.fieldError && value === sent ? saveState.fieldError : undefined;

  // Editing starts on "Edit" and ends with the next successful save (or Cancel).
  // It remembers which save it started after, so no clocks are compared.
  const [editingAfter, setEditingAfter] = useState<number | null>(null);
  const lastSavedAt = saveState.savedAt ?? 0;
  const editing = !trackingNumber || (editingAfter !== null && editingAfter === lastSavedAt);

  // When the form closes (saved or cancelled), keyboard focus goes back to the Edit button.
  const editButton = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(editing);
  useEffect(() => {
    if (wasEditing.current && !editing) editButton.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  // React resets a form after its action runs, which would put the courier back to the first
  // option after a failed save. Dispatching the action ourselves keeps the admin's choices.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(value);
    const data = new FormData(event.currentTarget);
    startTransition(() => save(data));
  }

  // One toast for both actions, outside the branches, so switching views never replays it.
  const latest = (removeState.at ?? 0) > (saveState.at ?? 0) ? removeState : saveState;
  const fieldErrorId = `${TRACKING_FIELD_ID}-error`;

  return (
    <div>
      {editing ? (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <p className="text-[15px] leading-[22px] font-semibold">{trackingNumber ? "Change tracking ID" : "Add tracking ID"}</p>
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="from" value={status} />

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
              autoFocus={editingAfter !== null}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              required
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? fieldErrorId : `${TRACKING_FIELD_ID}-help`}
              className={cn(FIELD, "tabular-nums")}
            />
            {fieldError ? (
              <ErrorLine id={fieldErrorId} message={fieldError} />
            ) : (
              <p id={`${TRACKING_FIELD_ID}-help`} className="text-[13px] leading-[18px] text-ink-muted">
                {shipped ? "The customer sees the new ID on their order." : "Saving it marks the order as shipped."}
              </p>
            )}
          </div>

          <ErrorLine message={saveState.error} />

          <div className="flex gap-2">
            {trackingNumber && (
              <button type="button" onClick={() => setEditingAfter(null)} className={BUTTON_SECONDARY}>
                Cancel
              </button>
            )}
            <button type="submit" disabled={saving} className={cn(BUTTON_PRIMARY, "flex-1")}>
              {saving ? "Saving…" : "Update tracking"}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
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
              <p className="text-[13px] leading-[18px] text-ink-muted">
                {shippedOn ? `Shipped ${shippedOn}` : "Not shipped yet. The customer sees it once the order ships."}
              </p>
            </div>
            <button
              ref={editButton}
              type="button"
              onClick={() => {
                setValue(trackingNumber ?? "");
                setCourier(savedCarrier);
                setSent(null);
                setEditingAfter(lastSavedAt);
              }}
              className="-mr-2 inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-sm px-2 text-sm leading-5 font-semibold hover:bg-surface-sunken"
            >
              <Pencil className="size-4" strokeWidth={1.5} aria-hidden="true" />
              Edit<span className="sr-only"> tracking</span>
            </button>
          </div>
          {!shipped && (
            <form action={remove} className="flex flex-col gap-2">
              <input type="hidden" name="orderId" value={orderId} />
              <input type="hidden" name="from" value={status} />
              <ErrorLine message={removeState.error} />
              <button
                type="submit"
                disabled={removing}
                className="-ml-2 inline-flex min-h-11 cursor-pointer items-center self-start rounded-sm px-2 text-sm leading-5 font-semibold text-danger hover:bg-surface-sunken disabled:opacity-60"
              >
                {removing ? "Removing…" : "Remove tracking ID"}
              </button>
            </form>
          )}
        </div>
      )}
      <Toast message={latest.saved} at={latest.at} />
    </div>
  );
}
