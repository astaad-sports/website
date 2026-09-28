import "server-only";

import { after } from "next/server";

import {
  claimOrderEmail,
  getOrderEmail,
  lastEmailedTracking,
  markOrderEmailFailed,
  markOrderEmailSent,
  unsureTrackingSince,
} from "@/db/emails";
import { getOrderForEmail, type AdminOrder } from "@/db/orders";
import { lowStockAmong } from "@/db/products";
import type { OrderEmail, OrderEmailKind } from "@/db/schema";
import { formatOrderNumber } from "@/lib/format";
import { getFreshSettings } from "@/lib/settings/store";
import { siteUrl } from "@/lib/site";

import { emailConfig } from "./config";
import { failureReason, sendFailure } from "./failure";
import { orderAtEmailStep, sendingIsStale, trackingEmailKey, trackingRef } from "./kinds";
import { resendConfigured, sendEmail } from "./resend";
import {
  newOrderAlertEmail,
  orderCancelledEmail,
  orderConfirmationEmail,
  orderDeliveredEmail,
  orderPackedEmail,
  orderShippedEmail,
  trackingUpdatedEmail,
  type EmailStore,
  type RenderedEmail,
} from "./templates";

/** What a notifier did: the emails it sent, and the ones that failed with Resend's reason. */
export interface NotifyResult {
  sent: OrderEmailKind[];
  failed: { kind: OrderEmailKind; error: string }[];
  /** An error of ours (the database, say) stopped it part way. */
  stopped?: true;
}

function emptyResult(): NotifyResult {
  return { sent: [], failed: [] };
}

/** An order as it is now, with the store details its emails show. */
interface Loaded {
  order: AdminOrder;
  store: EmailStore;
  /** The support email from Settings, so a customer's reply reaches the shop. */
  replyTo: string | null;
}

async function load(orderId: string): Promise<Loaded | undefined> {
  const [order, settings] = await Promise.all([getOrderForEmail(orderId), getFreshSettings()]);
  if (!order) return undefined;
  return {
    order,
    store: {
      name: settings.storeName,
      supportEmail: settings.supportEmail,
      supportPhone: settings.supportPhone,
      address: settings.storeAddress,
      siteUrl: siteUrl(),
    },
    replyTo: settings.supportEmail,
  };
}

/** The email the order was placed with, else the account's; none when neither is known. */
function customerRecipients(order: AdminOrder): string[] {
  const address = order.email?.trim() || order.customer.email?.trim();
  return address ? [address] : [];
}

/**
 * ADMIN_EMAILS, for a hidden copy of the customer's emails after the
 * confirmation (the new-order alert stands in for that one). None from
 * Resend's test sender, which refuses the whole email when any address is
 * not the Resend account's own.
 */
function adminCopies(): string[] {
  const { adminRecipients, usingTestSender } = emailConfig();
  return usingTestSender ? [] : adminRecipients;
}

/** For the logs: the underlying error's own message, never a query's values or an email's contents. */
function logReason(error: unknown): string {
  const source = error instanceof Error && error.cause instanceof Error ? error.cause : error;
  return source instanceof Error ? `${source.name}: ${source.message}`.slice(0, 200) : "unknown error";
}

interface PlannedEmail {
  kind: OrderEmailKind;
  /** At most one email per order and key. */
  key: string;
  to: string[];
  /** The admins' hidden copy. */
  bcc?: string[];
  /** The courier and AWB a shipping email gives, e.g. "trackon:AWB123". */
  tracking?: string | null;
  /** Built only once the email is claimed, so a repeated call does no work. */
  render: () => RenderedEmail | Promise<RenderedEmail>;
}

/**
 * Claim one email, send it and record how that went. "taken" means it was
 * already sent or another call is sending it; "skipped" that it has nobody
 * to go to.
 */
async function sendOnce(
  result: NotifyResult,
  { order, replyTo }: Loaded,
  email: PlannedEmail
): Promise<"sent" | "failed" | "taken" | "skipped"> {
  if (email.to.length === 0) return "skipped";
  const claimed = await claimOrderEmail({
    orderId: order.id,
    kind: email.kind,
    key: email.key,
    recipients: email.to,
    tracking: email.tracking,
  });
  if (!claimed) return "taken";

  const number = formatOrderNumber(order.number);
  let resendId: string;
  try {
    const { subject, html, text } = await email.render();
    ({ id: resendId } = await sendEmail({
      to: email.to,
      bcc: email.bcc,
      subject,
      html,
      text,
      replyTo,
      tags: [
        { name: "kind", value: email.kind },
        { name: "order", value: number },
      ],
      idempotencyKey: claimed.idempotencyKey ?? undefined,
    }));
  } catch (error) {
    const reason = failureReason(error, email.kind);
    result.failed.push({ kind: email.kind, error: reason });
    console.error(`Order email not sent: ${email.kind} for ${number}`);
    // The key stays only if the email may have gone, so a retry within 24 hours is not sent twice.
    // Should this write fail too, the row stays "sending" and can be claimed again, key and all, after ten minutes.
    await markOrderEmailFailed(claimed.id, reason, { keepKey: sendFailure(error) === "unclear" }).catch(() =>
      console.error(`Could not record the failed ${email.kind} email for ${number}`)
    );
    return "failed";
  }

  result.sent.push(email.kind);
  // It went, whatever happens here. A row left "sending" is claimable again after ten minutes, but
  // with the same idempotency key, so within 24 hours Resend does not send it twice.
  await markOrderEmailSent(claimed.id, resendId).catch(() =>
    console.error(`Could not record the sent ${email.kind} email for ${number}`)
  );
  return "sent";
}

/**
 * Run a notifier: nothing at all without a Resend key, and never a throw,
 * so an email can neither hold up nor undo a payment or an admin action.
 */
async function run(name: string, orderId: string, notify: (result: NotifyResult) => Promise<void>): Promise<NotifyResult> {
  const result = emptyResult();
  if (!resendConfigured()) return result;
  try {
    await notify(result);
  } catch (error) {
    console.error(`Order emails (${name}) for order ${orderId} stopped: ${logReason(error)}`);
    result.stopped = true;
  }
  return result;
}

/**
 * A paid order: the customer's order confirmation, and the new-order alert
 * to everyone in ADMIN_EMAILS, which also lists the order's products that
 * are now low or out of stock. Nothing for an unpaid or cancelled order, or
 * one that has shipped.
 */
export async function notifyOrderPaid(orderId: string): Promise<NotifyResult> {
  return run("order paid", orderId, async (result) => {
    const loaded = await load(orderId);
    if (!loaded || !orderAtEmailStep("order_confirmation", loaded.order.status)) return;
    const { order, store } = loaded;
    const to = customerRecipients(order);

    await sendOnce(result, loaded, {
      kind: "order_confirmation",
      key: "order_confirmation",
      to,
      render: () => orderConfirmationEmail({ order, store }),
    });
    await sendOnce(result, loaded, {
      kind: "new_order_alert",
      key: "new_order_alert",
      to: emailConfig().adminRecipients,
      render: async () =>
        newOrderAlertEmail({
          order,
          store,
          customer: { name: order.customer.name?.trim() || order.shipName, email: to[0] ?? null },
          // The alert still goes if the stock check fails; it just leaves the list out.
          lowStock: await lowStockAmong(order.items.map((item) => item.productSlug)).catch(() => []),
        }),
    });
  });
}

/** A packed order: the customer's packed update (the admins copied), once. Only while the order is packed. */
export async function notifyPacked(orderId: string): Promise<NotifyResult> {
  return run("packed", orderId, async (result) => {
    const loaded = await load(orderId);
    if (!loaded || !orderAtEmailStep("packed", loaded.order.status)) return;
    const { order, store } = loaded;
    await sendOnce(result, loaded, {
      kind: "packed",
      key: "packed",
      to: customerRecipients(order),
      bcc: adminCopies(),
      render: () => orderPackedEmail({ order, store }),
    });
  });
}

/**
 * A shipped order's tracking: the shipping update the first time, then a
 * tracking update whenever the courier or tracking ID differs from the one
 * last emailed, or from one a later update may have given all the same.
 * Only while the order is shipped.
 */
export async function notifyShipment(orderId: string): Promise<NotifyResult> {
  return run("shipment", orderId, async (result) => {
    const loaded = await load(orderId);
    if (!loaded) return;
    const { order, store } = loaded;
    if (!orderAtEmailStep("shipped", order.status) || !order.carrier || !order.trackingNumber) return;
    const to = customerRecipients(order);
    const tracking = trackingRef(order.carrier, order.trackingNumber);

    const bcc = adminCopies();

    const shipped = await sendOnce(result, loaded, {
      kind: "shipped",
      key: "shipped",
      to,
      bcc,
      tracking,
      render: () => orderShippedEmail({ order, store }),
    });
    if (shipped !== "taken") return;

    // The customer already knows it shipped: write again only when the tracking changed since.
    // No latest email means the shipping email is stuck; Send again on the order page takes it over.
    const last = await lastEmailedTracking(order.id);
    if (!last) return;
    // A later update that failed but may have gone could have given the customer other tracking,
    // so a move back to the tracking last emailed is written too, following that update.
    const unsure = await unsureTrackingSince(order.id, last.id, tracking);
    if (!unsure && last.tracking === tracking) return;
    await sendOnce(result, loaded, {
      kind: "tracking_updated",
      key: trackingEmailKey(tracking, (unsure ?? last).id),
      to,
      bcc,
      tracking,
      render: () => trackingUpdatedEmail({ order, store }),
    });
  });
}

/** A delivered order: the delivery confirmation (the admins copied), once. Only while the order is delivered. */
export async function notifyDelivered(orderId: string): Promise<NotifyResult> {
  return run("delivered", orderId, async (result) => {
    const loaded = await load(orderId);
    if (!loaded || !orderAtEmailStep("delivered", loaded.order.status)) return;
    const { order, store } = loaded;
    await sendOnce(result, loaded, {
      kind: "delivered",
      key: "delivered",
      to: customerRecipients(order),
      bcc: adminCopies(),
      render: () => orderDeliveredEmail({ order, store }),
    });
  });
}

/**
 * A cancelled order: the customer's cancellation, with the refund, and the
 * admins copied. Once, and only while the order is cancelled.
 */
export async function notifyCancelled(orderId: string): Promise<NotifyResult> {
  return run("cancelled", orderId, async (result) => {
    const loaded = await load(orderId);
    if (!loaded || !orderAtEmailStep("cancelled", loaded.order.status)) return;
    const { order, store } = loaded;
    await sendOnce(result, loaded, {
      kind: "cancelled",
      key: "cancelled",
      to: customerRecipients(order),
      bcc: adminCopies(),
      render: () => orderCancelledEmail({ order, store }),
    });
  });
}

/** The notifier that sends each kind of email. */
const NOTIFIER: Record<OrderEmailKind, (orderId: string) => Promise<NotifyResult>> = {
  order_confirmation: notifyOrderPaid,
  new_order_alert: notifyOrderPaid,
  packed: notifyPacked,
  shipped: notifyShipment,
  tracking_updated: notifyShipment,
  delivered: notifyDelivered,
  cancelled: notifyCancelled,
};

/** What Send again did about the email clicked. */
export interface RetryResult extends NotifyResult {
  /** It had already gone, or another call is sending it now. */
  alreadySent?: true;
}

/**
 * Send a failed email again, or one that never finished sending (Send again
 * on the order page). Its notifier runs once more, so it goes only while the
 * order is still at the step the email is about (see canSendAgain in
 * ./kinds), and any other failed email of that notifier is retried too. The
 * result is about the clicked email alone.
 */
export async function retryOrderEmail(emailId: string): Promise<RetryResult> {
  if (!resendConfigured()) return emptyResult();
  let email: OrderEmail | undefined;
  try {
    email = await getOrderEmail(emailId);
  } catch (error) {
    console.error(`Could not load order email ${emailId} to send again: ${logReason(error)}`);
    return { ...emptyResult(), stopped: true };
  }
  if (!email) return emptyResult();
  if (email.status === "sent" || (email.status === "sending" && !sendingIsStale(email))) {
    return { ...emptyResult(), alreadySent: true };
  }

  const { kind, orderId } = email;
  const result = await NOTIFIER[kind](orderId);
  // A notifier sends at most one email of each kind, so this is the clicked one's.
  return {
    ...result,
    sent: result.sent.filter((sent) => sent === kind),
    failed: result.failed.filter((failed) => failed.kind === kind),
  };
}

/**
 * Run a notifier after the response has gone (Next's after()), so emailing
 * never slows or breaks a payment or an admin action. For Server Actions and
 * Route Handlers.
 */
export function notifyLater(task: () => Promise<unknown>): void {
  try {
    after(async () => {
      try {
        await task();
      } catch (error) {
        console.error(`Order email task failed: ${logReason(error)}`);
      }
    });
  } catch (error) {
    // after() throws outside a request; the caller's own work must still succeed.
    console.error(`Could not schedule an order email: ${logReason(error)}`);
  }
}
