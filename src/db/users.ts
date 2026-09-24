import "server-only";

import { eq, sql } from "drizzle-orm";

import { getDb } from "./index";
import { users, type User } from "./schema";

export interface SignedInProfile {
  firebaseUid: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  phone?: string;
  photoUrl?: string;
}

/**
 * Create or refresh the store's row for a Firebase user at sign-in. Email and
 * verification follow Firebase. A name or phone already on the row wins, so
 * details the customer edits in the store are not overwritten on next sign-in.
 */
export async function upsertUser(profile: SignedInProfile): Promise<User> {
  const now = new Date();
  const [user] = await getDb()
    .insert(users)
    .values({
      firebaseUid: profile.firebaseUid,
      email: profile.email ?? null,
      emailVerified: profile.emailVerified ?? false,
      name: profile.name ?? null,
      phone: profile.phone ?? null,
      photoUrl: profile.photoUrl ?? null,
      lastSignInAt: now,
    })
    .onConflictDoUpdate({
      target: users.firebaseUid,
      set: {
        email: sql`excluded.email`,
        emailVerified: sql`excluded.email_verified`,
        name: sql`coalesce(${users.name}, excluded.name)`,
        phone: sql`coalesce(${users.phone}, excluded.phone)`,
        photoUrl: sql`coalesce(excluded.photo_url, ${users.photoUrl})`,
        lastSignInAt: now,
        updatedAt: now,
      },
    })
    .returning();
  return user;
}

export async function getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.firebaseUid, firebaseUid))
    .limit(1);
  return user;
}

/** The name the admin gives themselves in Settings. Sign-ins keep it (see upsertUser). */
export async function setUserName(id: string, name: string): Promise<void> {
  await getDb().update(users).set({ name }).where(eq(users.id, id));
}
