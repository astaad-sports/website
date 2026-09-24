import "server-only";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import type { User } from "@/db/schema";
import { getUserByFirebaseUid } from "@/db/users";
import { adminAuth } from "@/lib/firebase/admin";

import { isAdmin } from "./admin";
import { safeRedirectPath } from "./redirect";

/**
 * Named for this store: browsers share localhost cookies across ports, and
 * other local apps (Firebase's convention is "__session") would collide.
 */
export const SESSION_COOKIE = "astaad_session";

/** Two weeks, the longest session cookie Firebase will issue. */
export const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export { safeRedirectPath } from "./redirect";

/**
 * The signed-in customer, or null. Verifies the Firebase session cookie
 * (including revocation and disabled accounts) and loads the store's row.
 * Memoised per request, so layouts and pages can all call it.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;

  const auth = adminAuth();
  let uid: string;
  try {
    ({ uid } = await auth.verifySessionCookie(sessionCookie, true));
  } catch (error) {
    // Expired, revoked or tampered cookies simply mean "signed out".
    const code = (error as { code?: string }).code ?? "";
    if (!code.startsWith("auth/")) console.error("Session verification failed", error);
    return null;
  }

  return (await getUserByFirebaseUid(uid)) ?? null;
});

/** For pages and actions that need a customer: sends everyone else to sign in, then back to `returnTo`. */
export async function requireUser(returnTo: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeRedirectPath(returnTo))}`);
  return user;
}

/** For admin pages: signed-out visitors go to sign in; signed-in non-admins get a 404, so the area stays unadvertised. */
export async function requireAdmin(returnTo: string): Promise<User> {
  const user = await requireUser(returnTo);
  if (!isAdmin(user)) notFound();
  return user;
}
