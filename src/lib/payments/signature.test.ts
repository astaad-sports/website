import { describe, expect, test } from "bun:test";

import { isValidPaymentSignature, isValidWebhookSignature } from "./signature";

// Expected values computed independently with:
//   printf '%s' 'order_Test123|pay_Test456' | openssl dgst -sha256 -hmac 'test_key_secret'
const PAYMENT_SIGNATURE = "799d6fd003c483487cc40dbd1d05ce1ea2fb2465cd25fd96c1245b698736270b";
//   printf '%s' '{"event":"order.paid","payload":{}}' | openssl dgst -sha256 -hmac 'whsec_test'
const WEBHOOK_BODY = '{"event":"order.paid","payload":{}}';
const WEBHOOK_SIGNATURE = "27c683bdcd2cea646d656841839bd173ce8e838f2bdd16ae99213b27cd3e3634";

describe("isValidPaymentSignature", () => {
  const payment = { orderId: "order_Test123", paymentId: "pay_Test456", signature: PAYMENT_SIGNATURE };

  test("accepts Razorpay's signature for the order and payment", () => {
    expect(isValidPaymentSignature(payment, "test_key_secret")).toBe(true);
  });

  test("rejects a different secret, order, payment or signature", () => {
    expect(isValidPaymentSignature(payment, "other_secret")).toBe(false);
    expect(isValidPaymentSignature({ ...payment, orderId: "order_Other" }, "test_key_secret")).toBe(false);
    expect(isValidPaymentSignature({ ...payment, paymentId: "pay_Other" }, "test_key_secret")).toBe(false);
    expect(isValidPaymentSignature({ ...payment, signature: "0".repeat(64) }, "test_key_secret")).toBe(false);
    expect(isValidPaymentSignature({ ...payment, signature: "" }, "test_key_secret")).toBe(false);
  });
});

describe("isValidWebhookSignature", () => {
  test("accepts the signature of the raw body", () => {
    expect(isValidWebhookSignature(WEBHOOK_BODY, WEBHOOK_SIGNATURE, "whsec_test")).toBe(true);
  });

  test("rejects a re-serialised body, another secret or a bad signature", () => {
    const reformatted = JSON.stringify(JSON.parse(WEBHOOK_BODY), null, 2);
    expect(isValidWebhookSignature(reformatted, WEBHOOK_SIGNATURE, "whsec_test")).toBe(false);
    expect(isValidWebhookSignature(WEBHOOK_BODY, WEBHOOK_SIGNATURE, "whsec_other")).toBe(false);
    expect(isValidWebhookSignature(WEBHOOK_BODY, "abc", "whsec_test")).toBe(false);
  });
});
