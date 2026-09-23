"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { upsertUser } from "@/db/users";
import { adminAuth } from "@/lib/firebase/admin";

import { safeRedirectPath, SESSION_COOKIE, SESSION_MAX_AGE_MS } from "./session";

/** Firebase's guidance: only mint a session cookie from a sign-in made in the last five minutes. */
const RECENT_SIGN_IN_SECONDS = 5 * 60;

export interface SignInResult {
  error?: string;
}

/**
 * Exchange a Firebase ID token for an httpOnly session cookie, record the
 * customer in the database, then continue to `next`. Server Actions reject
 * cross-site calls, which covers CSRF for this endpoint.
 */
export async function createSession(idToken: string, next?: string): Promise<SignInResult> {
  if (typeof idToken !== "string" || !idToken) {
    return { error: "Sign-in failed. Please try again." };
  }

  const auth = adminAuth();
  let token;
  try {
    token = await auth.verifyIdToken(idToken, true);
  } catch {
    return { error: "We could not verify your sign-in. Please try again." };
  }

  if (Date.now() / 1000 - token.auth_time > RECENT_SIGN_IN_SECONDS) {
    return { error: "Your sign-in has expired. Please sign in again." };
  }

  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_MS,
  });

  await upsertUser({
    firebaseUid: token.uid,
    email: token.email,
    emailVerified: token.email_verified,
    name: token.name as string | undefined,
    phone: token.phone_number,
    photoUrl: token.picture,
  });

  (await cookies()).set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });

  redirect(safeRedirectPath(next));
}

/** Sign out on this device by dropping the session cookie. */
export async function signOut(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}
