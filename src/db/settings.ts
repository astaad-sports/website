import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "./index";
import { storeSettings, type StoreSettings } from "./schema";

export type SettingsInput = Omit<StoreSettings, "id" | "updatedAt">;

/** The one settings row (migration 0007 creates it). */
export async function readSettings(): Promise<StoreSettings | undefined> {
  const [row] = await getDb().select().from(storeSettings).where(eq(storeSettings.id, 1)).limit(1);
  return row;
}

export async function writeSettings(input: SettingsInput): Promise<StoreSettings> {
  const [row] = await getDb()
    .insert(storeSettings)
    .values({ id: 1, ...input })
    .onConflictDoUpdate({ target: storeSettings.id, set: input })
    .returning();
  return row;
}
