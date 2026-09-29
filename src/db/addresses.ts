import "server-only";

import { and, asc, count, desc, eq, ne } from "drizzle-orm";

import type { ShippingAddress } from "@/lib/checkout";
import { MAX_SAVED_ADDRESSES, sameAddress, type AddressValues, type SavedAddress } from "@/lib/addresses/model";

import { isMissingTable } from "./errors";
import { getDb, type Database } from "./index";
import { addresses, type Address } from "./schema";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

function toSavedAddress(row: Address): SavedAddress {
  return {
    id: row.id,
    label: row.label,
    name: row.name,
    phone: row.phone,
    line1: row.line1,
    line2: row.line2 ?? undefined,
    city: row.city,
    state: row.state as ShippingAddress["state"],
    pincode: row.pincode,
    isDefault: row.isDefault,
  };
}

function columns(values: ShippingAddress & { label?: string | null }) {
  return {
    label: values.label ?? null,
    name: values.name,
    phone: values.phone,
    line1: values.line1,
    line2: values.line2 ?? null,
    city: values.city,
    state: values.state,
    pincode: values.pincode,
  };
}

/** The customer's default first, then the rest, newest first. */
async function rowsOf(db: Database | Transaction, userId: string): Promise<Address[]> {
  return db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault), desc(addresses.createdAt), asc(addresses.id));
}

/**
 * The customer's saved addresses, their default first. None while the table
 * doesn't exist yet, so the pages that show them still open.
 */
export async function listAddresses(userId: string): Promise<SavedAddress[]> {
  try {
    return (await rowsOf(getDb(), userId)).map(toSavedAddress);
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    console.error("The addresses table is missing: run `bun run db:migrate`.");
    return [];
  }
}

/** Take the default off the customer's other addresses, before one of theirs takes it. */
async function clearDefault(tx: Transaction, userId: string, except?: string): Promise<void> {
  await tx
    .update(addresses)
    .set({ isDefault: false })
    .where(and(eq(addresses.userId, userId), eq(addresses.isDefault, true), except ? ne(addresses.id, except) : undefined));
}

export type SaveAddressResult =
  | { ok: true; address: SavedAddress }
  | { ok: false; reason: "limit" | "missing" };

/** Add an address to the customer's book. Their first is their default, whatever the form said. */
export async function createAddress(userId: string, values: AddressValues): Promise<SaveAddressResult> {
  return getDb().transaction(async (tx) => {
    const [{ saved }] = await tx.select({ saved: count() }).from(addresses).where(eq(addresses.userId, userId));
    if (saved >= MAX_SAVED_ADDRESSES) return { ok: false, reason: "limit" };
    const isDefault = values.isDefault || saved === 0;
    if (isDefault) await clearDefault(tx, userId);
    const [row] = await tx
      .insert(addresses)
      .values({ userId, ...columns(values), isDefault })
      .returning();
    return { ok: true, address: toSavedAddress(row) };
  });
}

/**
 * Change one of the customer's addresses. Ticking the default moves it here;
 * unticking it on the default leaves it, since one address must hold it.
 */
export async function updateAddress(userId: string, id: string, values: AddressValues): Promise<SaveAddressResult> {
  return getDb().transaction(async (tx) => {
    if (values.isDefault) await clearDefault(tx, userId, id);
    const [row] = await tx
      .update(addresses)
      .set({ ...columns(values), ...(values.isDefault ? { isDefault: true } : {}) })
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .returning();
    return row ? { ok: true, address: toSavedAddress(row) } : { ok: false, reason: "missing" };
  });
}

/** Make one of the customer's addresses their default. False when it is not theirs. */
export async function setDefaultAddress(userId: string, id: string): Promise<boolean> {
  return getDb().transaction(async (tx) => {
    const [row] = await tx
      .select({ id: addresses.id })
      .from(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .limit(1);
    if (!row) return false;
    await clearDefault(tx, userId, id);
    await tx.update(addresses).set({ isDefault: true }).where(eq(addresses.id, id));
    return true;
  });
}

/**
 * Delete one of the customer's addresses; orders keep their own copy. If it
 * was the default, their newest other address takes over. False when it is
 * not theirs.
 */
export async function deleteAddress(userId: string, id: string): Promise<boolean> {
  return getDb().transaction(async (tx) => {
    const [gone] = await tx
      .delete(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
      .returning();
    if (!gone) return false;
    if (gone.isDefault) {
      const [next] = await rowsOf(tx, userId);
      if (next) await tx.update(addresses).set({ isDefault: true }).where(eq(addresses.id, next.id));
    }
    return true;
  });
}

/**
 * Keep the address an order ships to, unless the customer has it already or
 * their book is full. Their first becomes their default. Never fails the
 * checkout: a problem here is logged and the order goes on.
 */
export async function keepCheckoutAddress(userId: string, address: ShippingAddress): Promise<void> {
  try {
    await getDb().transaction(async (tx) => {
      const saved = await rowsOf(tx, userId);
      if (saved.length >= MAX_SAVED_ADDRESSES) return;
      if (saved.some((row) => sameAddress(toSavedAddress(row), address))) return;
      await tx.insert(addresses).values({ userId, ...columns(address), isDefault: saved.length === 0 });
    });
  } catch (error) {
    console.error("Could not save the checkout address", error);
  }
}
