import { describe, expect, test } from "bun:test";

import { orderEmails } from "@/db/schema";

import {
  canSendAgain,
  emailsToSendAgain,
  lastSentTracking,
  ORDER_EMAIL_KINDS,
  ORDER_EMAIL_LABEL,
  orderAtEmailStep,
  sendingIsStale,
  STALE_SENDING_MS,
  trackingEmailKey,
  trackingRef,
} from "./kinds";

const NOW = new Date("2026-09-24T10:00:00Z");
/** `minutes` before NOW. */
const ago = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000);

describe("order email kinds", () => {
  test("the list matches the database column", () => {
    expect([...ORDER_EMAIL_KINDS]).toEqual([...orderEmails.kind.enumValues]);
  });

  test("every kind has a label", () => {
    expect(Object.keys(ORDER_EMAIL_LABEL).sort()).toEqual([...ORDER_EMAIL_KINDS].sort());
    expect(ORDER_EMAIL_LABEL.shipped).toBe("Shipping update");
  });
});

describe("tracking keys", () => {
  test("a courier and AWB make one value", () => {
    expect(trackingRef("trackon", "AWB123")).toBe("trackon:AWB123");
  });

  test("the same parcel gives the same value however the AWB was typed", () => {
    expect(trackingRef("trackon", " awb 12-3 ")).toBe("trackon:AWB123");
    expect(trackingRef("Delhivery", "5009123456")).toBe("delhivery:5009123456");
  });

  test("a tracking update's key names the courier, the AWB and the email it follows", () => {
    expect(trackingEmailKey(trackingRef("trackon", "AWB123"), "e1")).toBe("tracking:trackon:AWB123:after:e1");
    // Back to an AWB already emailed, after a different email: a new key, so it goes again.
    expect(trackingEmailKey("trackon:AWB123", "e3")).not.toBe(trackingEmailKey("trackon:AWB123", "e1"));
  });
});

describe("when each email is due", () => {
  test("the confirmation and alert until it ships, shipping emails while shipped, delivery once delivered", () => {
    expect(orderAtEmailStep("order_confirmation", "paid")).toBe(true);
    expect(orderAtEmailStep("order_confirmation", "confirmed")).toBe(true);
    expect(orderAtEmailStep("order_confirmation", "packed")).toBe(true);
    expect(orderAtEmailStep("new_order_alert", "packed")).toBe(true);
    expect(orderAtEmailStep("order_confirmation", "shipped")).toBe(false);
    expect(orderAtEmailStep("new_order_alert", "shipped")).toBe(false);
    expect(orderAtEmailStep("new_order_alert", "delivered")).toBe(false);
    expect(orderAtEmailStep("order_confirmation", "pending_payment")).toBe(false);
    expect(orderAtEmailStep("order_confirmation", "cancelled")).toBe(false);
    expect(orderAtEmailStep("shipped", "shipped")).toBe(true);
    expect(orderAtEmailStep("tracking_updated", "shipped")).toBe(true);
    expect(orderAtEmailStep("shipped", "packed")).toBe(false);
    expect(orderAtEmailStep("shipped", "delivered")).toBe(false);
    expect(orderAtEmailStep("delivered", "delivered")).toBe(true);
    expect(orderAtEmailStep("delivered", "shipped")).toBe(false);
    expect(orderAtEmailStep("packed", "packed")).toBe(true);
    expect(orderAtEmailStep("packed", "confirmed")).toBe(false);
    expect(orderAtEmailStep("packed", "shipped")).toBe(false);
    expect(orderAtEmailStep("cancelled", "cancelled")).toBe(true);
    expect(orderAtEmailStep("cancelled", "paid")).toBe(false);
  });
});

describe("stuck sends", () => {
  test("a send is stuck once it has been sending for longer than ten minutes", () => {
    expect(STALE_SENDING_MS).toBe(10 * 60_000);
    expect(sendingIsStale({ status: "sending", updatedAt: ago(11) }, NOW)).toBe(true);
    expect(sendingIsStale({ status: "sending", updatedAt: ago(10) }, NOW)).toBe(false);
    expect(sendingIsStale({ status: "sending", updatedAt: ago(1) }, NOW)).toBe(false);
    expect(sendingIsStale({ status: "failed", updatedAt: ago(60) }, NOW)).toBe(false);
    expect(sendingIsStale({ status: "sent", updatedAt: ago(60) }, NOW)).toBe(false);
  });
});

describe("Send again", () => {
  const shipped = { status: "shipped" as const, carrier: "trackon", trackingNumber: "AWB1234567" };
  const delivered = { ...shipped, status: "delivered" as const };

  test("is offered for a failed email the order is still at", () => {
    const failed = { kind: "delivered" as const, status: "failed" as const, tracking: null, updatedAt: ago(1) };
    expect(canSendAgain(failed, delivered, null, NOW)).toBe(true);
    expect(canSendAgain(failed, shipped, null, NOW)).toBe(false);
    expect(canSendAgain({ ...failed, status: "sent" }, delivered, null, NOW)).toBe(false);
    const confirmation = { ...failed, kind: "order_confirmation" as const };
    expect(canSendAgain(confirmation, { ...shipped, status: "packed" }, null, NOW)).toBe(true);
    expect(canSendAgain(confirmation, shipped, null, NOW)).toBe(false);
    expect(canSendAgain(confirmation, { ...shipped, status: "cancelled" }, null, NOW)).toBe(false);
  });

  test("is offered for a send that never finished, not for one still under way", () => {
    const sending = { kind: "delivered" as const, status: "sending" as const, tracking: null };
    expect(canSendAgain({ ...sending, updatedAt: ago(11) }, delivered, null, NOW)).toBe(true);
    expect(canSendAgain({ ...sending, updatedAt: ago(1) }, delivered, null, NOW)).toBe(false);
  });

  test("a tracking update only while the order still has that courier and tracking ID", () => {
    const failed = {
      kind: "tracking_updated" as const,
      status: "failed" as const,
      tracking: "trackon:AWB1234567",
      updatedAt: ago(1),
    };
    expect(canSendAgain(failed, shipped, null, NOW)).toBe(true);
    expect(canSendAgain(failed, { ...shipped, trackingNumber: "AWB7654321" }, null, NOW)).toBe(false);
    expect(canSendAgain(failed, { ...shipped, carrier: "delhivery" }, null, NOW)).toBe(false);
    expect(canSendAgain(failed, { ...shipped, carrier: null, trackingNumber: null }, null, NOW)).toBe(false);
  });

  test("not for a tracking update the customer's latest shipping email already gives", () => {
    const failed = {
      kind: "tracking_updated" as const,
      status: "failed" as const,
      tracking: "trackon:AWB1234567",
      updatedAt: ago(1),
    };
    expect(canSendAgain(failed, shipped, "trackon:AWB1234567", NOW)).toBe(false);
    expect(canSendAgain(failed, shipped, "trackon:AWB0000001", NOW)).toBe(true);
  });

  test("a shipping email only while the customer has not been sent the order's tracking", () => {
    // It failed with the first AWB; a tracking update then gave the customer the current one.
    const failed = { kind: "shipped" as const, status: "failed" as const, tracking: "trackon:AWB0000001", updatedAt: ago(1) };
    expect(canSendAgain(failed, shipped, "trackon:AWB1234567", NOW)).toBe(false);
    expect(canSendAgain(failed, shipped, "trackon:AWB0000001", NOW)).toBe(true);
    expect(canSendAgain(failed, shipped, null, NOW)).toBe(true);
    expect(canSendAgain(failed, { ...shipped, carrier: null, trackingNumber: null }, null, NOW)).toBe(false);
  });
});

describe("the customer's latest shipping email", () => {
  const email = (
    kind: "shipped" | "tracking_updated" | "delivered",
    status: "sent" | "failed" | "sending",
    tracking: string | null,
    updatedMinutesAgo: number,
    createdMinutesAgo = updatedMinutesAgo,
    idempotencyKey: string | null = null
  ) => ({ kind, status, tracking, idempotencyKey, updatedAt: ago(updatedMinutesAgo), createdAt: ago(createdMinutesAgo) });

  test("is the newest sent shipping or tracking email", () => {
    expect(lastSentTracking([], NOW)).toBeNull();
    expect(
      lastSentTracking(
        [
          email("shipped", "sent", "trackon:A", 30),
          email("tracking_updated", "sent", "trackon:B", 20),
          email("tracking_updated", "failed", "trackon:C", 10),
          email("tracking_updated", "sending", "trackon:D", 5),
          email("delivered", "sent", null, 1),
        ],
        NOW
      )
    ).toBe("trackon:B");
  });

  test("a retry sent later counts as the latest, however old the email", () => {
    expect(
      lastSentTracking([email("tracking_updated", "sent", "trackon:B", 5, 40), email("tracking_updated", "sent", "trackon:C", 20)], NOW)
    ).toBe("trackon:B");
    // Sent at the same moment: the one created last.
    expect(
      lastSentTracking([email("shipped", "sent", "trackon:A", 5, 40), email("tracking_updated", "sent", "trackon:B", 5, 30)], NOW)
    ).toBe("trackon:B");
  });

  test("is unknown while a later tracking update that may have gone gave other tracking", () => {
    const sent = email("shipped", "sent", "trackon:A", 30);
    // No answer from Resend: the key was kept, so the update may have gone.
    expect(lastSentTracking([sent, email("tracking_updated", "failed", "trackon:B", 20, 20, "k1")], NOW)).toBeNull();
    expect(lastSentTracking([sent, email("tracking_updated", "sending", "trackon:B", 20)], NOW)).toBeNull();
    // Turned down (key cleared), still under way, or giving the same tracking: the customer has A.
    expect(lastSentTracking([sent, email("tracking_updated", "failed", "trackon:B", 20)], NOW)).toBe("trackon:A");
    expect(lastSentTracking([sent, email("tracking_updated", "sending", "trackon:B", 5)], NOW)).toBe("trackon:A");
    expect(lastSentTracking([sent, email("tracking_updated", "failed", "trackon:A", 20, 20, "k1")], NOW)).toBe("trackon:A");
    // Before the email sent, it doesn't count.
    expect(lastSentTracking([email("tracking_updated", "failed", "trackon:B", 40, 40, "k1"), sent], NOW)).toBe("trackon:A");
  });

  test("a move back after an update that may have gone can be sent again", () => {
    // Shipped with A, the update to B timed out, then the update back to A failed too.
    const emails = [
      { ...email("shipped", "sent", "trackon:AWB1234567", 30), id: "shipped" },
      { ...email("tracking_updated", "failed", "trackon:AWB7654321", 20, 20, "k1"), id: "to-b" },
      { ...email("tracking_updated", "failed", "trackon:AWB1234567", 10, 10, "k2"), id: "back-to-a" },
    ];
    const order = { status: "shipped" as const, carrier: "trackon", trackingNumber: "AWB1234567" };
    expect(emailsToSendAgain(emails, order, NOW).map((row) => row.id)).toEqual(["back-to-a"]);
  });

  test("a failed tracking update drops out once the shipping email went with the same AWB", () => {
    // The shipping email (A) and a correction to B both failed; Send again then sent the shipping email with B.
    const emails = [
      { ...email("shipped", "sent", "trackon:AWB1234567", 1, 30), id: "shipped" },
      { ...email("tracking_updated", "failed", "trackon:AWB1234567", 25), id: "update" },
    ];
    const order = { status: "shipped" as const, carrier: "trackon", trackingNumber: "AWB1234567" };
    expect(emailsToSendAgain(emails, order, NOW)).toEqual([]);
    const beforeRetry = [{ ...emails[0], status: "failed" as const, tracking: "trackon:AWB7654321" }, emails[1]];
    expect(emailsToSendAgain(beforeRetry, order, NOW).map((row) => row.id)).toEqual(["shipped", "update"]);
  });
});
