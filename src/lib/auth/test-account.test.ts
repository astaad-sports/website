import { describe, expect, test } from "bun:test";

import { isTestAccount } from "./test-account";

describe("isTestAccount", () => {
  test("matches a listed email, ignoring case and spaces", () => {
    expect(isTestAccount({ email: "Test@Astaad.in" }, " shop@astaad.in , test@astaad.in")).toBe(true);
  });

  test("everyone else, and every account when the list is empty, is a customer", () => {
    expect(isTestAccount({ email: "buyer@example.com" }, "test@astaad.in")).toBe(false);
    expect(isTestAccount({ email: "test@astaad.in" }, undefined)).toBe(false);
    expect(isTestAccount({ email: "test@astaad.in" }, " , ")).toBe(false);
    expect(isTestAccount({ email: null }, "test@astaad.in")).toBe(false);
    expect(isTestAccount(null, "test@astaad.in")).toBe(false);
  });
});
