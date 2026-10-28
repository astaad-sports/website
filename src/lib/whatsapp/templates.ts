// The message templates the store's WhatsApp order updates use, and the
// parameters each one is filled with. Meta delivers a business message to
// someone who hasn't written in the last 24 hours only as a template it has
// approved, so these are submitted once (scripts/whatsapp-templates.ts) and
// approved in WhatsApp Manager before anything goes. Pure.
import type { OrderWithItems } from "@/db/orders";
import type { WhatsAppMessageKind } from "@/db/schema";
import { formatOrderNumber, formatPaise } from "@/lib/format";
import { orderPath } from "@/lib/orders/path";
import { carrierName } from "@/lib/shipping";

import type { OutgoingMessage } from "./messages";

export interface TemplateDefinition {
  kind: WhatsAppMessageKind;
  /** Its name in WhatsApp Manager. A changed template needs a new name and a new approval. */
  name: string;
  /** The text, with {{1}}, {{2}}… where each parameter goes, in order. */
  body: string;
  /** Example values for Meta's review, one per parameter. */
  example: string[];
  /** The one button: it opens the site at "<SITE_URL>/{{1}}", the suffix filled per order. */
  button: { text: string; exampleSuffix: string };
}

/** Every template, in the order an order meets them. All are Utility templates. */
export const TEMPLATES: Record<WhatsAppMessageKind, TemplateDefinition> = {
  order_placed: {
    kind: "order_placed",
    name: "astaad_order_placed",
    body:
      "Hi {{1}}, thank you for your order {{2}}.\n\n" +
      "We have received your payment of {{3}} for {{4}}. We will message you here when it ships.",
    example: ["Rahul", "AST-10023", "₹ 4,999", "Astaad Falcon Pro"],
    button: { text: "View order", exampleSuffix: "account/orders/10023" },
  },
  order_shipped: {
    kind: "order_shipped",
    name: "astaad_order_shipped",
    body:
      "Good news, {{1}}! Your order {{2}} is on its way with {{3}}.\n\n" +
      "Tracking number: {{4}}\n\nTap below to follow your order.",
    example: ["Rahul", "AST-10023", "Trackon Couriers", "500123456789"],
    button: { text: "Track order", exampleSuffix: "account/orders/10023" },
  },
  order_delivered: {
    kind: "order_delivered",
    name: "astaad_order_delivered",
    body:
      "Hi {{1}}, your order {{2}} has been delivered.\n\n" +
      "We hope you enjoy it. If anything is not right, reply to this message and we will help.",
    example: ["Rahul", "AST-10023"],
    button: { text: "View order", exampleSuffix: "account/orders/10023" },
  },
  new_order_alert: {
    kind: "new_order_alert",
    name: "astaad_new_order_alert",
    body:
      "New order {{1}} for {{2}}.\n\n" +
      "Customer: {{3}}\nItems: {{4}}\nShip to: {{5}}\n\nOpen it in the admin to confirm and pack it.",
    example: ["AST-10023", "₹ 4,999", "Rahul Sharma, +91 98765 43210", "Astaad Falcon Pro × 1", "Srinagar, Jammu and Kashmir"],
    button: { text: "Open order", exampleSuffix: "admin/orders/10023" },
  },
};

/** How the admin names each update, e.g. on the order page. */
export const WHATSAPP_MESSAGE_LABEL: Record<WhatsAppMessageKind, string> = {
  order_placed: "Order placed",
  order_shipped: "Shipped",
  order_delivered: "Delivered",
  new_order_alert: "New order alert",
};

/** The first word of a name, for a greeting: "Rahul Sharma" → "Rahul". */
export function firstName(name: string | null | undefined): string {
  return name?.trim().split(/\s+/)[0] || "there";
}

/** What was bought, in a few words: "Astaad Falcon Pro × 2 and 1 more". */
export function itemsSummary(items: Pick<OrderWithItems["items"][number], "productName" | "quantity">[]): string {
  const [first, ...rest] = items;
  if (!first) return "your order";
  const lead = first.quantity > 1 ? `${first.productName} × ${first.quantity}` : first.productName;
  return rest.length > 0 ? `${lead} and ${rest.length} more` : lead;
}

/** A site path as a URL button's suffix: the template's address already ends in "/". */
function suffix(path: string): string {
  return path.replace(/^\/+/, "");
}

/** The number as the admin and customer read it, marked when it is a test order. */
function orderLabel(order: Pick<OrderWithItems, "number" | "isTest">): string {
  return `${formatOrderNumber(order.number)}${order.isTest ? " (test)" : ""}`;
}

/** A template message for an order, with its parameters in the order the template's text takes them. */
export function orderTemplate(
  kind: WhatsAppMessageKind,
  order: OrderWithItems,
  language: string
): Extract<OutgoingMessage, { type: "template" }> {
  const { name } = TEMPLATES[kind];
  const greeting = firstName(order.shipName);
  const customerPage = suffix(orderPath(order));
  const message = (body: string[], urlSuffix: string) => ({ type: "template" as const, name, language, body, urlSuffix });
  switch (kind) {
    case "order_placed":
      return message(
        [greeting, orderLabel(order), formatPaise(order.totalPaise), itemsSummary(order.items)],
        customerPage
      );
    case "order_shipped":
      return message(
        [greeting, orderLabel(order), carrierName(order.carrier), order.trackingNumber ?? "-"],
        customerPage
      );
    case "order_delivered":
      return message([greeting, orderLabel(order)], customerPage);
    case "new_order_alert":
      return message(
        [
          orderLabel(order),
          formatPaise(order.totalPaise),
          `${order.shipName}, +91 ${order.shipPhone}`,
          itemsSummary(order.items),
          `${order.shipCity}, ${order.shipState} ${order.shipPincode}`,
        ],
        `admin/orders/${order.number}`
      );
  }
}

/** How many {{n}} parameters a template's text takes. */
export function parameterCount(body: string): number {
  return new Set(body.match(/\{\{\d+\}\}/g) ?? []).size;
}

/**
 * The body for POST /<WABA id>/message_templates that submits a template for
 * approval, its button opening `siteUrl` with the order's path after it.
 */
export function templateSubmission(template: TemplateDefinition, siteUrl: string, language: string): Record<string, unknown> {
  return {
    name: template.name,
    language,
    category: "UTILITY",
    components: [
      { type: "BODY", text: template.body, example: { body_text: [template.example] } },
      {
        type: "BUTTONS",
        buttons: [
          {
            type: "URL",
            text: template.button.text,
            url: `${siteUrl.replace(/\/+$/, "")}/{{1}}`,
            example: [`${siteUrl.replace(/\/+$/, "")}/${template.button.exampleSuffix}`],
          },
        ],
      },
    ],
  };
}
