// Resend settings from the environment, and the body of Resend's
// POST /emails. Pure: tests pass their own environment. The sending itself
// is in src/lib/email/resend.ts.
import { adminEmails } from "@/lib/auth/admin";

/**
 * Resend's shared test sender, used until EMAIL_FROM is set. It only
 * delivers to the Resend account owner's own address.
 */
export const TEST_SENDER = "Astaad Sports <onboarding@resend.dev>";

export interface EmailConfig {
  /** RESEND_API_KEY; null means no emails are sent. */
  apiKey: string | null;
  /** EMAIL_FROM, or the test sender. */
  from: string;
  /** Sending from resend.dev, which only reaches the Resend account owner. */
  usingTestSender: boolean;
  /** ADMIN_EMAILS, tidied: they get the new-order alert, and a copy of the customer's later emails. */
  adminRecipients: string[];
}

function setting(env: Record<string, string | undefined>, name: string): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

/**
 * How order emails are sent: RESEND_API_KEY, EMAIL_FROM (else the test
 * sender) and ADMIN_EMAILS. A blank value counts as unset.
 */
export function emailConfig(env: Record<string, string | undefined> = process.env): EmailConfig {
  const from = setting(env, "EMAIL_FROM") ?? TEST_SENDER;
  return {
    apiKey: setting(env, "RESEND_API_KEY"),
    from,
    usingTestSender: /@resend\.dev>?$/i.test(from),
    adminRecipients: adminEmails(env.ADMIN_EMAILS),
  };
}

export interface EmailStatus {
  /** RESEND_API_KEY is set, so order emails go out. */
  connected: boolean;
  /** Who emails come from, e.g. "Astaad Sports <no-reply@astaadsports.com>". */
  sender: string;
  usingTestSender: boolean;
  /** How many ADMIN_EMAILS addresses get the alerts and copies. */
  adminRecipients: number;
  /** CRON_SECRET is set, so the daily look for unpaid orders runs (src/app/api/cron/unpaid-orders). */
  unpaidAlerts: boolean;
}

/** For the admin's Settings page. Never exposes the key itself. */
export function emailStatus(env: Record<string, string | undefined> = process.env): EmailStatus {
  const config = emailConfig(env);
  return {
    connected: config.apiKey !== null,
    sender: config.from,
    usingTestSender: config.usingTestSender,
    adminRecipients: config.adminRecipients.length,
    unpaidAlerts: setting(env, "CRON_SECRET") !== null,
  };
}

/** One email, ready to send. */
export interface OutgoingEmail {
  to: string[];
  /** Hidden copies: the admins' copy of a customer's email. */
  bcc?: string[];
  subject: string;
  html: string;
  text: string;
  /** Where replies go: the support email from Settings. */
  replyTo?: string | null;
  /** For finding the email in Resend's logs, e.g. { name: "kind", value: "shipped" }. */
  tags?: { name: string; value: string }[];
  /** Sent as Resend's Idempotency-Key header, not in the body: a repeat within 24 hours is not sent again. */
  idempotencyKey?: string;
}

/** Resend allows only ASCII letters, digits, _ and - in tags, up to 256 characters. */
function tagText(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 256);
}

/**
 * The JSON body for Resend's POST /emails: from, to, subject (on one line),
 * html and text; bcc (less anyone already in `to`) and reply_to only when
 * set; tags sanitised as Resend requires.
 */
export function resendPayload(email: OutgoingEmail, from: string): Record<string, unknown> {
  const replyTo = email.replyTo?.trim();
  const to = new Set(email.to.map((address) => address.trim().toLowerCase()));
  const bcc = (email.bcc ?? []).filter((address) => !to.has(address.trim().toLowerCase()));
  const tags = (email.tags ?? [])
    .map((tag) => ({ name: tagText(tag.name), value: tagText(tag.value) }))
    .filter((tag) => tag.name !== "" && tag.value !== "");
  return {
    from,
    to: email.to,
    subject: email.subject.replace(/\s+/g, " ").trim(),
    html: email.html,
    text: email.text,
    ...(bcc.length > 0 ? { bcc } : {}),
    ...(replyTo ? { reply_to: replyTo } : {}),
    ...(tags.length > 0 ? { tags } : {}),
  };
}
