import type { User } from "@/db/schema";

/**
 * The addresses in ADMIN_EMAILS (comma-separated): trimmed, lower-cased,
 * without blanks or repeats. They can open the admin, and they get the
 * new-order alert email.
 */
export function adminEmails(allowlist: string | undefined): string[] {
  if (!allowlist) return [];
  const entries = allowlist.split(",").map((entry) => entry.trim().toLowerCase());
  return [...new Set(entries.filter((entry) => entry !== ""))];
}

/**
 * Store admins are the accounts listed in ADMIN_EMAILS (comma-separated).
 * The email must be verified: anyone can create a password account with
 * any address, but only its owner can verify it. Google sign-ins are
 * verified. The verified flag refreshes at each sign-in.
 */
export function isAdmin(
  user: Pick<User, "email" | "emailVerified"> | null,
  allowlist: string | undefined = process.env.ADMIN_EMAILS
): boolean {
  if (!user?.email || !user.emailVerified) return false;
  return adminEmails(allowlist).includes(user.email.trim().toLowerCase());
}
