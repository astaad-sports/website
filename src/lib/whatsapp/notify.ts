import "server-only";

import { getOrderForEmail, type AdminOrder } from "@/db/orders";
import type { WhatsAppMessageKind } from "@/db/schema";
import {
  claimWhatsAppMessage,
  getContactForUser,
  markWhatsAppFailed,
  markWhatsAppSent,
  optedOutAmong,
} from "@/db/whatsapp";
import { orderAtEmailStep, trackingRef } from "@/lib/email/kinds";
import { formatOrderNumber } from "@/lib/format";

import { sendWhatsApp, whatsappConfigured } from "./cloud-api";
import { waIdFromPhone, whatsappConfig } from "./config";
import { orderTemplate, TEMPLATES } from "./templates";

/** What a WhatsApp notifier did: how many messages Meta took, and how many it refused. */
export interface WhatsAppNotifyResult {
  sent: number;
  failed: number;
}

/** For the logs: the error's own message, never a message's contents. */
function logReason(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 300) : "unknown error";
}

/**
 * Who gets a customer's updates: the order's mobile when they ticked the
 * box at checkout (or bought with Buy now), and the number linked to their
 * account, which they asked for by linking it. Never a number that replied STOP.
 */
async function customerNumbers(order: AdminOrder): Promise<string[]> {
  const numbers = new Set<string>();
  const shipTo = order.whatsappUpdates ? waIdFromPhone(order.shipPhone) : null;
  if (shipTo) numbers.add(shipTo);
  if (order.userId) {
    const linked = await getContactForUser(order.userId);
    if (linked) numbers.add(linked.waId);
  }
  return withoutOptedOut([...numbers]);
}

async function withoutOptedOut(numbers: string[]): Promise<string[]> {
  const out = await optedOutAmong(numbers);
  return numbers.filter((number) => !out.has(number));
}

/** Claim, send and record one template to each number, at most once per order and `key`. */
async function sendTemplate(
  result: WhatsAppNotifyResult,
  order: AdminOrder,
  kind: WhatsAppMessageKind,
  numbers: string[],
  key: (to: string) => string
): Promise<void> {
  const { templateLanguage } = whatsappConfig();
  for (const to of numbers) {
    const claimed = await claimWhatsAppMessage({ orderId: order.id, kind, key: key(to), to, template: TEMPLATES[kind].name });
    if (!claimed) continue;
    try {
      const { id } = await sendWhatsApp(to, orderTemplate(kind, order, templateLanguage));
      result.sent += 1;
      await markWhatsAppSent(claimed.id, id).catch(() =>
        console.error(`Could not record the sent ${kind} WhatsApp for ${formatOrderNumber(order.number)}`)
      );
    } catch (error) {
      result.failed += 1;
      console.error(`WhatsApp ${kind} not sent for ${formatOrderNumber(order.number)}: ${logReason(error)}`);
      await markWhatsAppFailed(claimed.id, error instanceof Error ? error.message : String(error)).catch(() =>
        console.error(`Could not record the failed ${kind} WhatsApp for ${formatOrderNumber(order.number)}`)
      );
    }
  }
}

/**
 * Run a notifier: nothing at all until WhatsApp is configured, and never a
 * throw, so WhatsApp can neither hold up nor undo a payment or an admin action.
 */
async function run(
  name: string,
  orderId: string,
  notify: (result: WhatsAppNotifyResult, order: AdminOrder) => Promise<void>
): Promise<WhatsAppNotifyResult> {
  const result = { sent: 0, failed: 0 };
  if (!(await whatsappConfigured())) return result;
  try {
    const order = await getOrderForEmail(orderId);
    if (order) await notify(result, order);
  } catch (error) {
    console.error(`WhatsApp updates (${name}) for order ${orderId} stopped: ${logReason(error)}`);
  }
  return result;
}

/**
 * A paid order: the customer's "order placed" and the new-order alert to
 * each ADMIN_WHATSAPP_NUMBERS. Only while it is paid, confirmed or packed,
 * like the order confirmation email.
 */
export async function whatsAppOrderPaid(orderId: string): Promise<WhatsAppNotifyResult> {
  return run("order paid", orderId, async (result, order) => {
    if (!orderAtEmailStep("order_confirmation", order.status)) return;
    await sendTemplate(result, order, "order_placed", await customerNumbers(order), (to) => `order_placed:${to}`);
    const admins = await withoutOptedOut(whatsappConfig().adminNumbers);
    await sendTemplate(result, order, "new_order_alert", admins, (to) => `new_order_alert:${to}`);
  });
}

/**
 * A shipped order: "on its way" with the courier and tracking ID. Once per
 * tracking ID, so a corrected ID is sent again. Only while it is shipped.
 */
export async function whatsAppShipped(orderId: string): Promise<WhatsAppNotifyResult> {
  return run("shipped", orderId, async (result, order) => {
    if (order.status !== "shipped" || !order.carrier || !order.trackingNumber) return;
    const tracking = trackingRef(order.carrier, order.trackingNumber);
    await sendTemplate(result, order, "order_shipped", await customerNumbers(order), (to) => `order_shipped:${tracking}:${to}`);
  });
}

/** A delivered order: "delivered", once. Only while it is delivered. */
export async function whatsAppDelivered(orderId: string): Promise<WhatsAppNotifyResult> {
  return run("delivered", orderId, async (result, order) => {
    if (order.status !== "delivered") return;
    await sendTemplate(result, order, "order_delivered", await customerNumbers(order), (to) => `order_delivered:${to}`);
  });
}
