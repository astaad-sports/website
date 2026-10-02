import { describe, expect, test } from "bun:test";

import { lineOfferText } from "@/components/cart/line-offer";
import type { OrderItem } from "@/db/schema";
import { formatOrderDate } from "@/lib/format";

import {
  newOrderAlertEmail,
  newReviewAlertEmail,
  orderCancelledEmail,
  orderConfirmationEmail,
  orderDeliveredEmail,
  orderPackedEmail,
  orderRefundedEmail,
  orderShippedEmail,
  trackingUpdatedEmail,
  unpaidOrderAlertEmail,
  type EmailOrder,
  type EmailReview,
  type EmailStore,
} from "./templates";

const store: EmailStore = {
  name: "Astaad Sports",
  supportEmail: "help@astaadsports.com",
  supportPhone: "98765 43210",
  address: "12 Sports Market, Jalandhar, Punjab 144001",
  siteUrl: "https://astaadsports.com",
};

const bat: OrderItem = {
  id: "item-1",
  orderId: "order-1",
  productKind: "bat",
  productSlug: "ew-pro-100",
  productName: "Astaad EW Pro 100",
  options: [
    { label: "Willow", value: "Grade 1 English Willow" },
    { label: "Size", value: "SH / Full Size" },
    { label: "Weight", value: "1150–1180 g" },
    { label: "Profile", value: "Mid to Low" },
    { label: "Handle", value: "Semi Oval" },
    { label: "Engraving", value: "<Virat> & 'Co'" },
    { label: "Knocking", value: "Yes" },
  ],
  variant: "SH",
  unitPricePaise: 2899900,
  quantity: 1,
  lineTotalPaise: 2899900,
  offer: null,
};

const gloves: OrderItem = {
  id: "item-2",
  orderId: "order-1",
  productKind: "gear",
  productSlug: "elite-batting-gloves",
  productName: "Astaad Elite Batting Gloves",
  options: [
    { label: "Size", value: "Men’s" },
    { label: "Hand", value: "Right hand" },
  ],
  variant: "Men’s|Right hand",
  unitPricePaise: 269900,
  quantity: 2,
  lineTotalPaise: 539800,
  offer: { name: "Monsoon Gloves", percentOff: 10, code: "GLOVES10", regularPricePaise: 299900 },
};

const paidAt = new Date("2026-09-24T06:32:00Z");

// Totals as the checkout stores them: line totals after offers, the discount beside them.
const order: EmailOrder = {
  id: "order-1",
  number: 10001,
  userId: "user-1",
  status: "paid",
  currency: "INR",
  subtotalPaise: 3439700,
  shippingPaise: 0,
  totalPaise: 3439700,
  email: "virat@example.com",
  shipName: "Virat Kohli",
  shipPhone: "9876543210",
  shipLine1: "Flat 4B, Sea View Apartments",
  shipLine2: "Worli",
  shipCity: "Mumbai",
  shipState: "Maharashtra",
  shipPincode: "400018",
  razorpayOrderId: "order_Q1a2b3c4",
  razorpayPaymentId: "pay_Q1a2b3c4d5",
  paidAt,
  confirmedAt: null,
  packedAt: null,
  carrier: null,
  trackingNumber: null,
  shippedAt: null,
  deliveredAt: null,
  cancelledAt: null,
  stockShortfall: null,
  couponCode: "GLOVES10",
  discountPaise: 60000,
  isTest: false,
  createdAt: new Date("2026-09-24T06:30:00Z"),
  updatedAt: paidAt,
  items: [bat, gloves],
};

const shipped: EmailOrder = {
  ...order,
  status: "shipped",
  carrier: "trackon",
  trackingNumber: "5009123456",
  shippedAt: new Date("2026-09-25T09:00:00Z"),
};

const delivered: EmailOrder = { ...shipped, status: "delivered", deliveredAt: new Date("2026-09-27T09:00:00Z") };

const packed: EmailOrder = { ...order, status: "packed", confirmedAt: paidAt, packedAt: new Date("2026-09-24T12:00:00Z") };

const cancelled: EmailOrder = { ...order, status: "cancelled", cancelledAt: new Date("2026-09-25T05:00:00Z") };

const customer = { name: "Virat Kohli", email: "virat@example.com" };

function all() {
  return {
    confirmation: orderConfirmationEmail({ order, store }),
    alert: newOrderAlertEmail({ order, store, customer, lowStock: [] }),
    packed: orderPackedEmail({ order: packed, store }),
    shipped: orderShippedEmail({ order: shipped, store }),
    trackingUpdated: trackingUpdatedEmail({ order: { ...shipped, carrier: "delhivery", trackingNumber: "DL77001234" }, store }),
    delivered: orderDeliveredEmail({ order: delivered, store }),
    cancelled: orderCancelledEmail({ order: cancelled, store }),
  };
}

describe("every email", () => {
  test("has a one-line subject", () => {
    const subjects = Object.values(all()).map((email) => email.subject);
    expect(subjects).toEqual([
      "Your order AST-10001 is confirmed",
      "New order AST-10001 · ₹ 34,397",
      "Your order AST-10001 is packed",
      "Your order AST-10001 has shipped",
      "New tracking details for order AST-10001",
      "Your order AST-10001 has been delivered",
      "Your order AST-10001 has been cancelled",
    ]);
    for (const subject of subjects) expect(subject).not.toMatch(/[\r\n]/);
  });

  test("is a table layout with inline styles only: no scripts, images, stylesheets or web fonts", () => {
    for (const email of Object.values(all())) {
      expect(email.html).toStartWith("<!DOCTYPE html>");
      expect(email.html).toContain('<html lang="en"');
      expect(email.html).toContain('role="presentation"');
      expect(email.html).not.toMatch(/<(script|img|svg|link|style|iframe|form)\b/i);
      expect(email.html).not.toMatch(/@import|url\(/i);
    }
  });

  test("links only to absolute addresses", () => {
    for (const email of Object.values(all())) {
      const hrefs = [...email.html.matchAll(/href="([^"]*)"/g)].map((match) => match[1]);
      expect(hrefs.length).toBeGreaterThan(0);
      for (const href of hrefs) {
        expect(href).toMatch(/^(https:\/\/(astaadsports\.com|www\.trackon\.in|www\.delhivery\.com)\/|mailto:|tel:)/);
      }
    }
  });

  test("has a plain-text version, and no exclamation marks", () => {
    for (const email of Object.values(all())) {
      expect(email.text).toContain("AST-10001");
      expect(email.text).not.toMatch(/<\/?(table|tr|td|div|a|span|strong|h1|h2)\b/);
      expect(email.text).not.toContain("!");
      expect(email.subject).not.toContain("!");
    }
  });
});

describe("escaping", () => {
  test("an engraving with markup and quotes comes out as text", () => {
    for (const email of [orderConfirmationEmail({ order, store }), newOrderAlertEmail({ order, store, customer, lowStock: [] })]) {
      expect(email.html).toContain("&lt;Virat&gt; &amp; &#39;Co&#39;");
      expect(email.html).not.toContain("<Virat>");
      expect(email.text).toContain("Engraving: <Virat> & 'Co'");
    }
  });

  test("names, addresses, products and codes cannot add markup", () => {
    const hostile = `Rohit "Hitman" <script>alert(1)</script>`;
    const tricky: EmailOrder = {
      ...shipped,
      shipName: hostile,
      shipLine1: `<img src=x onerror="alert(1)">`,
      shipCity: `<i>Mumbai</i> AST-1`,
      couponCode: `<b>CODE</b>`,
      items: [{ ...gloves, productName: `Gloves <i>Pro</i>`, offer: { ...gloves.offer!, name: `Sale "50%"`, code: null } }],
    };
    const emails = [
      orderConfirmationEmail({ order: tricky, store }),
      newOrderAlertEmail({ order: tricky, store, customer: { name: hostile, email: `a"b@example.com` }, lowStock: [{ name: "<Bat>", stock: 1, status: "low" }] }),
      orderShippedEmail({ order: tricky, store }),
      orderDeliveredEmail({ order: tricky, store }),
    ];
    for (const email of emails) {
      expect(email.html).not.toMatch(/<(script|img|b|i)\b/);
      expect(email.html).toContain("Gloves &lt;i&gt;Pro&lt;/i&gt;");
    }
    expect(emails[0].html).toContain("Rohit &quot;Hitman&quot; &lt;script&gt;");
    expect(emails[0].html).toContain("&lt;b&gt;CODE&lt;/b&gt;");
    expect(emails[0].html).toContain("Sale &quot;50%&quot; · 10% off");
    expect(emails[1].html).toContain('href="mailto:a&quot;b@example.com"');
    expect(emails[1].html).toContain("&lt;Bat&gt;");
    expect(emails[1].html).toContain('to ship to &lt;i&gt;Mumbai&lt;/i&gt; <span style="white-space:nowrap;">AST-1</span>,');
  });
});

describe("order confirmation", () => {
  const email = orderConfirmationEmail({ order, store });

  test("totals match the order and the order page's rows", () => {
    expect(email.text).toContain(
      ["Subtotal: ₹ 34,997", "Discount: −₹ 600", "Coupon: GLOVES10", "Delivery: Free", "Total: ₹ 34,397"].join("\n")
    );
    // The fixture adds up as the checkout's would: lines after offers, the discount beside them.
    expect(order.items.reduce((sum, item) => sum + item.lineTotalPaise, 0)).toBe(order.subtotalPaise);
    expect(order.subtotalPaise + order.shippingPaise).toBe(order.totalPaise);
    expect((gloves.offer!.regularPricePaise - gloves.unitPricePaise) * gloves.quantity).toBe(order.discountPaise);
    for (const amount of ["₹ 34,997", "−₹ 600", "GLOVES10", "Free", "₹ 34,397"]) expect(email.html).toContain(amount);
    expect(email.text).toContain(`Paid on ${formatOrderDate(paidAt)} · Razorpay payment pay_Q1a2b3c4d5`);
  });

  test("a delivery charge replaces Free, and no discount row without a discount", () => {
    const plain = orderConfirmationEmail({
      order: { ...order, items: [bat], subtotalPaise: 2899900, discountPaise: 0, couponCode: null, shippingPaise: 9900, totalPaise: 2909800 },
      store,
    });
    expect(plain.text).toContain(["Subtotal: ₹ 28,999", "Delivery: ₹ 99", "Total: ₹ 29,098"].join("\n"));
    expect(plain.text).not.toContain("Discount");
    expect(plain.html).not.toContain("Discount");
  });

  test("lines read as on the order page: options, the offer note, the regular price", () => {
    expect(email.text).toContain(
      [
        "Astaad Elite Batting Gloves",
        "  Size: Men’s",
        "  Hand: Right hand",
        `  ${lineOfferText(gloves.offer!)}`,
        "  2 × ₹ 2,699 = ₹ 5,398 (regular price ₹ 5,998)",
      ].join("\n")
    );
    expect(email.html).toContain("Coupon GLOVES10 · 10% off");
    expect(email.html).toMatch(/Regular price <s style="text-decoration:line-through;[^"]*">₹ 5,998<\/s>/);
    expect(email.text).toContain("  1 × ₹ 28,999 = ₹ 28,999\n");
  });

  test("the order number, date, address and a link to the order", () => {
    expect(email.text).toContain(`order AST-10001, placed on ${formatOrderDate(order.createdAt)}`);
    expect(email.text).toContain("Virat Kohli\nFlat 4B, Sea View Apartments\nWorli\nMumbai, Maharashtra 400018\n+91 98765 43210");
    expect(email.html).toContain('href="https://astaadsports.com/account/orders/10001"');
    expect(email.text).toContain("View your order: https://astaadsports.com/account/orders/10001");
    expect(email.text).toContain("We will pack your order and email you");
  });

  test("sent again once the order is packed, it says so", () => {
    const packed = orderConfirmationEmail({ order: { ...order, status: "packed" }, store });
    const next = "Your order is packed. We will email you the courier and tracking ID as soon as it ships.";
    expect(packed.text).toContain(next);
    expect(packed.html).toContain(next);
    expect(packed.html).toContain("₹ 34,397 paid. Your order is packed, and we will email you again when it ships.");
    expect(packed.text).not.toContain("We will pack your order");
    expect(email.html).toContain("₹ 34,397 paid. We will email you again when it ships.");
  });

  test("order numbers, amounts and dates never break across lines", () => {
    const nowrap = (value: string) => `<span style="white-space:nowrap;">${value}</span>`;
    expect(email.html).toContain(`for order ${nowrap("AST-10001")}, placed on ${nowrap(formatOrderDate(order.createdAt))}.`);
    expect(email.html).toContain(`placed order ${nowrap("AST-10001")} with Astaad Sports.`);
    const alert = newOrderAlertEmail({ order, store, customer, lowStock: [] });
    expect(alert.html).toContain(`${nowrap("AST-10001")} · ${nowrap("₹ 34,397")}</h1>`);
  });

  test("the footer has the store's details and why the email came", () => {
    expect(email.text).toContain("12 Sports Market, Jalandhar, Punjab 144001");
    expect(email.text).toContain("98765 43210 · help@astaadsports.com");
    expect(email.text).toContain("Contact us: https://astaadsports.com/contact");
    expect(email.text).toContain("because you placed order AST-10001 with Astaad Sports");
    expect(email.html).toContain('href="mailto:help@astaadsports.com"');
    expect(email.html).toContain('href="tel:+919876543210"');
  });

  test("a store without contact details leaves them out", () => {
    const bare = orderConfirmationEmail({ order, store: { ...store, supportEmail: null, supportPhone: null, address: null } });
    expect(bare.html).not.toContain("mailto:");
    expect(bare.html).not.toContain("tel:");
    expect(bare.text).not.toContain(" · help@");
  });
});

describe("new order alert", () => {
  test("customer, every option, address and a link to the admin page", () => {
    const email = newOrderAlertEmail({ order, store, customer: { name: null, email: null }, lowStock: [] });
    expect(email.text).toContain("CUSTOMER\n\nVirat Kohli\nvirat@example.com\n+91 98765 43210");
    expect(email.text).toContain("Knocking: Yes");
    expect(email.text).toContain("Maharashtra 400018");
    expect(email.html).toContain('href="https://astaadsports.com/admin/orders/10001"');
    expect(email.text).toContain("3 items to ship to Mumbai, Maharashtra.");
    expect(email.html).not.toContain("Paid while out of stock");
    expect(email.html).not.toContain("Low stock now");
  });

  test("warns when the order was paid while out of stock, and lists low stock", () => {
    const email = newOrderAlertEmail({
      order: { ...order, stockShortfall: [{ slug: "ew-pro-100", name: "Astaad EW Pro 100", missing: 1 }] },
      store,
      customer,
      lowStock: [
        { name: "Astaad EW Pro 100", stock: 0, status: "out" },
        { name: "Astaad Elite Batting Gloves", stock: 2, status: "low" },
      ],
    });
    const warning =
      "Paid while out of stock: Astaad EW Pro 100 (1 more than you had). Restock before shipping, or contact the customer about a refund.";
    expect(email.html).toContain(warning);
    expect(email.text).toContain(warning);
    expect(email.text).toContain("LOW STOCK NOW\n\nAstaad EW Pro 100: Out of stock\nAstaad Elite Batting Gloves: 2 left");
    expect(email.html).toContain("Out of stock");
  });

  test("low stock is labelled by the admin's status, not the count alone", () => {
    const email = newOrderAlertEmail({
      order,
      store,
      customer,
      lowStock: [{ name: "Astaad Pro Helmet", stock: 5, status: "out" }],
    });
    expect(email.text).toContain("LOW STOCK NOW\n\nAstaad Pro Helmet: Out of stock");
    expect(email.text).not.toContain("5 left");
    expect(email.html).toMatch(/color:#c62828;">Out of stock</);
  });
});

describe("shipping emails", () => {
  test("shipped: courier, tracking ID, the courier's page and the order", () => {
    const email = orderShippedEmail({ order: shipped, store });
    expect(email.html).toContain("5009123456");
    expect(email.html).toContain("Trackon Couriers");
    expect(email.html).toContain('href="https://www.trackon.in/courier-tracking"');
    expect(email.text).toContain("Courier: Trackon Couriers\nTracking ID: 5009123456");
    expect(email.text).toContain("Track your parcel: https://www.trackon.in/courier-tracking");
    expect(email.text).toContain("View your order: https://astaadsports.com/account/orders/10001");
    expect(email.text).toContain(`left us on ${formatOrderDate(shipped.shippedAt!)} with Trackon Couriers`);
    expect(email.text).toContain("Astaad Elite Batting Gloves · Qty 2");
  });

  test("tracking updated: the new courier and ID", () => {
    const email = trackingUpdatedEmail({ order: { ...shipped, carrier: "delhivery", trackingNumber: "DL77001234" }, store });
    expect(email.text).toContain("Courier: Delhivery\nTracking ID: DL77001234");
    expect(email.html).toContain('href="https://www.delhivery.com/tracking"');
    expect(email.text).toContain("We corrected the tracking details");
  });

  test("a tracking ID can wrap rather than widen the email, and a long one is set smaller", () => {
    const short = orderShippedEmail({ order: shipped, store });
    const long = orderShippedEmail({ order: { ...shipped, trackingNumber: "12345678901234567890" }, store });
    expect(short.html).toMatch(/font-size:26px;[^"]*word-break:break-all;overflow-wrap:anywhere;[^"]*">5009123456</);
    expect(long.html).toMatch(/font-size:22px;[^"]*word-break:break-all;[^"]*">12345678901234567890</);
  });

  test("an unknown courier gets no tracking button", () => {
    const email = orderShippedEmail({ order: { ...shipped, carrier: "bluedart" }, store });
    expect(email.text).toContain("Courier: Courier");
    expect(email.text).not.toContain("Track your parcel");
    expect(email.html).toContain("View your order");
  });

  test("delivered: the date, returns and contact, without restating the returns policy", () => {
    const email = orderDeliveredEmail({ order: delivered, store });
    expect(email.text).toContain(`It arrived on ${formatOrderDate(delivered.deliveredAt!)}.`);
    expect(email.text).toContain(
      "If anything arrived damaged or isn't right, tell us straight away. Returns and refunds explains what can come back and how."
    );
    expect(email.html).toContain('href="https://astaadsports.com/returns"');
    expect(email.html).toContain('href="https://astaadsports.com/contact"');
    expect(email.text).toContain("Returns and refunds: https://astaadsports.com/returns");
    // The returns page is still a draft: the email points to it rather than copying its periods.
    expect(email.text).not.toMatch(/\d+ (days|hours)/);
  });

  test("delivered: asks for a review, after what was in the parcel", () => {
    const email = orderDeliveredEmail({ order: delivered, store });
    expect(email.html).toContain('href="https://astaadsports.com/reviews/write"');
    expect(email.text).toContain("HOW IS IT PLAYING?");
    expect(email.text).toContain("Write a review: https://astaadsports.com/reviews/write");
    expect(email.text.indexOf("IN THIS PARCEL")).toBeLessThan(email.text.indexOf("HOW IS IT PLAYING?"));
  });
});

describe("refunded", () => {
  test("the amount, the order and when the bank shows it", () => {
    const email = orderRefundedEmail({ order: cancelled, store, amountPaise: 3439700 });
    expect(email.subject).toBe("Your refund for order AST-10001");
    expect(email.text).toContain(`We have refunded ₹ 34,397 for order AST-10001, placed on ${formatOrderDate(order.createdAt)}.`);
    expect(email.text).toContain(
      "It goes back to the payment method you used (UPI, card or net banking). Banks usually show it within 5 to 7 working days."
    );
    expect(email.text).toContain("REFUND\n\n₹ 34,397");
    expect(email.text).not.toContain("Part of");
    expect(email.html).toContain("₹ 34,397 is on its way back to you.");
    expect(email.html).toContain('href="https://astaadsports.com/account/orders/10001"');
    expect(email.html).toContain('href="https://astaadsports.com/contact"');
    expect(email.text).toContain("because you placed order AST-10001 with Astaad Sports");
  });

  test("a part refund gives its own amount, and what was paid", () => {
    const email = orderRefundedEmail({ order: delivered, store, amountPaise: 539800 });
    expect(email.text).toContain("We have refunded ₹ 5,398 for order AST-10001");
    expect(email.text).toContain("REFUND\n\n₹ 5,398\nPart of the ₹ 34,397 you paid.");
    expect(email.html).toContain("Part of the <span style=\"white-space:nowrap;\">₹ 34,397</span> you paid.");
  });

  test("a test order's says no real money moved", () => {
    const email = orderRefundedEmail({ order: { ...cancelled, isTest: true }, store, amountPaise: 3439700 });
    expect(email.subject).toStartWith("[Test] ");
    expect(email.text).toContain("This was a test order, so no real money moved.");
    expect(email.text).not.toContain("working days");
  });
});

describe("unpaid order alert", () => {
  const unpaid: EmailOrder = { ...order, status: "pending_payment", razorpayPaymentId: null, paidAt: null };

  test("who it was, how to reach them, what they wanted and a link to the admin page", () => {
    const email = unpaidOrderAlertEmail({ order: unpaid, store, customer });
    expect(email.subject).toBe("Unpaid order AST-10001 · ₹ 34,397");
    expect(email.text).toContain(
      `Virat Kohli went to pay on ${formatOrderDate(order.createdAt)}, but the payment didn’t finish.`
    );
    expect(email.text).toContain("No money was taken, so there is nothing to ship.");
    expect(email.text).toContain("Open order: https://astaadsports.com/admin/orders/10001");
    expect(email.text).toContain(
      "CUSTOMER\n\nVirat Kohli\nvirat@example.com\n+91 98765 43210\nWhatsApp: https://wa.me/919876543210\nMumbai, Maharashtra"
    );
    expect(email.html).toContain('href="tel:+919876543210"');
    expect(email.html).toContain('href="https://wa.me/919876543210"');
    expect(email.text).toContain("  Engraving: <Virat> & 'Co'");
    expect(email.text).toContain("NOT PAID\n\nSubtotal: ₹ 34,997");
    expect(email.text).toContain("Total: ₹ 34,397");
    // Nothing was paid, so no payment note and no customer small print.
    expect(email.text).not.toContain("Paid on");
    expect(email.text).not.toContain("because you placed order");
    expect(email.text).toContain("You get unpaid-order alerts because your address is in ADMIN_EMAILS.");
  });

  test("a customer's own words can't add markup", () => {
    const email = unpaidOrderAlertEmail({
      order: { ...unpaid, shipName: "<b>Ravi</b>", shipCity: "Pune & Co" },
      store,
      customer: { name: null, email: null },
    });
    expect(email.html).toContain("&lt;b&gt;Ravi&lt;/b&gt;");
    expect(email.html).not.toContain("<b>Ravi</b>");
    expect(email.html).toContain("Pune &amp; Co");
    expect(email.text).not.toContain("mailto:");
  });
});

describe("new review alert", () => {
  const review: EmailReview = {
    id: "5d0c2a1e-0000-4000-8000-000000000001",
    name: "Rohit S.",
    place: "Pune Warriors CC",
    rating: 5,
    body: "Picks up beautifully.\n\nMiddle is <huge> & the grip is great.",
    contact: "rohit@example.com",
    isPrivate: false,
    hasPhoto: true,
    productName: "Astaad EW Pro 100",
  };

  test("who, the stars, the product, their words and a link to the admin page", () => {
    const email = newReviewAlertEmail({ review, store });
    expect(email.subject).toBe("New review from Rohit S. · 5 out of 5 stars");
    expect(email.text).toContain("New review from Rohit S., Pune Warriors CC");
    expect(email.text).toContain("It isn’t on the site yet. Open it to publish it or hide it.");
    expect(email.text).toContain(`Open review: https://astaadsports.com/admin/reviews/${review.id}`);
    expect(email.text).toContain(
      "DETAILS\n\nRating: 5 out of 5 stars\nProduct: Astaad EW Pro 100\nPhoto: 1 attached\nContact: rohit@example.com"
    );
    expect(email.text).toContain("WHAT THEY WROTE\n\nPicks up beautifully.\nMiddle is <huge> & the grip is great.");
    expect(email.html).toContain("Middle is &lt;huge&gt; &amp; the grip is great.");
    expect(email.html).not.toContain("<huge>");
    expect(email.text).toContain("You get new-review alerts because your address is in ADMIN_EMAILS.");
  });

  test("private feedback says it can't go on the site", () => {
    const email = newReviewAlertEmail({ review: { ...review, isPrivate: true }, store });
    expect(email.subject).toBe("Private feedback from Rohit S. · 5 out of 5 stars");
    expect(email.text).toContain("They asked for it to stay with the store, so it can’t go on the site.");
    expect(email.text).not.toContain("publish");
  });

  test("leaves out what the customer didn't give", () => {
    const email = newReviewAlertEmail({
      review: { ...review, place: null, contact: null, hasPhoto: false, productName: null },
      store,
    });
    expect(email.text).toContain("New review from Rohit S.\n");
    expect(email.text).toContain("DETAILS\n\nRating: 5 out of 5 stars\n\nWHAT THEY WROTE");
    expect(email.text).not.toContain("Product:");
    expect(email.text).not.toContain("Contact:");
  });
});

describe("packed and cancelled", () => {
  test("packed: it ships soon, what is in the parcel and where it goes", () => {
    const email = orderPackedEmail({ order: packed, store });
    expect(email.text).toContain("We have packed order AST-10001 and it will ship soon.");
    expect(email.text).toContain("Astaad Elite Batting Gloves · Qty 2");
    expect(email.text).toContain("DELIVERING TO\n\nVirat Kohli");
    expect(email.html).toContain('href="https://astaadsports.com/account/orders/10001"');
  });

  test("cancelled: the refund amount and how it comes back, in the returns page's words", () => {
    const email = orderCancelledEmail({ order: cancelled, store });
    expect(email.text).toContain(`We have cancelled order AST-10001, placed on ${formatOrderDate(order.createdAt)}.`);
    expect(email.text).toContain(
      "Your refund of ₹ 34,397 goes back to the payment method you used (UPI, card or net banking) within 7 working days."
    );
    expect(email.text).toContain("REFUND\n\n₹ 34,397");
    expect(email.text).toContain("Contact us: https://astaadsports.com/contact");
    expect(email.html).toContain('Your refund of <span style="white-space:nowrap;">₹ 34,397</span> goes back');
    expect(email.html).toContain("Your refund of ₹ 34,397 is on its way.");
  });
});

describe("test orders", () => {
  test("every email says so in its subject", () => {
    const test = { ...order, isTest: true };
    const subjects = [
      orderConfirmationEmail({ order: test, store }),
      newOrderAlertEmail({ order: test, store, customer, lowStock: [] }),
      orderPackedEmail({ order: { ...packed, isTest: true }, store }),
      orderShippedEmail({ order: { ...shipped, isTest: true }, store }),
      orderCancelledEmail({ order: { ...cancelled, isTest: true }, store }),
    ].map((email) => email.subject);
    for (const subject of subjects) expect(subject).toStartWith("[Test] ");
  });

  test("the alert says not to ship it, and the cancellation that nothing was taken", () => {
    const alert = newOrderAlertEmail({ order: { ...order, isTest: true }, store, customer, lowStock: [] });
    expect(alert.text).toContain("Test order from a test account. No money was taken and no stock was used, so don’t ship it.");
    const email = orderCancelledEmail({ order: { ...cancelled, isTest: true }, store });
    expect(email.text).toContain("This was a test order, so no money was taken and there is nothing to refund.");
    expect(email.text).not.toContain("Your refund");
  });
});
