"use client";

import { useActionState, useId } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrderStatus } from "@/db/schema";
import { saveDelivered, saveShipment, type ShipmentFormState } from "@/lib/orders/admin-actions";
import { CARRIERS, DEFAULT_CARRIER, isCarrierId } from "@/lib/shipping";

const INITIAL: ShipmentFormState = {};
const CARRIER_IDS = Object.keys(CARRIERS) as (keyof typeof CARRIERS)[];

function Message({ state }: { state: ShipmentFormState }) {
  if (state.error) {
    return (
      <p role="alert" className="type-body-sm text-danger">
        {state.error}
      </p>
    );
  }
  if (state.saved) {
    return (
      <p role="status" className="type-body-sm font-semibold text-success">
        {state.saved}
      </p>
    );
  }
  return null;
}

/**
 * Book the parcel with Trackon, then enter its AWB here to mark the order
 * shipped. A shipped order can have its AWB corrected, or be marked delivered.
 */
export function ShipmentForm({
  orderId,
  status,
  carrier,
  trackingNumber,
}: {
  orderId: string;
  status: Extract<OrderStatus, "paid" | "shipped">;
  carrier: string | null;
  trackingNumber: string | null;
}) {
  const id = useId();
  const [shipState, shipAction, shipping] = useActionState(saveShipment, INITIAL);
  const [deliverState, deliverAction, delivering] = useActionState(saveDelivered, INITIAL);
  const selectedCarrier = isCarrierId(carrier) ? carrier : DEFAULT_CARRIER;
  const shipped = status === "shipped";

  return (
    <div className="flex flex-col gap-5">
      <form action={shipAction} className="flex flex-col gap-4">
        <input type="hidden" name="orderId" value={orderId} />
        {CARRIER_IDS.length > 1 ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-carrier`}>Courier</Label>
            <select
              id={`${id}-carrier`}
              name="carrier"
              defaultValue={selectedCarrier}
              className="h-11 w-full rounded-md border border-input bg-surface-raised px-4 text-[15px]"
            >
              {CARRIER_IDS.map((carrierId) => (
                <option key={carrierId} value={carrierId}>
                  {CARRIERS[carrierId].name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="carrier" value={selectedCarrier} />
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-awb`}>{CARRIERS[selectedCarrier].name} AWB number</Label>
          <Input
            id={`${id}-awb`}
            name="trackingNumber"
            defaultValue={trackingNumber ?? ""}
            autoComplete="off"
            spellCheck={false}
            required
            aria-invalid={shipState.fieldError ? true : undefined}
            aria-describedby={shipState.fieldError ? `${id}-awb-error` : undefined}
          />
          {shipState.fieldError && (
            <p id={`${id}-awb-error`} className="type-body-sm text-danger">
              {shipState.fieldError}
            </p>
          )}
        </div>
        <Message state={shipState} />
        <Button type="submit" size={shipped ? "default" : "lg"} variant={shipped ? "outline" : "default"} disabled={shipping}>
          {shipping ? "Saving…" : shipped ? "Update AWB" : "Mark as shipped"}
        </Button>
      </form>

      {shipped && (
        <form action={deliverAction} className="flex flex-col gap-3 border-t border-border pt-5">
          <input type="hidden" name="orderId" value={orderId} />
          <Message state={deliverState} />
          <Button type="submit" size="lg" disabled={delivering}>
            {delivering ? "Saving…" : "Mark as delivered"}
          </Button>
        </form>
      )}
    </div>
  );
}
