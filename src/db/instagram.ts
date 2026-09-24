import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "./index";
import { instagramToken, type InstagramToken } from "./schema";

export async function readInstagramToken(): Promise<InstagramToken | undefined> {
  const [row] = await getDb().select().from(instagramToken).where(eq(instagramToken.id, 1)).limit(1);
  return row;
}

export async function writeInstagramToken(token: Omit<InstagramToken, "id">): Promise<void> {
  await getDb()
    .insert(instagramToken)
    .values({ id: 1, ...token })
    .onConflictDoUpdate({ target: instagramToken.id, set: token });
}
