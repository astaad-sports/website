import { describe, expect, test } from "bun:test";

import { isAdmin } from "./auth/admin";
import { safeRedirectPath } from "./auth/redirect";
import { formatMobile, formatShortDate, mobileHref, parseOrderNumber } from "./format";
import { carrierName, normaliseTrackingNumber, orderTimeline, shipOrderSchema, trackingNumberSchema } from "./shipping";

describe("AWB numbers", () => {
  test("spaces and dashes are dropped and letters upper-cased", () => {
    expect(normaliseTrackingNumber(" 5009 1234-56 ")).toBe("5009123456");
    expect(normaliseTrackingNumber("tp123456789")).toBe("TP123456789");
  });

  test("6 to 20 letters or digits are accepted", () => {
    expect(trackingNumberSchema.parse("5009 123 456")).toBe("5009123456");
    expect(trackingNumberSchema.safeParse("12345").success).toBe(false);
    expect(trackingNumberSchema.safeParse("5009#123456").success).toBe(false);
    expect(trackingNumberSchema.safeParse("1".repeat(21)).success).toBe(false);
  });

  test("a shipment needs a known carrier and an order id", () => {
    const valid = { orderId: "7a0b4c4c-bf19-4812-bf15-cce0eeb7174d", carrier: "trackon", trackingNumber: "5009123456" };
    expect(shipOrderSchema.safeParse(valid).success).toBe(true);
    expect(shipOrderSchema.safeParse({ ...valid, carrier: "delhivery" }).success).toBe(true);
    expect(shipOrderSchema.safeParse({ ...valid, carrier: "fedex" }).success).toBe(false);
    expect(shipOrderSchema.safeParse({ ...valid, orderId: "10001" }).success).toBe(false);
    expect(carrierName("trackon")).toBe("Trackon Couriers");
    expect(carrierName("unknown")).toBe("Courier");
  });
});

test("the timeline fills in as the order moves", () => {
  const placed = new Date("2026-09-24T10:00:00Z");
  const paid = new Date("2026-09-24T10:02:00Z");
  const steps = orderTimeline({ createdAt: placed, paidAt: paid, packedAt: null, shippedAt: null, deliveredAt: null });
  expect(steps.map((step) => step.label)).toEqual(["Order placed", "Payment confirmed", "Packed", "Shipped", "Delivered"]);
  expect(steps.map((step) => step.date !== null)).toEqual([true, true, false, false, false]);
});

describe("isAdmin", () => {
  const list = " owner@astaad.in, Ops@Astaad.in ,";

  test("a verified email on the list is an admin, in any case", () => {
    expect(isAdmin({ email: "owner@astaad.in", emailVerified: true }, list)).toBe(true);
    expect(isAdmin({ email: "OPS@astaad.in", emailVerified: true }, list)).toBe(true);
  });

  test("an unverified email is not, even if listed", () => {
    expect(isAdmin({ email: "owner@astaad.in", emailVerified: false }, list)).toBe(false);
  });

  test("anyone else, no user, or no list is not", () => {
    expect(isAdmin({ email: "customer@example.com", emailVerified: true }, list)).toBe(false);
    expect(isAdmin(null, list)).toBe(false);
    expect(isAdmin({ email: "owner@astaad.in", emailVerified: true }, undefined)).toBe(false);
    expect(isAdmin({ email: "", emailVerified: true }, ",")).toBe(false);
  });
});

test("order numbers parse with or without the AST- prefix", () => {
  expect(parseOrderNumber("10001")).toBe(10001);
  expect(parseOrderNumber("AST-10001")).toBe(10001);
  expect(parseOrderNumber("ast10001")).toBe(10001);
  expect(parseOrderNumber("0")).toBeNull();
  expect(parseOrderNumber("99999999999")).toBeNull();
  expect(parseOrderNumber("10001; drop table")).toBeNull();
});

test("mobiles read +91 98765 43210 and dial as +919876543210", () => {
  expect(formatMobile("9876543210")).toBe("+91 98765 43210");
  expect(formatMobile("+91 98765-43210")).toBe("+91 98765 43210");
  expect(mobileHref("9876543210")).toBe("tel:+919876543210");
  expect(formatMobile("12345")).toBe("12345");
});

test("short dates drop the year only within the same year, in Indian time", () => {
  const now = new Date("2026-10-23T06:00:00Z");
  expect(formatShortDate(new Date("2026-10-22T14:44:00Z"), now)).toBe("22 Oct");
  // 31 Dec 2025, 20:00 UTC is already 1 Jan 2026 in India.
  expect(formatShortDate(new Date("2025-12-31T20:00:00Z"), now)).toBe("1 Jan");
  expect(formatShortDate(new Date("2025-06-01T06:00:00Z"), now)).toBe("1 Jun 2025");
});

test("sign-in only returns to paths on this site", () => {
  expect(safeRedirectPath("/admin/orders?status=pending")).toBe("/admin/orders?status=pending");
  expect(safeRedirectPath("//evil.com")).toBe("/account");
  expect(safeRedirectPath("/\\evil.com")).toBe("/account");
  expect(safeRedirectPath("/\t/evil.com")).toBe("/account");
  expect(safeRedirectPath("/\n/evil.com")).toBe("/account");
  expect(safeRedirectPath("https://evil.com")).toBe("/account");
  expect(safeRedirectPath(undefined, "/admin")).toBe("/admin");
});
