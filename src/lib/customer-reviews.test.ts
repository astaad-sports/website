import { expect, test } from "bun:test";

import { estimatedDeliveryDate, MERCHANT_ID, reviewOptIn } from "./customer-reviews";

const LIVE = { NODE_ENV: "production", VERCEL_ENV: "production" };

const order = {
  number: 10023,
  email: "player@example.com",
  paidAt: new Date("2026-10-05T06:30:00Z"),
  isTest: false,
};

test("a paid order on the live site asks with Google's fields", () => {
  expect(reviewOptIn(order, LIVE)).toEqual({
    merchant_id: MERCHANT_ID,
    order_id: "AST-10023",
    email: "player@example.com",
    delivery_country: "IN",
    estimated_delivery_date: "2026-10-15",
  });
});

test("the delivery day is an Indian calendar day", () => {
  // 11:30 pm in India on 5 October.
  expect(estimatedDeliveryDate(new Date("2026-10-05T18:00:00Z"))).toBe("2026-10-15");
  // Half past midnight in India on 6 October, still 5 October in UTC.
  expect(estimatedDeliveryDate(new Date("2026-10-05T19:00:00Z"))).toBe("2026-10-16");
  // Across a month's end.
  expect(estimatedDeliveryDate(new Date("2026-10-25T06:30:00Z"))).toBe("2026-11-04");
});

test("test orders, orders without an email and unpaid orders are not asked", () => {
  expect(reviewOptIn({ ...order, isTest: true }, LIVE)).toBeNull();
  expect(reviewOptIn({ ...order, email: null }, LIVE)).toBeNull();
  expect(reviewOptIn({ ...order, paidAt: null }, LIVE)).toBeNull();
});

test("development and preview deploys do not ask", () => {
  expect(reviewOptIn(order, { NODE_ENV: "development" })).toBeNull();
  expect(reviewOptIn(order, { NODE_ENV: "production", VERCEL_ENV: "preview" })).toBeNull();
});
