"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { saveOrderTracking, setOrderStatus, type FulfilmentUpdate } from "@/db/orders";
import { isAdmin } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { formatOrderNumber } from "@/lib/format";
import { ADMIN_STATUS_LABEL, FULFILMENT_STEPS } from "@/lib/orders/fulfilment";
import { shipOrderSchema } from "@/lib/shipping";

export interface AdminActionState {
  /** Shown beside the tracking ID field. */
  fieldError?: string;
  error?: string;
  /** The success message for the toast, e.g. "Tracking updated". */
  saved?: string;
  /** Changes on every result, so the toast shows again for a repeated message. */
  at?: number;
}

const NOT_ADMIN: AdminActionState = { error: "Only store admins can change orders. Sign in again." };
const INCOMPLETE: AdminActionState = { error: "Something went wrong. Try again." };

async function signedInAdmin() {
  return isAdmin(await getCurrentUser());
}

function failure(result: Exclude<FulfilmentUpdate, { ok: true }>, trackingNumber?: string): AdminActionState {
  const at = Date.now();
  switch (result.reason) {
    case "duplicate_tracking":
      return {
        at,
        fieldError: result.otherOrderNumber
          ? `Tracking ID ${trackingNumber} is already on order #${formatOrderNumber(result.otherOrderNumber)}.`
          : `Tracking ID ${trackingNumber} is already on another order.`,
      };
    case "needs_tracking":
      return { at, error: "Add the tracking ID first. Saving it marks the order as shipped." };
    case "wrong_status":
      return { at, error: "This order changed since the page loaded. Refresh to see its status." };
    case "not_found":
      return { at, error: "This order no longer exists." };
  }
}

/**
 * Save the courier and tracking ID. An order that has not shipped yet is
 * marked shipped; a shipped one just has its tracking corrected.
 */
export async function saveTracking(_previous: AdminActionState, form: FormData): Promise<AdminActionState> {
  if (!(await signedInAdmin())) return NOT_ADMIN;

  const parsed = shipOrderSchema.safeParse({
    orderId: form.get("orderId"),
    carrier: form.get("carrier"),
    trackingNumber: String(form.get("trackingNumber") ?? ""),
  });
  if (!parsed.success) {
    const idIssue = parsed.error.issues.find((issue) => issue.path[0] === "trackingNumber");
    return idIssue ? { fieldError: idIssue.message, at: Date.now() } : INCOMPLETE;
  }

  const { orderId, carrier, trackingNumber } = parsed.data;
  const result = await saveOrderTracking(orderId, { carrier, trackingNumber });
  if (!result.ok) return failure(result, trackingNumber);

  refresh();
  return { saved: "Tracking updated", at: Date.now() };
}

const statusChangeSchema = z.object({
  orderId: z.uuid(),
  from: z.enum(FULFILMENT_STEPS),
  to: z.enum(FULFILMENT_STEPS),
});

/** Move the order to any fulfilment step, from the status the admin saw. */
export async function changeStatus(_previous: AdminActionState, form: FormData): Promise<AdminActionState> {
  if (!(await signedInAdmin())) return NOT_ADMIN;

  const parsed = statusChangeSchema.safeParse({
    orderId: form.get("orderId"),
    from: form.get("from"),
    to: form.get("to"),
  });
  if (!parsed.success) return INCOMPLETE;
  const { orderId, from, to } = parsed.data;
  if (from === to) return {};

  const result = await setOrderStatus(orderId, { from, to });
  if (!result.ok) return failure(result);

  refresh();
  return { saved: `Marked as ${ADMIN_STATUS_LABEL[to].toLowerCase()}`, at: Date.now() };
}
