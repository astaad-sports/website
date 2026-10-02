import { describe, expect, test } from "bun:test";

import { processedRefund } from "./refund";

// The shape of Razorpay's refund.processed webhook (razorpay.com/docs/webhooks/payloads/refunds).
const event = {
  entity: "event",
  event: "refund.processed",
  contains: ["refund", "payment"],
  payload: {
    refund: {
      entity: { id: "rfnd_Q1a2b3c4d5", entity: "refund", amount: 150000, currency: "INR", payment_id: "pay_Q1a2b3c4d5", status: "processed" },
    },
    payment: {
      entity: { id: "pay_Q1a2b3c4d5", entity: "payment", amount: 3439700, order_id: "order_Q1a2b3c4", amount_refunded: 150000 },
    },
  },
};

describe("processedRefund", () => {
  test("reads the refund, its amount, its payment and the payment's order", () => {
    expect(processedRefund(event)).toEqual({
      refundId: "rfnd_Q1a2b3c4d5",
      amountPaise: 150000,
      paymentId: "pay_Q1a2b3c4d5",
      razorpayOrderId: "order_Q1a2b3c4",
    });
  });

  test("the payment id can come from the payment when the refund leaves it out", () => {
    const refund = { entity: { id: "rfnd_A", amount: 100 } };
    expect(processedRefund({ ...event, payload: { ...event.payload, refund } })?.paymentId).toBe("pay_Q1a2b3c4d5");
  });

  test("a payment made without an order still reads", () => {
    const payment = { entity: { id: "pay_Q1a2b3c4d5" } };
    expect(processedRefund({ ...event, payload: { ...event.payload, payment } })?.razorpayOrderId).toBeNull();
    expect(processedRefund({ ...event, payload: { refund: event.payload.refund } })?.paymentId).toBe("pay_Q1a2b3c4d5");
  });

  test("only refund.processed counts: a refund just created, or one that failed, is not money on its way", () => {
    for (const name of ["refund.created", "refund.failed", "refund.speed_changed", "order.paid", "payment.captured", undefined]) {
      expect(processedRefund({ ...event, event: name })).toBeNull();
    }
  });

  test("nothing without the refund's id, a whole positive amount or a payment", () => {
    const withRefund = (entity: Record<string, unknown>) => ({ ...event, payload: { refund: { entity }, payment: { entity: {} } } });
    expect(processedRefund(withRefund({ amount: 100, payment_id: "pay_A" }))).toBeNull();
    expect(processedRefund(withRefund({ id: "rfnd_A", payment_id: "pay_A" }))).toBeNull();
    expect(processedRefund(withRefund({ id: "rfnd_A", amount: 0, payment_id: "pay_A" }))).toBeNull();
    expect(processedRefund(withRefund({ id: "rfnd_A", amount: -5, payment_id: "pay_A" }))).toBeNull();
    expect(processedRefund(withRefund({ id: "rfnd_A", amount: 10.5, payment_id: "pay_A" }))).toBeNull();
    expect(processedRefund(withRefund({ id: "rfnd_A", amount: "100", payment_id: "pay_A" }))).toBeNull();
    expect(processedRefund(withRefund({ id: "rfnd_A", amount: 100 }))).toBeNull();
    // The id goes into the email's key, so nothing but Razorpay's own letters.
    expect(processedRefund(withRefund({ id: "rfnd:A:1", amount: 100, payment_id: "pay_A" }))).toBeNull();
    for (const junk of [null, undefined, "refund.processed", 42, [], {}]) expect(processedRefund(junk)).toBeNull();
  });
});
