import type { User } from "@/db/schema";

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
  if (!user?.email || !user.emailVerified || !allowlist) return false;
  const email = user.email.trim().toLowerCase();
  return allowlist
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .some((entry) => entry !== "" && entry === email);
}
