// The store's emails: the customer's confirmation, packed, shipping,
// corrected tracking, delivery, cancellation and refund emails, and the
// owner's alerts for a new order, an unpaid order and a new review. Each is a
// one-line subject plus HTML and plain text carrying the same information.
// Lines, totals and dates follow the customer's order page
// (src/app/account/orders/[number]/page.tsx), so an email never disagrees
// with it. Pure: src/lib/email/notify.ts loads the order and sends them.
import type { Order, OrderItem, OrderItemOffer } from "@/db/schema";
import { formatMobile, formatOrderDate, formatOrderNumber, formatPaise, mobileHref, whatsappHref } from "@/lib/format";
import { stockShortfallNotice } from "@/lib/orders/fulfilment";
import { CARRIERS, carrierName, isCarrierId } from "@/lib/shipping";

import { escapeHtml, html, raw, type SafeHtml } from "./html";
import {
  block,
  button,
  EMAIL_COLOURS as C,
  EMAIL_FONT,
  emailDocument,
  eyebrow,
  heading,
  MUTED,
  notice,
  panel,
  paragraph,
  sectionHeading,
  SMALL,
  TABLE,
  TEXT,
  textLink,
} from "./layout";

/** The store details an email needs: Settings, plus where the site lives. */
export interface EmailStore {
  name: string;
  supportEmail: string | null;
  supportPhone: string | null;
  /** The shop's postal address, on one line. */
  address: string | null;
  /** The site's origin with no trailing slash (siteUrl in src/lib/site.ts). */
  siteUrl: string;
}

/** An order with its lines, as the notifier loads it. */
export interface EmailOrder extends Order {
  items: OrderItem[];
}

/** A finished email: a one-line subject, the HTML and the plain text. */
export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

// --- Shared pieces -----------------------------------------------------------

function link(store: EmailStore, path: string): string {
  return `${store.siteUrl.replace(/\/+$/, "")}${path}`;
}

function orderUrl(store: EmailStore, order: EmailOrder): string {
  return link(store, `/account/orders/${order.number}`);
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

// Order numbers, amounts and dates stay on one line: "AST-" at the end of a
// line and "10001" at the start of the next reads badly on a phone.
const KEEP_TOGETHER = /AST-\d+|₹ [\d,]+|\b\d{1,2} [A-Z][a-z]{2,3} \d{4}\b/g;

/** Copy for the HTML: escaped, with order numbers, amounts and dates kept whole. */
function prose(text: string): SafeHtml {
  return raw(escapeHtml(text).replace(KEEP_TOGETHER, (match) => `<span style="white-space:nowrap;">${match}</span>`));
}

/** The same words as lineOfferText in src/components/cart/line-offer.tsx. */
function offerNote(offer: OrderItemOffer): string {
  return `${offer.code ? `Coupon ${offer.code}` : offer.name} · ${offer.percentOff}% off`;
}

/** What the line would have cost without its offer; null when the offer took nothing off. */
function regularLinePaise(item: OrderItem): number | null {
  return item.offer && item.offer.regularPricePaise > item.unitPricePaise
    ? item.offer.regularPricePaise * item.quantity
    : null;
}

function itemCount(order: EmailOrder): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Every line as on the order page: the name, each option as "Label: value",
 * the offer; then the price paid, the regular price struck through and
 * labelled in words (a strikethrough is not read out), and quantity × unit
 * price. The admin's copy sets the engraving in bold, as the admin order
 * page does, so it is copied letter for letter.
 */
function itemsHtml(items: OrderItem[], options: { emphasiseEngraving?: boolean } = {}): SafeHtml {
  const rows = items.map((item, index) => {
    const rule = index < items.length - 1 ? `border-bottom:1px solid ${C.border};` : "";
    const padding = `padding:${index === 0 ? 0 : 14}px 0 14px 0;`;
    const regular = regularLinePaise(item);
    return html`<tr>
<td valign="top" style="${padding}${rule}${TEXT}">
<div style="font-weight:bold;">${item.productName}</div>
${item.options.map(
  (option) =>
    html`<div style="${SMALL}"><span style="${MUTED}">${option.label}:</span> ${
      options.emphasiseEngraving && option.label === "Engraving"
        ? html`<strong style="letter-spacing:1px;">${option.value}</strong>`
        : option.value
    }</div>`
)}
${item.offer && html`<p style="margin:4px 0 0 0;${SMALL}font-weight:bold;">${offerNote(item.offer)}</p>`}
</td>
<td valign="top" align="right" style="${padding}padding-left:16px;${rule}${TEXT}white-space:nowrap;">
<div style="font-weight:bold;">${formatPaise(item.lineTotalPaise)}</div>
${regular !== null && html`<div style="${SMALL}${MUTED}white-space:normal;">Regular price <s style="text-decoration:line-through;white-space:nowrap;">${formatPaise(regular)}</s></div>`}
<div style="${SMALL}${MUTED}">${item.quantity} × ${formatPaise(item.unitPricePaise)}</div>
</td>
</tr>`;
  });
  return block(html`<table ${TABLE}>${rows}</table>`, { gap: 12 });
}

function itemsText(items: OrderItem[]): string[] {
  return items.flatMap((item) => {
    const regular = regularLinePaise(item);
    return [
      item.productName,
      ...item.options.map((option) => `  ${option.label}: ${option.value}`),
      ...(item.offer ? [`  ${offerNote(item.offer)}`] : []),
      `  ${item.quantity} × ${formatPaise(item.unitPricePaise)} = ${formatPaise(item.lineTotalPaise)}` +
        (regular !== null ? ` (regular price ${formatPaise(regular)})` : ""),
      "",
    ];
  });
}

/** Name and quantity only, for the emails about a parcel. */
function shortItemsHtml(items: OrderItem[]): SafeHtml {
  const rows = items.map(
    (item, index) => html`<tr>
<td valign="top" style="padding:${index === 0 ? 0 : 8}px 0 0 0;${TEXT}font-weight:bold;">${item.productName}</td>
<td valign="top" align="right" style="padding:${index === 0 ? 0 : 8}px 0 0 16px;${TEXT}${MUTED}white-space:nowrap;">Qty ${item.quantity}</td>
</tr>`
  );
  return block(html`<table ${TABLE}>${rows}</table>`, { gap: 24 });
}

function shortItemsText(items: OrderItem[]): string[] {
  return items.map((item) => `${item.productName} · Qty ${item.quantity}`);
}

interface PaymentRow {
  label: string;
  value: string;
  strong?: boolean;
}

/**
 * The Payment rows above the total, as on the order page. The subtotal is
 * at regular prices, so the rows add up with the discount taken off.
 */
function paymentRows(order: EmailOrder): PaymentRow[] {
  const rows: PaymentRow[] = [{ label: "Subtotal", value: formatPaise(order.subtotalPaise + order.discountPaise) }];
  if (order.discountPaise > 0) rows.push({ label: "Discount", value: `−${formatPaise(order.discountPaise)}` });
  if (order.couponCode) rows.push({ label: "Coupon", value: order.couponCode, strong: true });
  rows.push({ label: "Delivery", value: order.shippingPaise ? formatPaise(order.shippingPaise) : "Free" });
  return rows;
}

function paidNote(order: EmailOrder): string | null {
  return order.razorpayPaymentId && order.paidAt
    ? `Paid on ${formatOrderDate(order.paidAt)} · Razorpay payment ${order.razorpayPaymentId}`
    : null;
}

function paymentHtml(order: EmailOrder): SafeHtml {
  const rows = paymentRows(order).map(
    (row) => html`<tr>
<td style="padding:0 0 8px 0;${TEXT}${MUTED}">${row.label}</td>
<td align="right" style="padding:0 0 8px 16px;${TEXT}white-space:nowrap;${row.strong ? "font-weight:bold;" : ""}">${row.value}</td>
</tr>`
  );
  const note = paidNote(order);
  return block(
    html`<table ${TABLE}>${rows}<tr>
<td style="border-top:1px solid ${C.border};padding:12px 0 0 0;${TEXT}font-weight:bold;">Total</td>
<td align="right" style="border-top:1px solid ${C.border};padding:12px 0 0 16px;${TEXT}font-size:20px;line-height:26px;font-weight:bold;white-space:nowrap;">${formatPaise(order.totalPaise)}</td>
</tr></table>${note && html`<p style="margin:8px 0 0 0;${SMALL}${MUTED}">${prose(note)}</p>`}`,
    { gap: 24 }
  );
}

function paymentText(order: EmailOrder): string[] {
  const note = paidNote(order);
  return [
    ...paymentRows(order).map((row) => `${row.label}: ${row.value}`),
    `Total: ${formatPaise(order.totalPaise)}`,
    ...(note ? [note] : []),
  ];
}

function addressLines(order: EmailOrder): string[] {
  return [
    order.shipName,
    order.shipLine1,
    ...(order.shipLine2 ? [order.shipLine2] : []),
    `${order.shipCity}, ${order.shipState} ${order.shipPincode}`,
  ];
}

function addressHtml(order: EmailOrder): SafeHtml {
  const [name, ...rest] = addressLines(order);
  return block(
    html`<div style="font-weight:bold;">${name}</div>${rest.map((line) => html`<div>${line}</div>`)}<div style="${MUTED}">${formatMobile(order.shipPhone)}</div>`,
    { gap: 24, style: TEXT }
  );
}

function addressText(order: EmailOrder): string[] {
  return [...addressLines(order), formatMobile(order.shipPhone)];
}

/**
 * The courier and the tracking ID, large, in a panel; a tap selects the whole
 * ID. An ID has no spaces, so it may break anywhere rather than widen the
 * email on a phone, and a long one is set smaller so it usually fits a line.
 */
function trackingHtml(order: EmailOrder): SafeHtml {
  const id = order.trackingNumber ?? "";
  const size = id.length > 14 ? "font-size:22px;line-height:30px;" : "font-size:26px;line-height:34px;";
  return panel(html`<div style="${SMALL}${MUTED}">Courier</div>
<p style="margin:0 0 12px 0;${TEXT}font-weight:bold;">${carrierName(order.carrier)}</p>
<div style="${SMALL}${MUTED}">Tracking ID</div>
<div style="font-family:${EMAIL_FONT};${size}font-weight:bold;letter-spacing:1px;color:${C.ink};word-break:break-all;overflow-wrap:anywhere;-webkit-user-select:all;user-select:all;mso-line-height-rule:exactly;">${id}</div>`);
}

function trackingText(order: EmailOrder): string[] {
  return [`Courier: ${carrierName(order.carrier)}`, `Tracking ID: ${order.trackingNumber ?? ""}`];
}

/** "Track your parcel" on the courier's site (with how to use it), then "View your order". */
function trackingActionsHtml(order: EmailOrder, store: EmailStore): SafeHtml[] {
  const carrier = isCarrierId(order.carrier) ? CARRIERS[order.carrier] : null;
  return [
    ...(carrier
      ? [
          button(carrier.trackingUrl, "Track your parcel", { gap: 8 }),
          paragraph(`On the ${carrier.name} page, enter the tracking ID above.`, { small: true, muted: true, gap: 20 }),
        ]
      : []),
    button(orderUrl(store, order), "View your order", { variant: carrier ? "secondary" : "primary", gap: 28 }),
  ];
}

function trackingActionsText(order: EmailOrder, store: EmailStore): string[] {
  const carrier = isCarrierId(order.carrier) ? CARRIERS[order.carrier] : null;
  return [
    ...(carrier
      ? [`Track your parcel: ${carrier.trackingUrl}`, `On the ${carrier.name} page, enter the tracking ID above.`, ""]
      : []),
    `View your order: ${orderUrl(store, order)}`,
  ];
}

/** The small print on the customer's emails: the store's details, a way to reach it, and why this email came. */
function customerFooter(order: EmailOrder, store: EmailStore): { html: SafeHtml; text: string[] } {
  const why = `We sent this email because you placed order ${formatOrderNumber(order.number)} with ${store.name}.`;
  const contactUrl = link(store, "/contact");
  const reach = [
    store.supportPhone &&
      html`<a href="${mobileHref(store.supportPhone)}" style="color:${C.inkMuted};text-decoration:none;">${store.supportPhone}</a>`,
    store.supportEmail &&
      html`<a href="mailto:${store.supportEmail}" style="color:${C.inkMuted};text-decoration:none;">${store.supportEmail}</a>`,
  ].filter((part): part is SafeHtml => Boolean(part));
  return {
    html: html`<div style="font-weight:bold;color:${C.ink};">${store.name}</div>
${store.address && html`<div>${store.address}</div>`}
${reach.length > 0 && html`<div>${reach.map((part, index) => html`${index > 0 && " · "}${part}`)}</div>`}
<p style="margin:8px 0 0 0;${SMALL}${MUTED}">${textLink(contactUrl, "Contact us", { muted: true })}</p>
<p style="margin:16px 0 0 0;${SMALL}${MUTED}">${prose(why)}</p>`,
    text: [
      "--",
      store.name,
      ...(store.address ? [store.address] : []),
      ...(reach.length > 0 ? [[store.supportPhone, store.supportEmail].filter(Boolean).join(" · ")] : []),
      `Contact us: ${contactUrl}`,
      "",
      why,
    ],
  };
}

function section(title: string, lines: string[]): string[] {
  return [title.toUpperCase(), "", ...lines, ""];
}

function finish(input: {
  subject: string;
  preheader: string;
  /** A test account's order: the subject says so, so nobody mistakes it for a real one. */
  test?: boolean;
  store: EmailStore;
  body: SafeHtml[];
  footer: { html: SafeHtml; text: string[] };
  text: string[];
}): RenderedEmail {
  const subject = oneLine(`${input.test ? "[Test] " : ""}${input.subject}`);
  const text = [...input.text, "", ...input.footer.text]
    .join("\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return {
    subject,
    html: emailDocument({
      title: subject,
      preheader: oneLine(input.preheader),
      brand: input.store.name,
      homeUrl: link(input.store, "/"),
      body: input.body,
      footer: input.footer.html,
    }),
    text: `${text}\n`,
  };
}

// --- The emails ----------------------------------------------------------------

/** On the admins' copy of a test account's order, as on its admin order page. */
const TEST_ORDER_NOTE = "Test order from a test account. No money was taken and no stock was used, so don’t ship it.";

/**
 * To the customer once the payment lands: thanks, the order number and
 * date, every line, the totals, the delivery address and what happens next.
 * It only goes before the order ships, so "what happens next" allows for an
 * order that is already packed (a confirmation sent again late).
 */
export function orderConfirmationEmail(input: { order: EmailOrder; store: EmailStore }): RenderedEmail {
  const { order, store } = input;
  const number = formatOrderNumber(order.number);
  const paid = `${formatPaise(order.totalPaise)} paid.`;
  const intro = `We have received your payment for order ${number}, placed on ${formatOrderDate(order.createdAt)}. Here is what you ordered.`;
  const packed = order.status === "packed";
  const next = packed
    ? "Your order is packed. We will email you the courier and tracking ID as soon as it ships."
    : "We will pack your order and email you the courier and tracking ID as soon as it ships.";
  return finish({
    subject: `Your order ${number} is confirmed`,
    preheader: packed
      ? `${paid} Your order is packed, and we will email you again when it ships.`
      : `${paid} We will email you again when it ships.`,
    test: order.isTest,
    store,
    body: [
      eyebrow(`Order ${number}`),
      heading("Thank you. Your order is confirmed."),
      paragraph(prose(intro), { gap: 28 }),
      sectionHeading("Items"),
      itemsHtml(order.items),
      sectionHeading("Payment"),
      paymentHtml(order),
      sectionHeading("Delivery address"),
      addressHtml(order),
      sectionHeading("What happens next"),
      paragraph(prose(next), { gap: 20 }),
      button(orderUrl(store, order), "View your order", { gap: 24 }),
    ],
    footer: customerFooter(order, store),
    text: [
      "Thank you. Your order is confirmed.",
      "",
      intro,
      "",
      ...section("Items", itemsText(order.items)),
      ...section("Payment", paymentText(order)),
      ...section("Delivery address", addressText(order)),
      ...section("What happens next", [next, "", `View your order: ${orderUrl(store, order)}`]),
    ],
  });
}

/**
 * To the store's admins once an order is paid: who, what (every option,
 * engraving included, so packing can start), where, a warning when it was
 * paid while out of stock, and what is running low now.
 */
export function newOrderAlertEmail(input: {
  order: EmailOrder;
  store: EmailStore;
  customer: { name: string | null; email: string | null };
  /** From lowStockAmong in src/db/products.ts: `status` is the admin's stockStatus. */
  lowStock: { name: string; stock: number; status: "low" | "out" }[];
}): RenderedEmail {
  const { order, store, customer, lowStock } = input;
  const number = formatOrderNumber(order.number);
  const total = formatPaise(order.totalPaise);
  const name = customer.name?.trim() || order.shipName;
  const email = customer.email ?? order.email;
  const phone = formatMobile(order.shipPhone);
  const count = itemCount(order);
  const adminUrl = link(store, `/admin/orders/${order.number}`);
  const summary = `Paid on ${formatOrderDate(order.paidAt ?? order.createdAt)}. ${count} ${count === 1 ? "item" : "items"} to ship to ${order.shipCity}, ${order.shipState}.`;
  // The same words as the admin order page.
  const shortfall =
    order.stockShortfall && order.stockShortfall.length > 0 ? stockShortfallNotice(order.stockShortfall) : null;
  // Labelled from stockStatus, as the admin's product list is: a product the
  // admin marked out of stock is "Out of stock" even with some counted.
  const lowStockLines = lowStock.map((product) => ({
    name: product.name,
    level: product.status === "out" ? "Out of stock" : `${product.stock} left`,
    out: product.status === "out",
  }));
  const why = "You get new-order alerts because your address is in ADMIN_EMAILS.";

  return finish({
    subject: `New order ${number} · ${total}`,
    preheader: `${name} · ${count} ${count === 1 ? "item" : "items"} · ${order.shipCity}`,
    test: order.isTest,
    store,
    body: [
      eyebrow("New order"),
      heading(prose(`${number} · ${total}`)),
      paragraph(prose(summary), { gap: 20 }),
      order.isTest && notice(TEST_ORDER_NOTE),
      shortfall && notice(prose(shortfall)),
      button(adminUrl, "Open order", { gap: 28 }),
      sectionHeading("Customer"),
      block(
        html`<div style="font-weight:bold;">${name}</div>
${email && html`<div><a href="mailto:${email}" style="color:${C.ink};">${email}</a></div>`}
<div><a href="${mobileHref(order.shipPhone)}" style="color:${C.ink};">${phone}</a></div>`,
        { gap: 24, style: TEXT }
      ),
      sectionHeading(order.items.length === 1 ? "Product" : "Products"),
      itemsHtml(order.items, { emphasiseEngraving: true }),
      sectionHeading("Payment"),
      paymentHtml(order),
      sectionHeading("Shipping address"),
      addressHtml(order),
      lowStockLines.length > 0 && sectionHeading("Low stock now"),
      lowStockLines.length > 0 &&
        block(
          html`<table ${TABLE}>${lowStockLines.map(
            (line, index) => html`<tr>
<td style="padding:${index === 0 ? 0 : 8}px 0 0 0;${TEXT}">${line.name}</td>
<td align="right" style="padding:${index === 0 ? 0 : 8}px 0 0 16px;${TEXT}white-space:nowrap;font-weight:bold;${line.out ? `color:${C.danger};` : ""}">${line.level}</td>
</tr>`
          )}</table>`,
          { gap: 24 }
        ),
    ].filter((part): part is SafeHtml => Boolean(part)),
    footer: {
      html: html`<div style="font-weight:bold;color:${C.ink};">${store.name}</div><p style="margin:8px 0 0 0;${SMALL}${MUTED}">${why}</p>`,
      text: ["--", store.name, why],
    },
    text: [
      `New order ${number} · ${total}`,
      "",
      summary,
      "",
      ...(order.isTest ? [TEST_ORDER_NOTE, ""] : []),
      ...(shortfall ? [shortfall, ""] : []),
      `Open order: ${adminUrl}`,
      "",
      ...section("Customer", [name, ...(email ? [email] : []), phone]),
      ...section(order.items.length === 1 ? "Product" : "Products", itemsText(order.items)),
      ...section("Payment", paymentText(order)),
      ...section("Shipping address", addressText(order)),
      ...(lowStockLines.length > 0
        ? section(
            "Low stock now",
            lowStockLines.map((line) => `${line.name}: ${line.level}`)
          )
        : []),
    ],
  });
}

/**
 * To the customer when the admin marks the order packed: it ships soon, and
 * the courier and tracking ID follow in the shipping email.
 */
export function orderPackedEmail(input: { order: EmailOrder; store: EmailStore }): RenderedEmail {
  const { order, store } = input;
  const number = formatOrderNumber(order.number);
  const intro = `We have packed order ${number} and it will ship soon. We will email you the courier and tracking ID as soon as it leaves us.`;
  return finish({
    subject: `Your order ${number} is packed`,
    preheader: "It ships soon. We will email you the courier and tracking ID.",
    test: order.isTest,
    store,
    body: [
      eyebrow(`Order ${number}`),
      heading("Your order is packed"),
      paragraph(prose(intro), { gap: 20 }),
      button(orderUrl(store, order), "View your order", { gap: 28 }),
      sectionHeading("In this parcel"),
      shortItemsHtml(order.items),
      sectionHeading("Delivering to"),
      addressHtml(order),
    ],
    footer: customerFooter(order, store),
    text: [
      "Your order is packed",
      "",
      intro,
      "",
      `View your order: ${orderUrl(store, order)}`,
      "",
      ...section("In this parcel", shortItemsText(order.items)),
      ...section("Delivering to", addressText(order)),
    ],
  });
}

/**
 * To the customer when the admin cancels the order: what was cancelled, and
 * where the money goes. The refund words follow the returns page (src/app/
 * returns/page.tsx); the admin makes the refund in Razorpay. A test order
 * took no money, so it says that instead.
 */
export function orderCancelledEmail(input: { order: EmailOrder; store: EmailStore }): RenderedEmail {
  const { order, store } = input;
  const number = formatOrderNumber(order.number);
  const contactUrl = link(store, "/contact");
  const intro = `We have cancelled order ${number}, placed on ${formatOrderDate(order.createdAt)}.`;
  const refund = order.isTest
    ? "This was a test order, so no money was taken and there is nothing to refund."
    : `Your refund of ${formatPaise(order.totalPaise)} goes back to the payment method you used (UPI, card or net banking) within 7 working days. Your bank may take a few more working days to show it.`;
  const question = "If you didn’t ask for this, or have a question, contact us.";
  return finish({
    subject: `Your order ${number} has been cancelled`,
    preheader: order.isTest ? "No money was taken for this test order." : `Your refund of ${formatPaise(order.totalPaise)} is on its way.`,
    test: order.isTest,
    store,
    body: [
      eyebrow(`Order ${number}`),
      heading("Your order has been cancelled"),
      paragraph(prose(intro)),
      paragraph(prose(refund)),
      paragraph(html`If you didn’t ask for this, or have a question, ${textLink(contactUrl, "contact us")}.`, { gap: 20 }),
      button(orderUrl(store, order), "View your order", { gap: 28 }),
      sectionHeading("Cancelled items"),
      shortItemsHtml(order.items),
      sectionHeading(order.isTest ? "Total" : "Refund"),
      paragraph(html`<strong>${formatPaise(order.totalPaise)}</strong>`, { gap: 24 }),
    ],
    footer: customerFooter(order, store),
    text: [
      "Your order has been cancelled",
      "",
      intro,
      "",
      refund,
      "",
      question,
      `Contact us: ${contactUrl}`,
      "",
      `View your order: ${orderUrl(store, order)}`,
      "",
      ...section("Cancelled items", shortItemsText(order.items)),
      ...section(order.isTest ? "Total" : "Refund", [formatPaise(order.totalPaise)]),
    ],
  });
}

/**
 * To the customer when the order ships: the courier, the tracking ID large
 * and easy to copy, a button to the courier's tracking page, and what is in
 * the parcel.
 */
export function orderShippedEmail(input: { order: EmailOrder; store: EmailStore }): RenderedEmail {
  const { order, store } = input;
  const number = formatOrderNumber(order.number);
  const carrier = carrierName(order.carrier);
  const intro = order.shippedAt
    ? `Your parcel left us on ${formatOrderDate(order.shippedAt)} with ${carrier}. Use the tracking ID below to follow it.`
    : `Your parcel is with ${carrier}. Use the tracking ID below to follow it.`;
  return finish({
    subject: `Your order ${number} has shipped`,
    preheader: `${carrier} tracking ID ${order.trackingNumber ?? ""}`,
    test: order.isTest,
    store,
    body: [
      eyebrow(`Order ${number}`),
      heading("Your order is on its way"),
      paragraph(prose(intro), { gap: 20 }),
      trackingHtml(order),
      ...trackingActionsHtml(order, store),
      sectionHeading("In this parcel"),
      shortItemsHtml(order.items),
      sectionHeading("Delivering to"),
      addressHtml(order),
    ],
    footer: customerFooter(order, store),
    text: [
      "Your order is on its way",
      "",
      intro,
      "",
      ...trackingText(order),
      "",
      ...trackingActionsText(order, store),
      "",
      ...section("In this parcel", shortItemsText(order.items)),
      ...section("Delivering to", addressText(order)),
    ],
  });
}

/** To the customer when the courier or tracking ID of a shipped order is corrected. */
export function trackingUpdatedEmail(input: { order: EmailOrder; store: EmailStore }): RenderedEmail {
  const { order, store } = input;
  const number = formatOrderNumber(order.number);
  const intro = `We corrected the tracking details for order ${number}. Please use these from now on.`;
  return finish({
    subject: `New tracking details for order ${number}`,
    preheader: `${carrierName(order.carrier)} tracking ID ${order.trackingNumber ?? ""}`,
    test: order.isTest,
    store,
    body: [
      eyebrow(`Order ${number}`),
      heading("New tracking details"),
      paragraph(prose(intro), { gap: 20 }),
      trackingHtml(order),
      ...trackingActionsHtml(order, store),
      sectionHeading("In this parcel"),
      shortItemsHtml(order.items),
    ],
    footer: customerFooter(order, store),
    text: [
      "New tracking details",
      "",
      intro,
      "",
      ...trackingText(order),
      "",
      ...trackingActionsText(order, store),
      "",
      ...section("In this parcel", shortItemsText(order.items)),
    ],
  });
}

/**
 * To the customer once the order is delivered, with where to go if something
 * is not right, and an invitation to review it (/reviews/write). It points
 * to the returns page rather than restating its periods and rules, so the
 * two cannot drift apart.
 */
export function orderDeliveredEmail(input: { order: EmailOrder; store: EmailStore }): RenderedEmail {
  const { order, store } = input;
  const number = formatOrderNumber(order.number);
  const returnsUrl = link(store, "/returns");
  const contactUrl = link(store, "/contact");
  const reviewUrl = link(store, "/reviews/write");
  const date = order.deliveredAt ? formatOrderDate(order.deliveredAt) : null;
  const intro = `${date ? `It arrived on ${date}.` : "It has arrived."} We hope you enjoy your new gear.`;
  const reviewAsk = "Once you have played with it, tell other players what you think. A few lines, and a photo if you have one, help them choose.";
  return finish({
    subject: `Your order ${number} has been delivered`,
    preheader: `Order ${number} ${date ? `arrived on ${date}` : "has arrived"}. We hope you enjoy your new gear.`,
    test: order.isTest,
    store,
    body: [
      eyebrow(`Order ${number}`),
      heading("Your order has been delivered"),
      paragraph(prose(intro)),
      paragraph(
        html`If anything arrived damaged or isn't right, ${textLink(contactUrl, "tell us")} straight away. ${textLink(returnsUrl, "Returns and refunds")} explains what can come back and how.`,
        { gap: 20 }
      ),
      button(orderUrl(store, order), "View your order", { gap: 28 }),
      sectionHeading("In this parcel"),
      shortItemsHtml(order.items),
      sectionHeading("How is it playing?"),
      paragraph(reviewAsk),
      button(reviewUrl, "Write a review", { variant: "secondary", gap: 24 }),
    ],
    footer: customerFooter(order, store),
    text: [
      "Your order has been delivered",
      "",
      intro,
      "",
      "If anything arrived damaged or isn't right, tell us straight away. Returns and refunds explains what can come back and how.",
      `Contact us: ${contactUrl}`,
      `Returns and refunds: ${returnsUrl}`,
      "",
      `View your order: ${orderUrl(store, order)}`,
      "",
      ...section("In this parcel", shortItemsText(order.items)),
      ...section("How is it playing?", [reviewAsk, `Write a review: ${reviewUrl}`]),
    ],
  });
}

/**
 * To the customer once Razorpay reports the refund made (the admin makes it
 * in the Razorpay dashboard): how much, for which order, and when the bank
 * will show it. `amountPaise` is the refund's own amount, so a part refund
 * says what actually went back.
 */
export function orderRefundedEmail(input: { order: EmailOrder; store: EmailStore; amountPaise: number }): RenderedEmail {
  const { order, store, amountPaise } = input;
  const number = formatOrderNumber(order.number);
  const amount = formatPaise(amountPaise);
  const contactUrl = link(store, "/contact");
  const intro = `We have refunded ${amount} for order ${number}, placed on ${formatOrderDate(order.createdAt)}.`;
  const where = order.isTest
    ? "This was a test order, so no real money moved."
    : "It goes back to the payment method you used (UPI, card or net banking). Banks usually show it within 5 to 7 working days.";
  const question = "If it hasn’t reached you by then, or you have a question, contact us.";
  const part = amountPaise < order.totalPaise ? `Part of the ${formatPaise(order.totalPaise)} you paid.` : null;
  return finish({
    subject: `Your refund for order ${number}`,
    preheader: order.isTest ? "No real money moved for this test order." : `${amount} is on its way back to you.`,
    test: order.isTest,
    store,
    body: [
      eyebrow(`Order ${number}`),
      heading("Your refund has been sent"),
      paragraph(prose(intro)),
      paragraph(prose(where)),
      paragraph(html`If it hasn’t reached you by then, or you have a question, ${textLink(contactUrl, "contact us")}.`, {
        gap: 20,
      }),
      button(orderUrl(store, order), "View your order", { gap: 28 }),
      sectionHeading("Refund"),
      paragraph(html`<strong>${amount}</strong>`, { gap: part ? 4 : 24 }),
      part && paragraph(prose(part), { small: true, muted: true, gap: 24 }),
    ].filter((piece): piece is SafeHtml => Boolean(piece)),
    footer: customerFooter(order, store),
    text: [
      "Your refund has been sent",
      "",
      intro,
      "",
      where,
      "",
      question,
      `Contact us: ${contactUrl}`,
      "",
      `View your order: ${orderUrl(store, order)}`,
      "",
      ...section("Refund", [amount, ...(part ? [part] : [])]),
    ],
  });
}

/**
 * To the store's admins about a checkout that stopped at payment: who it
 * was, how to reach them and what they wanted, so the shop can ask whether
 * the payment gave trouble. Nothing was paid, and it says so.
 */
export function unpaidOrderAlertEmail(input: {
  order: EmailOrder;
  store: EmailStore;
  customer: { name: string | null; email: string | null };
}): RenderedEmail {
  const { order, store, customer } = input;
  const number = formatOrderNumber(order.number);
  const total = formatPaise(order.totalPaise);
  const name = customer.name?.trim() || order.shipName;
  const email = customer.email ?? order.email;
  const phone = formatMobile(order.shipPhone);
  const whatsapp = whatsappHref(order.shipPhone);
  const count = itemCount(order);
  const adminUrl = link(store, `/admin/orders/${order.number}`);
  const summary = `${name} went to pay on ${formatOrderDate(order.createdAt)}, but the payment didn’t finish.`;
  const advice =
    "No money was taken, so there is nothing to ship. The payment may have failed, or they may have changed their mind: a call or a message is the way to find out.";
  const why = "You get unpaid-order alerts because your address is in ADMIN_EMAILS.";

  return finish({
    subject: `Unpaid order ${number} · ${total}`,
    preheader: `${name} · ${count} ${count === 1 ? "item" : "items"} · not paid`,
    store,
    body: [
      eyebrow("Unpaid order"),
      heading(prose(`${number} · ${total}`)),
      paragraph(prose(summary)),
      paragraph(advice, { gap: 20 }),
      button(adminUrl, "Open order", { gap: 28 }),
      sectionHeading("Customer"),
      block(
        html`<div style="font-weight:bold;">${name}</div>
${email && html`<div><a href="mailto:${email}" style="color:${C.ink};">${email}</a></div>`}
<div><a href="${mobileHref(order.shipPhone)}" style="color:${C.ink};">${phone}</a></div>
${whatsapp && html`<div>${textLink(whatsapp, "Message on WhatsApp")}</div>`}
<div style="${MUTED}">${order.shipCity}, ${order.shipState}</div>`,
        { gap: 24, style: TEXT }
      ),
      sectionHeading(order.items.length === 1 ? "Product" : "Products"),
      itemsHtml(order.items),
      sectionHeading("Not paid"),
      paymentHtml(order),
    ],
    footer: {
      html: html`<div style="font-weight:bold;color:${C.ink};">${store.name}</div><p style="margin:8px 0 0 0;${SMALL}${MUTED}">${why}</p>`,
      text: ["--", store.name, why],
    },
    text: [
      `Unpaid order ${number} · ${total}`,
      "",
      summary,
      "",
      advice,
      "",
      `Open order: ${adminUrl}`,
      "",
      ...section("Customer", [
        name,
        ...(email ? [email] : []),
        phone,
        ...(whatsapp ? [`WhatsApp: ${whatsapp}`] : []),
        `${order.shipCity}, ${order.shipState}`,
      ]),
      ...section(order.items.length === 1 ? "Product" : "Products", itemsText(order.items)),
      ...section("Not paid", paymentText(order)),
    ],
  });
}

/** A customer's review as its alert shows it. */
export interface EmailReview {
  id: string;
  name: string | null;
  /** A team or city, shown after the name. */
  place: string | null;
  rating: number | null;
  body: string | null;
  /** An email or mobile number for replying. */
  contact: string | null;
  /** The customer asked for it to stay with the store. */
  isPrivate: boolean;
  hasPhoto: boolean;
  /** What they said they bought. */
  productName: string | null;
}

/**
 * To the store's admins when a customer sends a review from /reviews/write:
 * who, the stars, the product and their words, with a link to the admin page
 * where it is published or hidden. A private one says it can't go on the site.
 */
export function newReviewAlertEmail(input: { review: EmailReview; store: EmailStore }): RenderedEmail {
  const { review, store } = input;
  const name = review.name?.trim() || "A customer";
  const from = review.place ? `${name}, ${review.place}` : name;
  const stars = review.rating ? `${review.rating} out of 5 stars` : null;
  const adminUrl = link(store, `/admin/reviews/${review.id}`);
  const what = review.isPrivate ? "Private feedback" : "New review";
  const next = review.isPrivate
    ? "They asked for it to stay with the store, so it can’t go on the site."
    : "It isn’t on the site yet. Open it to publish it or hide it.";
  const lines = (review.body ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const details = [
    ...(stars ? [{ label: "Rating", value: stars }] : []),
    ...(review.productName ? [{ label: "Product", value: review.productName }] : []),
    ...(review.hasPhoto ? [{ label: "Photo", value: "1 attached" }] : []),
    ...(review.contact ? [{ label: "Contact", value: review.contact }] : []),
  ];
  const why = "You get new-review alerts because your address is in ADMIN_EMAILS.";

  return finish({
    subject: `${what} from ${name}${stars ? ` · ${stars}` : ""}`,
    preheader: lines[0] ?? (review.hasPhoto ? "A photo, with no words." : what),
    store,
    body: [
      eyebrow(what),
      heading(from),
      paragraph(next, { gap: 20 }),
      button(adminUrl, "Open review", { gap: 28 }),
      details.length > 0 && sectionHeading("Details"),
      details.length > 0 &&
        block(
          html`<table ${TABLE}>${details.map(
            (row, index) => html`<tr>
<td valign="top" style="padding:${index === 0 ? 0 : 8}px 0 0 0;${TEXT}${MUTED}">${row.label}</td>
<td valign="top" align="right" style="padding:${index === 0 ? 0 : 8}px 0 0 16px;${TEXT}font-weight:bold;word-break:break-word;">${row.value}</td>
</tr>`
          )}</table>`,
          { gap: 24 }
        ),
      lines.length > 0 && sectionHeading("What they wrote"),
      ...lines.map((line, index) => paragraph(line, { gap: index === lines.length - 1 ? 24 : 12 })),
    ].filter((piece): piece is SafeHtml => Boolean(piece)),
    footer: {
      html: html`<div style="font-weight:bold;color:${C.ink};">${store.name}</div><p style="margin:8px 0 0 0;${SMALL}${MUTED}">${why}</p>`,
      text: ["--", store.name, why],
    },
    text: [
      `${what} from ${from}`,
      "",
      next,
      "",
      `Open review: ${adminUrl}`,
      "",
      ...(details.length > 0
        ? section(
            "Details",
            details.map((row) => `${row.label}: ${row.value}`)
          )
        : []),
      ...(lines.length > 0 ? section("What they wrote", lines) : []),
    ],
  });
}
