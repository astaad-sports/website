"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { markOrderDelivered, markOrderShipped, type ShipmentUpdate } from "@/db/orders";
import { isAdmin } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { formatOrderNumber } from "@/lib/format";
import { shipOrderSchema } from "@/lib/shipping";

export interface ShipmentFormState {
  /** Shown beside the AWB field. */
  fieldError?: string;
  error?: string;
  saved?: string;
}

const NOT_ADMIN: ShipmentFormState = { error: "Only store admins can update shipments. Sign in again." };

async function signedInAdmin() {
  return isAdmin(await getCurrentUser());
}

function failure(result: Exclude<ShipmentUpdate, { ok: true }>, trackingNumber?: string): ShipmentFormState {
  switch (result.reason) {
    case "duplicate_tracking":
      return {
        fieldError: result.otherOrderNumber
          ? `AWB ${trackingNumber} is already on order ${formatOrderNumber(result.otherOrderNumber)}.`
          : `AWB ${trackingNumber} is already on another order.`,
      };
    case "wrong_status":
      return { error: "This order has moved on since the page loaded. Refresh to see its status." };
    case "not_found":
      return { error: "This order no longer exists." };
  }
}

/** Record the Trackon AWB and mark the order shipped, or correct the AWB of a shipped order. */
export async function saveShipment(_previous: ShipmentFormState, form: FormData): Promise<ShipmentFormState> {
  if (!(await signedInAdmin())) return NOT_ADMIN;

  const parsed = shipOrderSchema.safeParse({
    orderId: form.get("orderId"),
    carrier: form.get("carrier"),
    trackingNumber: String(form.get("trackingNumber") ?? ""),
  });
  if (!parsed.success) {
    const awbIssue = parsed.error.issues.find((issue) => issue.path[0] === "trackingNumber");
    return awbIssue ? { fieldError: awbIssue.message } : { error: "The form was incomplete. Refresh and try again." };
  }

  const { orderId, carrier, trackingNumber } = parsed.data;
  const result = await markOrderShipped(orderId, { carrier, trackingNumber });
  if (!result.ok) return failure(result, trackingNumber);

  refresh();
  return { saved: `Shipped with AWB ${trackingNumber}.` };
}

/** Mark a shipped order delivered. */
export async function saveDelivered(_previous: ShipmentFormState, form: FormData): Promise<ShipmentFormState> {
  if (!(await signedInAdmin())) return NOT_ADMIN;

  const orderId = z.uuid().safeParse(form.get("orderId"));
  if (!orderId.success) return { error: "The form was incomplete. Refresh and try again." };

  const result = await markOrderDelivered(orderId.data);
  if (!result.ok) return failure(result);

  refresh();
  return { saved: "Marked as delivered." };
}
