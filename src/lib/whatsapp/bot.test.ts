import { describe, expect, test } from "bun:test";

import type { OrderWithItems } from "@/db/orders";

import { menuMessage, orderMessage, readIntent, shipConfirmId, shipConfirmMessage } from "./bot";

const typed = (text: string) => readIntent({ text, choice: null });

describe("readIntent", () => {
  test("greetings open the menu", () => {
    for (const text of ["hi", "Hello!", "hii", "Menu", "namaste"]) expect(typed(text)).toEqual({ kind: "menu" });
  });

  test("STOP and START, as Meta expects", () => {
    expect(typed("STOP")).toEqual({ kind: "stop" });
    expect(typed("unsubscribe")).toEqual({ kind: "stop" });
    expect(typed("Start")).toEqual({ kind: "start" });
  });

  test("an order number however it is written", () => {
    for (const text of ["AST-10023", "ast 10023", "#10023", "10023", "order no. 10023"]) {
      expect(typed(text)).toEqual({ kind: "track", number: 10023 });
    }
  });

  test("the account page's prefilled text starts linking", () => {
    expect(typed("Link my account")).toEqual({ kind: "link" });
  });

  test("SHIP with an order, a tracking ID and maybe a courier", () => {
    expect(typed("SHIP 10023 5001 2345-6789")).toEqual({
      kind: "ship",
      number: 10023,
      trackingNumber: "500123456789",
      carrier: null,
    });
    expect(typed("ship AST-10023 DL123456 delhivery")).toEqual({
      kind: "ship",
      number: 10023,
      trackingNumber: "DL123456",
      carrier: "delhivery",
    });
    expect(typed("ship 10023")).toEqual({ kind: "admin_ship_help" });
  });

  test("taps come back by their ids", () => {
    expect(readIntent({ text: "My orders", choice: "orders" })).toEqual({ kind: "orders" });
    expect(readIntent({ text: null, choice: "offers" })).toEqual({ kind: "page", page: "offers" });
    const id = shipConfirmId({
      orderId: "0d6b5f0e-3c4c-4a8e-9b7e-2f1f8a3c9d10",
      from: "packed",
      carrier: "trackon",
      trackingNumber: "500123456789",
    });
    expect(readIntent({ text: null, choice: id })).toEqual({
      kind: "ship_confirm",
      orderId: "0d6b5f0e-3c4c-4a8e-9b7e-2f1f8a3c9d10",
      from: "packed",
      carrier: "trackon",
      trackingNumber: "500123456789",
    });
    expect(readIntent({ text: null, choice: "ship:not-an-order:packed:trackon:X" })).toEqual({ kind: "unknown" });
  });

  test("anything else, and photos, are unknown", () => {
    expect(typed("do you have size 5 bats?")).toEqual({ kind: "unknown" });
    expect(readIntent({ text: null, choice: null })).toEqual({ kind: "unknown" });
  });
});

const order = {
  id: "0d6b5f0e-3c4c-4a8e-9b7e-2f1f8a3c9d10",
  number: 10023,
  userId: null,
  status: "shipped",
  isTest: false,
  totalPaise: 499900,
  createdAt: new Date("2026-10-20T06:30:00Z"),
  shipName: "Rahul Sharma",
  shipCity: "Srinagar",
  carrier: "trackon",
  trackingNumber: "500123456789",
  items: [{ productName: "Astaad Falcon Pro", quantity: 1 }],
} as unknown as OrderWithItems;

describe("replies", () => {
  test("the menu has ten rows at most, and an admin section only for admins", () => {
    const writer = { name: "Rahul Sharma", linkedEmail: null, admin: false, optedOut: false };
    const customer = menuMessage(writer, "Astaad Sports");
    const admin = menuMessage({ ...writer, admin: true }, "Astaad Sports");
    if (customer.type !== "list" || admin.type !== "list") throw new Error("not a list");
    const rows = (message: typeof admin) => message.sections.flatMap((section) => section.rows);
    expect(rows(admin).length).toBeLessThanOrEqual(10);
    expect(rows(customer).some((row) => row.id.startsWith("admin:"))).toBe(false);
    expect(rows(admin).some((row) => row.id === "admin:to-ship")).toBe(true);
    expect(customer.body).toStartWith("Hi Rahul!");
  });

  test("an order's details give its tracking and its page", () => {
    const reply = orderMessage(order, "https://astaadsports.com");
    expect(reply).toMatchObject({ type: "link", url: "https://astaadsports.com/orders/0d6b5f0e-3c4c-4a8e-9b7e-2f1f8a3c9d10" });
    if (reply.type !== "link") throw new Error("not a link");
    expect(reply.body).toContain("Tracking number: 500123456789");
    expect(reply.body).toContain("Trackon Couriers");
  });

  test("confirming SHIP names the order, and a shipped one is a correction", () => {
    const packed = shipConfirmMessage({ ...order, status: "packed", trackingNumber: null }, { carrier: "trackon", trackingNumber: "500123456789" });
    if (packed.type !== "buttons") throw new Error("not buttons");
    expect(packed.body).toStartWith("Mark AST-10023 shipped?");
    expect(packed.buttons[0].id).toBe(`ship:${order.id}:packed:trackon:500123456789`);

    const shipped = shipConfirmMessage(order, { carrier: "trackon", trackingNumber: "500999999999" });
    if (shipped.type !== "buttons") throw new Error("not buttons");
    expect(shipped.body).toStartWith("Change the tracking ID of AST-10023 from 500123456789 to 500999999999?");

    const cancelled = shipConfirmMessage({ ...order, status: "cancelled" }, { carrier: "trackon", trackingNumber: "500123456789" });
    if (cancelled.type !== "buttons") throw new Error("not buttons");
    expect(cancelled.body).toContain("can't be shipped");
  });
});
