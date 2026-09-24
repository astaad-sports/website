import type { User } from "@/db/schema";

/**
 * Test accounts are the accounts listed in TEST_ACCOUNT_EMAILS
 * (comma-separated). They shop like any customer, but every order they place
 * is a test order: paid in Razorpay's test mode, never taken from stock, and
 * listed apart from real orders in the admin. Unlike ADMIN_EMAILS, the email
 * need not be verified, so a made-up address works; whoever signs up with it
 * only gets orders that take no money and are never shipped.
 */
export function isTestAccount(
  user: Pick<User, "email"> | null,
  allowlist: string | undefined = process.env.TEST_ACCOUNT_EMAILS
): boolean {
  if (!user?.email || !allowlist) return false;
  const email = user.email.trim().toLowerCase();
  return allowlist
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .some((entry) => entry !== "" && entry === email);
}
