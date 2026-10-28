import "server-only";

import {
  getOrderByNumber,
  getOrderForWhatsApp,
  listOrdersForWhatsApp,
  listOrdersToShip,
  saveOrderTracking,
} from "@/db/orders";
import {
  applyWhatsAppStatus,
  claimUnaskedMenu,
  createLinkToken,
  getContact,
  notePersonReplied,
  recordInbound,
  setOptedOut,
  type ContactWithAccount,
} from "@/db/whatsapp";
import { notifyShipment } from "@/lib/email/notify";
import { formatOrderNumber, whatsappHref } from "@/lib/format";
import { stepIndex } from "@/lib/orders/fulfilment";
import { getFreshSettings } from "@/lib/settings/store";
import { DEFAULT_CARRIER, isCarrierId } from "@/lib/shipping";
import { siteUrl } from "@/lib/site";

import {
  alreadyLinkedMessage,
  contactMessage,
  linkMessage,
  menuMessage,
  notAdminMessage,
  orderMessage,
  orderNotFoundMessage,
  ordersMessage,
  pageMessage,
  readIntent,
  shipConfirmMessage,
  shippedMessage,
  shipHelpMessage,
  startedMessage,
  stoppedMessage,
  toShipMessage,
  trackPromptMessage,
  updatesMessage,
  type Intent,
} from "./bot";
import { markWhatsAppRead, sendWhatsApp, whatsappConfigured } from "./cloud-api";
import { waIdFromPhone, whatsappConfig } from "./config";
import type { OutgoingMessage } from "./messages";
import { whatsAppShipped } from "./notify";
import type { InboundMessage, WebhookContents } from "./webhook";

function logReason(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 300) : "unknown error";
}

/** The 10-digit mobile of an Indian waId, as orders store it; null for another country's. */
function localMobile(waId: string): string | null {
  return /^91\d{10}$/.test(waId) ? waId.slice(2) : null;
}

/**
 * Everything in one webhook delivery: delivery statuses update the order
 * updates they are about; a reply from the WhatsApp Business app quiets the
 * bot in that chat; each new message gets the bot's reply. Never throws.
 */
export async function handleWebhook(contents: WebhookContents): Promise<void> {
  for (const waId of contents.echoes) {
    await notePersonReplied(waId).catch((error) =>
      console.error(`WhatsApp Business app reply not noted: ${logReason(error)}`)
    );
  }
  for (const status of contents.statuses) {
    await applyWhatsAppStatus(status).catch((error) =>
      console.error(`WhatsApp status ${status.status} not recorded: ${logReason(error)}`)
    );
  }
  if (!(await whatsappConfigured())) return;
  for (const message of contents.messages) {
    try {
      await answer(message);
    } catch (error) {
      console.error(`WhatsApp message ${message.id} not answered: ${logReason(error)}`);
    }
  }
}

async function answer(message: InboundMessage): Promise<void> {
  const fresh = await recordInbound({ waId: message.from, profileName: message.profileName, messageId: message.id });
  if (!fresh) return; // Answered already.
  void markWhatsAppRead(message.id);
  const contact = await getContact(message.from);
  if (!contact) return;
  const reply = await replyTo(readIntent(message), contact);
  if (reply) await sendWhatsApp(contact.waId, reply);
}

/** The bot's reply to what a message asks for, or null to stay quiet (a person may answer). */
async function replyTo(intent: Intent, contact: ContactWithAccount): Promise<OutgoingMessage | null> {
  const config = whatsappConfig();
  const admin = config.adminNumbers.includes(contact.waId);
  const site = siteUrl();
  const owner = { userId: contact.userId, phone: localMobile(contact.waId) };
  const menu = async () =>
    menuMessage(
      { name: contact.profileName, linkedEmail: contact.linkedEmail, admin, optedOut: contact.optedOutAt !== null },
      (await getFreshSettings()).storeName
    );

  switch (intent.kind) {
    case "menu":
      return menu();
    case "unknown":
      // Words the bot can't read are often for a person: the menu at most every 12 hours, else quiet.
      return (await claimUnaskedMenu(contact.waId)) ? menu() : null;
    case "orders":
      return ordersMessage(await listOrdersForWhatsApp(owner), { linked: contact.userId !== null, siteUrl: site });
    case "track": {
      if (intent.number === null) return trackPromptMessage();
      // An admin can look up any order; a customer only theirs.
      const order = admin ? await getOrderByNumber(intent.number) : await getOrderForWhatsApp(intent.number, owner);
      return order ? orderMessage(order, site) : orderNotFoundMessage(intent.number, site);
    }
    case "link":
      if (contact.linkedEmail) return alreadyLinkedMessage(contact.linkedEmail, site);
      return linkMessage(`${site}/account/whatsapp/${await createLinkToken(contact.waId)}`);
    case "updates":
      return updatesMessage(contact.optedOutAt !== null);
    case "stop":
      await setOptedOut(contact.waId, true);
      return stoppedMessage();
    case "start":
      await setOptedOut(contact.waId, false);
      return startedMessage();
    case "page":
      return pageMessage(intent.page, site);
    case "contact": {
      const settings = await getFreshSettings();
      return contactMessage({
        phoneHref: settings.supportPhone ? whatsappHref(settings.supportPhone) : null,
        email: settings.supportEmail,
        sameNumber: config.businessNumber !== null && waIdFromPhone(settings.supportPhone) === config.businessNumber,
      });
    }
  }

  // The rest are an admin's. Anyone else is told the bot didn't understand.
  if (!admin) return notAdminMessage();
  switch (intent.kind) {
    case "admin_to_ship":
      return toShipMessage(await listOrdersToShip());
    case "admin_ship_help": {
      const { defaultCarrier } = await getFreshSettings();
      return shipHelpMessage(defaultCarrier);
    }
    case "ship": {
      const order = await getOrderByNumber(intent.number);
      if (!order) return { type: "text", body: `There is no order ${formatOrderNumber(intent.number)}.` };
      const { defaultCarrier } = await getFreshSettings();
      const carrier = intent.carrier ?? (isCarrierId(defaultCarrier) ? defaultCarrier : DEFAULT_CARRIER);
      return shipConfirmMessage(order, { carrier, trackingNumber: intent.trackingNumber });
    }
    case "ship_cancel":
      return { type: "text", body: "Cancelled. Nothing was changed." };
    case "ship_confirm": {
      const { orderId, from, carrier, trackingNumber } = intent;
      const saved = await saveOrderTracking(orderId, { carrier, trackingNumber, from });
      if (!saved.ok) {
        switch (saved.reason) {
          case "duplicate_tracking":
            return {
              type: "text",
              body: saved.otherOrderNumber
                ? `Tracking ID ${trackingNumber} is already on ${formatOrderNumber(saved.otherOrderNumber)}. Nothing was changed.`
                : `Tracking ID ${trackingNumber} is already on another order. Nothing was changed.`,
            };
          case "not_found":
            return { type: "text", body: "That order no longer exists." };
          default:
            return { type: "text", body: "The order changed since you sent SHIP, so nothing was changed. Send SHIP again." };
        }
      }
      // The same updates as saving tracking in the admin: the email, and WhatsApp for those who asked.
      await Promise.all([notifyShipment(orderId), whatsAppShipped(orderId)]);
      return shippedMessage(saved.order, { carrier, trackingNumber }, stepIndex(from) >= stepIndex("shipped"));
    }
  }
}
