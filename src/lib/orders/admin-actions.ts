"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { cancelOrder, removeOrderTracking, saveOrderTracking, setOrderStatus, type FulfilmentUpdate } from "@/db/orders";
import { isAdmin } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/session";
import {
  notifyCancelled,
  notifyDelivered,
  notifyLater,
  notifyPacked,
  notifyShipment,
  retryOrderEmail,
} from "@/lib/email/notify";
import { resendConfigured } from "@/lib/email/resend";
import { formatOrderNumber } from "@/lib/format";
import { ADMIN_STATUS_LABEL, CANCELLABLE_STEPS, FULFILMENT_STEPS, stepIndex } from "@/lib/orders/fulfilment";
import { productsChanged } from "@/lib/products/catalogue";
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
 * marked shipped; a shipped one just has its tracking corrected. After the
 * response the customer is emailed that it shipped, or, for a correction
 * while it is on its way, the new tracking ID.
 */
export async function saveTracking(_previous: AdminActionState, form: FormData): Promise<AdminActionState> {
  if (!(await signedInAdmin())) return NOT_ADMIN;

  const parsed = shipOrderSchema.extend({ from: z.enum(FULFILMENT_STEPS) }).safeParse({
    orderId: form.get("orderId"),
    carrier: form.get("carrier"),
    trackingNumber: String(form.get("trackingNumber") ?? ""),
    from: form.get("from"),
  });
  if (!parsed.success) {
    const idIssue = parsed.error.issues.find((issue) => issue.path[0] === "trackingNumber");
    return idIssue ? { fieldError: idIssue.message, at: Date.now() } : INCOMPLETE;
  }

  const { orderId, carrier, trackingNumber, from } = parsed.data;
  const result = await saveOrderTracking(orderId, { carrier, trackingNumber, from });
  if (!result.ok) return failure(result, trackingNumber);

  notifyLater(() => notifyShipment(orderId));
  refresh();
  return { saved: "Tracking updated", at: Date.now() };
}

const statusChangeSchema = z.object({
  orderId: z.uuid(),
  from: z.enum(FULFILMENT_STEPS),
  to: z.enum(FULFILMENT_STEPS),
});

/**
 * Move the order to any fulfilment step, from the status the admin saw.
 * Moving it on to Packed, Shipped or Delivered emails the customer (and
 * copies the admins) after the response; moving it back never does.
 */
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

  if (stepIndex(to) > stepIndex(from)) {
    if (to === "packed") notifyLater(() => notifyPacked(orderId));
    if (to === "shipped") notifyLater(() => notifyShipment(orderId));
    if (to === "delivered") notifyLater(() => notifyDelivered(orderId));
  }
  refresh();
  return { saved: `Marked as ${ADMIN_STATUS_LABEL[to].toLowerCase()}`, at: Date.now() };
}

/** Remove a wrong tracking ID from an order that has not shipped yet. */
export async function removeTracking(_previous: AdminActionState, form: FormData): Promise<AdminActionState> {
  if (!(await signedInAdmin())) return NOT_ADMIN;

  const parsed = z.object({ orderId: z.uuid(), from: z.enum(FULFILMENT_STEPS) }).safeParse({
    orderId: form.get("orderId"),
    from: form.get("from"),
  });
  if (!parsed.success) return INCOMPLETE;

  const result = await removeOrderTracking(parsed.data.orderId, parsed.data.from);
  if (!result.ok) return failure(result);

  refresh();
  return { saved: "Tracking ID removed", at: Date.now() };
}

const cancelSchema = z.object({
  orderId: z.uuid(),
  from: z.enum(CANCELLABLE_STEPS),
});

/**
 * Cancel the order, from the status the admin saw: its items go back in
 * stock, and after the response the customer is emailed the cancellation and
 * refund (the admins copied). The refund itself is made in Razorpay.
 */
export async function cancelOrderAction(_previous: AdminActionState, form: FormData): Promise<AdminActionState> {
  if (!(await signedInAdmin())) return NOT_ADMIN;

  const parsed = cancelSchema.safeParse({ orderId: form.get("orderId"), from: form.get("from") });
  if (!parsed.success) return INCOMPLETE;
  const { orderId, from } = parsed.data;

  const result = await cancelOrder(orderId, from);
  if (!result.ok) return failure(result);

  if (result.stockChanged) productsChanged();
  notifyLater(() => notifyCancelled(orderId));
  refresh();
  return { saved: "Order cancelled", at: Date.now() };
}

/**
 * Send an order email again, from the notice on the order page: one that
 * failed, or one that never finished sending. The answer is about that email
 * only.
 */
export async function retryEmail(_previous: AdminActionState, form: FormData): Promise<AdminActionState> {
  if (!(await signedInAdmin())) return NOT_ADMIN;

  const parsed = z.object({ emailId: z.uuid() }).safeParse({ emailId: form.get("emailId") });
  if (!parsed.success) return INCOMPLETE;
  if (!resendConfigured()) {
    return { error: "Order emails are off. Set RESEND_API_KEY to send them.", at: Date.now() };
  }

  const result = await retryOrderEmail(parsed.data.emailId);
  refresh();
  const at = Date.now();
  const [failed] = result.failed;
  if (failed) return { error: `The email didn't send: ${failed.error}`, at };
  if (result.sent.length > 0) return { saved: "Email sent", at };
  if (result.alreadySent) return { saved: "Already sent", at };
  if (result.stopped) return { error: "Couldn't send it just now. Try again.", at };
  return { error: "Nothing was sent: the order has changed since this email failed.", at };
}
