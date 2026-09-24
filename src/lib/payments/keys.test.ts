import { describe, expect, test } from "bun:test";

import { razorpayKeys } from "./keys";

const live = { RAZORPAY_KEY_ID: "rzp_live_store", RAZORPAY_KEY_SECRET: "live-secret" };
const storeTest = { RAZORPAY_KEY_ID: "rzp_test_store", RAZORPAY_KEY_SECRET: "store-test-secret" };
const testKeys = { RAZORPAY_TEST_KEY_ID: "rzp_test_extra", RAZORPAY_TEST_KEY_SECRET: "extra-secret" };

describe("razorpayKeys", () => {
  test("real orders use the store's keys, whatever mode they are in", () => {
    expect(razorpayKeys(live)).toEqual({ keyId: "rzp_live_store", keySecret: "live-secret" });
    expect(razorpayKeys({ ...storeTest, ...testKeys })?.keyId).toBe("rzp_test_store");
    expect(razorpayKeys({})).toBeNull();
    expect(razorpayKeys({ RAZORPAY_KEY_ID: "rzp_live_store" })).toBeNull();
  });

  test("test orders prefer the separate test keys", () => {
    expect(razorpayKeys({ ...live, ...testKeys }, { test: true })).toEqual({
      keyId: "rzp_test_extra",
      keySecret: "extra-secret",
    });
  });

  test("test orders fall back to the store's keys only while those are test keys", () => {
    expect(razorpayKeys(storeTest, { test: true })?.keyId).toBe("rzp_test_store");
    expect(razorpayKeys(live, { test: true })).toBeNull();
  });

  test("a live key put in the test slot is never used", () => {
    const misplaced = { RAZORPAY_TEST_KEY_ID: "rzp_live_oops", RAZORPAY_TEST_KEY_SECRET: "live-secret" };
    expect(razorpayKeys({ ...live, ...misplaced }, { test: true })).toBeNull();
    expect(razorpayKeys({ ...storeTest, ...misplaced }, { test: true })?.keyId).toBe("rzp_test_store");
  });
});
