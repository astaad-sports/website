import { describe, expect, test } from "bun:test";

import { emailConfig, emailStatus, resendPayload, TEST_SENDER, type OutgoingEmail } from "./config";

describe("emailConfig", () => {
  test("with nothing set, no key and the test sender", () => {
    expect(emailConfig({})).toEqual({
      apiKey: null,
      from: TEST_SENDER,
      usingTestSender: true,
      adminRecipients: [],
    });
  });

  test("blank values count as unset", () => {
    const config = emailConfig({ RESEND_API_KEY: "  ", EMAIL_FROM: " ", ADMIN_EMAILS: " , " });
    expect(config.apiKey).toBeNull();
    expect(config.from).toBe(TEST_SENDER);
    expect(config.adminRecipients).toEqual([]);
  });

  test("the key and sender are trimmed", () => {
    const config = emailConfig({
      RESEND_API_KEY: " re_test_123 ",
      EMAIL_FROM: " Astaad Sports <orders@astaadsports.com>\n",
    });
    expect(config.apiKey).toBe("re_test_123");
    expect(config.from).toBe("Astaad Sports <orders@astaadsports.com>");
    expect(config.usingTestSender).toBe(false);
  });

  test("a resend.dev sender is still the test sender", () => {
    expect(emailConfig({ EMAIL_FROM: "Shop <onboarding@resend.dev>" }).usingTestSender).toBe(true);
    expect(emailConfig({ EMAIL_FROM: "onboarding@resend.dev" }).usingTestSender).toBe(true);
  });

  test("ADMIN_EMAILS is split, trimmed, lower-cased and deduped", () => {
    const config = emailConfig({ ADMIN_EMAILS: " Owner@Astaad.in, ops@astaad.in ,,owner@astaad.in, " });
    expect(config.adminRecipients).toEqual(["owner@astaad.in", "ops@astaad.in"]);
  });
});

test("emailStatus says what Settings shows, never the key", () => {
  const status = emailStatus({
    RESEND_API_KEY: "re_secret_value",
    EMAIL_FROM: "Astaad Sports <orders@astaadsports.com>",
    ADMIN_EMAILS: "a@x.in,b@x.in",
  });
  expect(status).toEqual({
    connected: true,
    sender: "Astaad Sports <orders@astaadsports.com>",
    usingTestSender: false,
    adminRecipients: 2,
    unpaidAlerts: false,
  });
  expect(JSON.stringify(status)).not.toContain("re_secret_value");
  expect(emailStatus({}).connected).toBe(false);
  // The daily look for unpaid orders runs only with CRON_SECRET, and Settings never shows it.
  const withCron = emailStatus({ RESEND_API_KEY: "re_secret_value", CRON_SECRET: " cron_secret_value " });
  expect(withCron.unpaidAlerts).toBe(true);
  expect(JSON.stringify(withCron)).not.toContain("cron_secret_value");
  expect(emailStatus({ CRON_SECRET: "  " }).unpaidAlerts).toBe(false);
});

describe("resendPayload", () => {
  const email: OutgoingEmail = {
    to: ["virat@example.com"],
    subject: "Your order AST-10001\r\nis confirmed",
    html: "<p>Hi</p>",
    text: "Hi",
  };

  test("the body Resend takes, with the subject on one line", () => {
    expect(resendPayload(email, TEST_SENDER)).toEqual({
      from: TEST_SENDER,
      to: ["virat@example.com"],
      subject: "Your order AST-10001 is confirmed",
      html: "<p>Hi</p>",
      text: "Hi",
    });
  });

  test("admin copies go as bcc, leaving out anyone the email is already to", () => {
    expect(resendPayload({ ...email, bcc: ["owner@example.com", " Virat@Example.com"] }, TEST_SENDER).bcc).toEqual([
      "owner@example.com",
    ]);
    expect(resendPayload({ ...email, bcc: ["virat@example.com"] }, TEST_SENDER)).not.toHaveProperty("bcc");
    expect(resendPayload({ ...email, bcc: [] }, TEST_SENDER)).not.toHaveProperty("bcc");
  });

  test("the idempotency key is a header, not part of the body", () => {
    expect(resendPayload({ ...email, idempotencyKey: "4f1c0a4e-key" }, TEST_SENDER)).toEqual(
      resendPayload(email, TEST_SENDER)
    );
  });

  test("reply_to only when set", () => {
    expect(resendPayload({ ...email, replyTo: null }, TEST_SENDER)).not.toHaveProperty("reply_to");
    expect(resendPayload({ ...email, replyTo: " " }, TEST_SENDER)).not.toHaveProperty("reply_to");
    expect(resendPayload({ ...email, replyTo: "help@astaadsports.com" }, TEST_SENDER).reply_to).toBe(
      "help@astaadsports.com"
    );
  });

  test("tags keep only letters, digits, _ and -", () => {
    const payload = resendPayload(
      {
        ...email,
        tags: [
          { name: "kind", value: "order_confirmation" },
          { name: "order", value: "AST-10001" },
          { name: "note", value: "Diwali sale · 20%" },
          { name: "", value: "dropped" },
        ],
      },
      TEST_SENDER
    );
    expect(payload.tags).toEqual([
      { name: "kind", value: "order_confirmation" },
      { name: "order", value: "AST-10001" },
      { name: "note", value: "Diwali_sale___20_" },
    ]);
    expect(resendPayload({ ...email, tags: [] }, TEST_SENDER)).not.toHaveProperty("tags");
  });
});
