// The WhatsApp bot's words: what a customer's message asks for, and the
// reply to each request. Pure; ./inbound.ts loads what a reply needs and
// sends it.
import type { OrderWithItems } from "@/db/orders";
import type { OrderStatus } from "@/db/schema";
import { formatOrderDate, formatOrderNumber, formatPaise, parseOrderNumber } from "@/lib/format";
import { isFulfilmentStatus, stepIndex, type FulfilmentStatus } from "@/lib/orders/fulfilment";
import { orderPath } from "@/lib/orders/path";
import { ORDER_STATUS_LABEL } from "@/lib/orders/status";
import { CARRIERS, carrierName, isCarrierId, normaliseTrackingNumber, type CarrierId } from "@/lib/shipping";

import type { ListRow, OutgoingMessage } from "./messages";
import { itemsSummary } from "./templates";

/** What a message asks for. The `admin_` ones and `ship` are answered only for ADMIN_WHATSAPP_NUMBERS. */
export type Intent =
  | { kind: "menu" }
  | { kind: "orders" }
  /** One order's details, or (no number) how to ask for them. */
  | { kind: "track"; number: number | null }
  | { kind: "link" }
  | { kind: "updates" }
  | { kind: "stop" }
  | { kind: "start" }
  | { kind: "page"; page: StorePage }
  | { kind: "contact" }
  | { kind: "admin_to_ship" }
  | { kind: "admin_ship_help" }
  /** An admin typed SHIP with an order and a tracking ID: asked to confirm. */
  | { kind: "ship"; number: number; trackingNumber: string; carrier: CarrierId | null }
  /** An admin tapped Confirm under a SHIP: the order, the status they confirmed from, the courier and AWB. */
  | { kind: "ship_confirm"; orderId: string; from: FulfilmentStatus; carrier: CarrierId; trackingNumber: string }
  | { kind: "ship_cancel" }
  /** Words the bot can't read, a photo or a voice note: a person may be needed. */
  | { kind: "unknown" };

export type StorePage = "bats" | "shop" | "offers";

const PAGES: Record<StorePage, { path: string; body: string; label: string }> = {
  bats: { path: "/shop/bats", body: "English and Kashmir willow bats, made by hand in Kashmir.", label: "Shop bats" },
  shop: { path: "/shop", body: "Bats, gloves, pads, helmets and the rest of our gear.", label: "Open the shop" },
  offers: { path: "/offers", body: "Today's offers and coupon codes.", label: "See offers" },
};

const GREETING = /^(hi+|hey+|hello+|helo|hlo|hii+|menu|help|namaste|hai|yo|start over|main menu|options)\b/;

/** What a message asks for: the row or button tapped, else the words typed. */
export function readIntent(message: { text: string | null; choice: string | null }): Intent {
  if (message.choice) return intentOfChoice(message.choice);
  if (!message.text) return { kind: "unknown" };
  const words = message.text.trim().toLowerCase().replace(/[.!?]+$/, "").replace(/\s+/g, " ");

  if (/^(stop|unsubscribe|stop updates)$/.test(words)) return { kind: "stop" };
  if (/^(start|subscribe|start updates)$/.test(words)) return { kind: "start" };
  if (/^link( my)?( whatsapp)?( account)?$/.test(words)) return { kind: "link" };
  if (/^(my )?orders?$/.test(words)) return { kind: "orders" };
  if (/^track( my)?( order)?$/.test(words)) return { kind: "track", number: null };
  if (/^(to ship|ship list|orders to ship)$/.test(words)) return { kind: "admin_to_ship" };
  if (words === "ship") return { kind: "admin_ship_help" };

  const ship = /^ship (.+)$/.exec(words);
  if (ship) return readShip(ship[1]);

  const number = /^(?:#|order(?: no\.?| number)? ?)?(ast-? ?\d{5,10}|\d{5,10})$/.exec(words);
  if (number) {
    const parsed = parseOrderNumber(number[1].replace(/\s/g, ""));
    if (parsed !== null) return { kind: "track", number: parsed };
  }
  if (GREETING.test(words)) return { kind: "menu" };
  return { kind: "unknown" };
}

/** "10023 5001 2345 6789 delhivery" → the order, the AWB and, if named last, the courier. */
function readShip(rest: string): Intent {
  const [first, ...others] = rest.split(" ");
  const number = parseOrderNumber(first);
  const last = others.at(-1);
  const carrier = isCarrierId(last) ? last : null;
  const trackingNumber = normaliseTrackingNumber((carrier ? others.slice(0, -1) : others).join(""));
  if (number === null || !/^[A-Z0-9]{6,20}$/.test(trackingNumber)) return { kind: "admin_ship_help" };
  return { kind: "ship", number, trackingNumber, carrier };
}

/** The button id that confirms a SHIP: everything needed to do it, so the bot keeps no state between messages. */
export function shipConfirmId(input: { orderId: string; from: FulfilmentStatus; carrier: CarrierId; trackingNumber: string }): string {
  return `ship:${input.orderId}:${input.from}:${input.carrier}:${input.trackingNumber}`;
}

function intentOfChoice(id: string): Intent {
  const ship = /^ship:([0-9a-f-]{36}):([a-z_]+):([a-z]+):([A-Z0-9]{6,20})$/.exec(id);
  if (ship) {
    const [, orderId, from, carrier, trackingNumber] = ship;
    if (isFulfilmentStatus(from) && isCarrierId(carrier)) {
      return { kind: "ship_confirm", orderId, from, carrier, trackingNumber };
    }
  }
  switch (id) {
    case "menu":
      return { kind: "menu" };
    case "orders":
      return { kind: "orders" };
    case "track":
      return { kind: "track", number: null };
    case "link":
      return { kind: "link" };
    case "updates":
      return { kind: "updates" };
    case "stop":
      return { kind: "stop" };
    case "start":
      return { kind: "start" };
    case "bats":
    case "shop":
    case "offers":
      return { kind: "page", page: id };
    case "contact":
      return { kind: "contact" };
    case "admin:to-ship":
      return { kind: "admin_to_ship" };
    case "admin:ship-help":
      return { kind: "admin_ship_help" };
    case "ship:cancel":
      return { kind: "ship_cancel" };
    default:
      return { kind: "unknown" };
  }
}

/** Who is writing, as far as the menu cares. */
export interface Writer {
  name: string | null;
  /** The account's email when this number is linked to one. */
  linkedEmail: string | null;
  admin: boolean;
  optedOut: boolean;
}

const MENU_BUTTON = { type: "buttons" as const, buttons: [{ id: "menu", title: "Menu" }] };

/** The list menu: orders, the shop, the account and help, and for an admin the orders to ship. */
export function menuMessage(writer: Writer, storeName: string): OutgoingMessage {
  const first = writer.name?.trim().split(/\s+/)[0];
  const account: ListRow = writer.linkedEmail
    ? { id: "link", title: "Linked account", description: `Linked to ${writer.linkedEmail}` }
    : { id: "link", title: "Link my account", description: "See all your orders here and get their updates" };
  const sections: { title: string; rows: ListRow[] }[] = [
    {
      title: "Orders",
      rows: [
        { id: "orders", title: "My orders", description: "Your recent orders and where they are" },
        { id: "track", title: "Track an order", description: "Send an order number like AST-10023" },
      ],
    },
    {
      title: "Shop",
      rows: [
        { id: "bats", title: "Cricket bats", description: "English and Kashmir willow" },
        { id: "shop", title: "All gear", description: "Gloves, pads, helmets and more" },
        { id: "offers", title: "Offers", description: "Today's offers and coupon codes" },
      ],
    },
    {
      title: "Account and help",
      rows: [
        account,
        {
          id: "updates",
          title: "Order updates",
          description: writer.optedOut ? "Off: turn WhatsApp updates back on" : "On: turn WhatsApp updates off",
        },
        { id: "contact", title: "Talk to us", description: "Sizes, orders or anything else" },
      ],
    },
  ];
  if (writer.admin) {
    sections.unshift({
      title: "Admin",
      rows: [
        { id: "admin:to-ship", title: "Orders to ship", description: "Paid orders waiting for a tracking ID" },
        { id: "admin:ship-help", title: "Add tracking", description: "Mark an order shipped with its tracking ID" },
      ],
    });
  }
  return {
    type: "list",
    header: storeName,
    body: `${first ? `Hi ${first}! ` : "Hi! "}How can we help? Tap Menu and choose.`,
    footer: "Reply STOP to turn off order updates",
    button: "Menu",
    sections,
  };
}

/** A path on the site as a full address. */
function link(siteUrl: string, path: string): string {
  return `${siteUrl.replace(/\/+$/, "")}${path}`;
}

/** The customer-facing state of an order, with its tracking once shipped. */
function statusLine(order: OrderWithItems): string {
  const status = ORDER_STATUS_LABEL[order.status];
  if ((order.status === "shipped" || order.status === "delivered") && order.trackingNumber) {
    return `${status} · ${carrierName(order.carrier)} ${order.trackingNumber}`;
  }
  return status;
}

/** A customer's recent orders, newest first, or what to do when none were found. */
export function ordersMessage(orders: OrderWithItems[], options: { linked: boolean; siteUrl: string }): OutgoingMessage {
  if (orders.length === 0) {
    return {
      type: "buttons",
      body: options.linked
        ? "You have no orders yet."
        : "We couldn't find orders placed with this WhatsApp number. If you ordered with another mobile number, link your account to see your orders here.",
      buttons: options.linked
        ? [{ id: "bats", title: "Shop bats" }, MENU_BUTTON.buttons[0]]
        : [{ id: "link", title: "Link my account" }, MENU_BUTTON.buttons[0]],
    };
  }
  const lines = orders.map(
    (order) =>
      `*${formatOrderNumber(order.number)}*${order.isTest ? " (test)" : ""} · ${formatOrderDate(order.createdAt)}\n` +
      `${itemsSummary(order.items)}\n${statusLine(order)} · ${formatPaise(order.totalPaise)}`
  );
  return {
    type: "buttons",
    body: `Your recent orders:\n\n${lines.join("\n\n")}\n\nSend an order number for its details.`,
    buttons: [MENU_BUTTON.buttons[0]],
  };
}

/** One order's details: what is in it, where it is, and its page on the site. */
export function orderMessage(order: OrderWithItems, siteUrl: string): OutgoingMessage {
  const lines = [
    `*${formatOrderNumber(order.number)}*${order.isTest ? " (test order)" : ""}`,
    `Placed ${formatOrderDate(order.createdAt)} · ${formatPaise(order.totalPaise)}`,
    ...order.items.map((item) => `• ${item.productName}${item.quantity > 1 ? ` × ${item.quantity}` : ""}`),
    "",
    `Status: *${ORDER_STATUS_LABEL[order.status]}*`,
  ];
  if (order.trackingNumber && (order.status === "shipped" || order.status === "delivered")) {
    lines.push(`Courier: ${carrierName(order.carrier)}`, `Tracking number: ${order.trackingNumber}`);
    if (isCarrierId(order.carrier)) lines.push(`Track it at ${CARRIERS[order.carrier].trackingUrl}`);
  }
  return { type: "link", body: lines.join("\n"), label: "View order", url: link(siteUrl, orderPath(order)) };
}

export function trackPromptMessage(): OutgoingMessage {
  return { type: "text", body: "Send your order number, like AST-10023. It is in your order email." };
}

export function orderNotFoundMessage(number: number, siteUrl: string): OutgoingMessage {
  return {
    type: "link",
    body: `We couldn't find ${formatOrderNumber(number)} for this WhatsApp number. Check the number, or track it on our site with the mobile number you ordered with.`,
    label: "Track on the site",
    url: link(siteUrl, "/track-order"),
  };
}

export function pageMessage(page: StorePage, siteUrl: string): OutgoingMessage {
  const { path, body, label } = PAGES[page];
  return { type: "link", body, label, url: link(siteUrl, path) };
}

/** Linking starts here: the link signs them in on the site and ties this number to the account. */
export function linkMessage(url: string): OutgoingMessage {
  return {
    type: "link",
    body: "Tap below and sign in to link this WhatsApp number to your Astaad Sports account. You will then see all your orders here and get their updates. The link works for 30 minutes.",
    label: "Link account",
    url,
  };
}

export function alreadyLinkedMessage(email: string, siteUrl: string): OutgoingMessage {
  return {
    type: "link",
    body: `This WhatsApp number is linked to ${email}. To unlink it, open your account on our site.`,
    label: "Your account",
    url: link(siteUrl, "/account"),
  };
}

export function linkedMessage(email: string): OutgoingMessage {
  return {
    type: "buttons",
    body: `Done! This WhatsApp number is now linked to ${email}. Your order updates will come here.`,
    buttons: [{ id: "orders", title: "My orders" }, MENU_BUTTON.buttons[0]],
  };
}

export function updatesMessage(optedOut: boolean): OutgoingMessage {
  return optedOut
    ? {
        type: "buttons",
        body: "WhatsApp order updates are off for this number.",
        buttons: [{ id: "start", title: "Turn updates on" }, MENU_BUTTON.buttons[0]],
      }
    : {
        type: "buttons",
        body: "You get updates here when an order is placed, ships and is delivered.",
        buttons: [{ id: "stop", title: "Stop updates" }, MENU_BUTTON.buttons[0]],
      };
}

export function stoppedMessage(): OutgoingMessage {
  return {
    type: "buttons",
    body: "You won't get order updates on WhatsApp any more. Reply START to turn them back on.",
    buttons: [{ id: "start", title: "Turn updates on" }],
  };
}

export function startedMessage(): OutgoingMessage {
  return { ...MENU_BUTTON, body: "Order updates are on. We'll message you here when your orders ship and arrive." };
}

/**
 * Talk to us: when this is the shop's own WhatsApp (a person reads it too),
 * just to write here; otherwise the shop's number and email.
 */
export function contactMessage(store: { phoneHref: string | null; email: string | null; sameNumber: boolean }): OutgoingMessage {
  if (store.sameNumber || (!store.phoneHref && !store.email)) {
    return { type: "text", body: "Write your question here and someone from our team will reply soon." };
  }
  const ways = [store.email && `email us at ${store.email}`].filter(Boolean);
  if (store.phoneHref) {
    return {
      type: "link",
      body: `Our team answers on WhatsApp${ways.length ? `, or ${ways[0]}` : ""}.`,
      label: "Chat with us",
      url: store.phoneHref,
    };
  }
  return { type: "text", body: `Please ${ways[0]} and we'll reply soon.` };
}

// --- Admins --------------------------------------------------------------------

export function shipHelpMessage(defaultCarrier: string): OutgoingMessage {
  return {
    type: "text",
    body:
      "To mark an order shipped, send SHIP, the order number and the tracking ID:\n\n" +
      "SHIP 10023 500123456789\n\n" +
      `It goes with ${carrierName(defaultCarrier)}. For another courier, add its name at the end: ` +
      `${Object.keys(CARRIERS).map((id) => id.toUpperCase()).join(" or ")}. ` +
      "Sending it again for a shipped order corrects the tracking ID.",
  };
}

/** Paid orders not yet shipped, oldest first, for an admin. */
export function toShipMessage(orders: Pick<OrderWithItems, "number" | "status" | "shipName" | "shipCity" | "items" | "paidAt">[]): OutgoingMessage {
  if (orders.length === 0) return { ...MENU_BUTTON, body: "Nothing to ship: every paid order has its tracking ID." };
  const lines = orders.map(
    (order) =>
      `*${formatOrderNumber(order.number)}* · ${ORDER_STATUS_LABEL[order.status]}\n${order.shipName}, ${order.shipCity}\n${itemsSummary(order.items)}`
  );
  return {
    type: "buttons",
    body: `${orders.length === 1 ? "1 order" : `${orders.length} orders`} to ship:\n\n${lines.join("\n\n")}\n\nTo ship one, send SHIP, its number and the tracking ID.`,
    buttons: [{ id: "admin:ship-help", title: "How to add tracking" }],
  };
}

/** Whether an order can take a tracking ID now: once paid and not cancelled. */
export function canTakeTracking(status: OrderStatus): status is FulfilmentStatus {
  return isFulfilmentStatus(status) && stepIndex(status) >= stepIndex("paid");
}

/** Asking an admin to confirm a SHIP, with the order's details so a mistyped number is caught. */
export function shipConfirmMessage(
  order: Pick<OrderWithItems, "id" | "number" | "status" | "shipName" | "shipCity" | "items" | "trackingNumber" | "isTest">,
  shipment: { carrier: CarrierId; trackingNumber: string }
): OutgoingMessage {
  if (!canTakeTracking(order.status)) {
    return { ...MENU_BUTTON, body: `${formatOrderNumber(order.number)} is ${ORDER_STATUS_LABEL[order.status].toLowerCase()}, so it can't be shipped.` };
  }
  const correcting = stepIndex(order.status) >= stepIndex("shipped");
  const what = correcting
    ? `Change the tracking ID of ${formatOrderNumber(order.number)} from ${order.trackingNumber ?? "none"} to ${shipment.trackingNumber}?`
    : `Mark ${formatOrderNumber(order.number)} shipped?`;
  return {
    type: "buttons",
    body:
      `${what}\n\n${order.shipName}, ${order.shipCity}\n${itemsSummary(order.items)}${order.isTest ? " (test order)" : ""}\n\n` +
      `Courier: ${carrierName(shipment.carrier)}\nTracking ID: ${shipment.trackingNumber}\n\n` +
      "The customer gets the update by email and WhatsApp.",
    buttons: [
      { id: shipConfirmId({ orderId: order.id, from: order.status, ...shipment }), title: correcting ? "Yes, change it" : "Yes, ship it" },
      { id: "ship:cancel", title: "Cancel" },
    ],
  };
}

export function shippedMessage(order: { number: number }, shipment: { carrier: CarrierId; trackingNumber: string }, corrected: boolean): OutgoingMessage {
  return {
    ...MENU_BUTTON,
    body: corrected
      ? `Tracking ID of ${formatOrderNumber(order.number)} changed to ${shipment.trackingNumber}. The customer is being told.`
      : `${formatOrderNumber(order.number)} is marked shipped with ${carrierName(shipment.carrier)}, tracking ID ${shipment.trackingNumber}. The customer is being told.`,
  };
}

export function notAdminMessage(): OutgoingMessage {
  return { ...MENU_BUTTON, body: "Sorry, we didn't understand that. Tap Menu to see what we can help with." };
}
