import "server-only";

import { and, asc, desc, eq, gte, isNull, lte, ne, sql } from "drizzle-orm";

import { getDb } from "./index";
import { offers, type NewOffer, type Offer } from "./schema";

function isUniqueViolation(error: unknown, constraint: string): boolean {
  for (let current = error; current; current = (current as { cause?: unknown }).cause) {
    const pg = current as { code?: string; constraint?: string };
    if (pg.code === "23505" && pg.constraint === constraint) return true;
  }
  return false;
}

/** Every offer, newest first. The store has a handful a year. */
export async function listOffers(): Promise<Offer[]> {
  return getDb().select().from(offers).orderBy(desc(offers.startsAt), asc(offers.name));
}

export async function getOffer(id: string): Promise<Offer | undefined> {
  const [offer] = await getDb().select().from(offers).where(eq(offers.id, id)).limit(1);
  return offer;
}

/**
 * Offers without a code that have not ended, for pricing the store. Upcoming
 * ones are included so a cached catalogue can be rebuilt as they start.
 */
export async function listAutomaticOffers(now: Date = new Date()): Promise<Offer[]> {
  return getDb()
    .select()
    .from(offers)
    .where(and(isNull(offers.code), gte(offers.endsAt, now)));
}

/** The offer behind a coupon code (upper case), whatever its dates. */
export async function findOfferByCode(code: string): Promise<Offer | undefined> {
  const [offer] = await getDb().select().from(offers).where(eq(offers.code, code)).limit(1);
  return offer;
}

/** Offers running now, for Home. */
export async function listActiveOffers(now: Date = new Date()): Promise<Offer[]> {
  return getDb()
    .select()
    .from(offers)
    .where(and(lte(offers.startsAt, now), gte(offers.endsAt, now)))
    .orderBy(asc(offers.endsAt));
}

export type OfferInput = Omit<NewOffer, "id" | "createdAt" | "updatedAt">;

export type OfferWriteResult = { ok: true; offer: Offer } | { ok: false; reason: "not_found" | "code_taken" };

export async function createOffer(input: OfferInput): Promise<OfferWriteResult> {
  try {
    const [offer] = await getDb().insert(offers).values(input).returning();
    return { ok: true, offer };
  } catch (error) {
    if (isUniqueViolation(error, "offers_code_unique")) return { ok: false, reason: "code_taken" };
    throw error;
  }
}

export async function updateOffer(id: string, input: OfferInput): Promise<OfferWriteResult> {
  try {
    const [offer] = await getDb().update(offers).set(input).where(eq(offers.id, id)).returning();
    return offer ? { ok: true, offer } : { ok: false, reason: "not_found" };
  } catch (error) {
    if (isUniqueViolation(error, "offers_code_unique")) return { ok: false, reason: "code_taken" };
    throw error;
  }
}

/** Whether another offer already uses this code. */
export async function codeInUse(code: string, exceptId?: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: offers.id })
    .from(offers)
    .where(exceptId ? and(eq(offers.code, code), ne(offers.id, exceptId)) : eq(offers.code, code))
    .limit(1);
  return Boolean(row);
}

/**
 * Stop a running offer now. Its end moves to this moment (never before its
 * start), so it shows as expired with the day it really ended.
 */
export async function endOfferNow(id: string, now: Date = new Date()): Promise<Offer | undefined> {
  const [offer] = await getDb()
    .update(offers)
    .set({ endsAt: sql`greatest(${offers.startsAt} + interval '1 millisecond', least(${offers.endsAt}, ${now}))` })
    .where(eq(offers.id, id))
    .returning();
  return offer;
}

export async function deleteOffer(id: string): Promise<boolean> {
  const deleted = await getDb().delete(offers).where(eq(offers.id, id)).returning({ id: offers.id });
  return deleted.length > 0;
}
