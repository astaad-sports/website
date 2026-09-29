import "server-only";

import { z } from "zod";

import { createAddress, deleteAddress, setDefaultAddress, updateAddress } from "@/db/addresses";
import { isMissingTable } from "@/db/errors";

import { MAX_SAVED_ADDRESSES, parseAddressForm, type AddressFieldErrors } from "./model";

/** What an address action hands back to the address book. */
export interface AddressActionState {
  /** The success message, e.g. "Address saved". */
  saved?: string;
  error?: string;
  fieldErrors?: AddressFieldErrors;
  /** Changes on every result, so the same message shows again. */
  at?: number;
}

const GONE = "This address no longer exists.";
const NOT_READY = "Saved addresses are not ready yet. Please try again in a little while.";

const failed = (error: string): AddressActionState => ({ error, at: Date.now() });
const done = (saved: string): AddressActionState => ({ saved, at: Date.now() });

/** Run a change to the book; a database that has no addresses table yet answers with a plain message. */
async function changing(change: () => Promise<AddressActionState>): Promise<AddressActionState> {
  try {
    return await change();
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    console.error("The addresses table is missing: run `bun run db:migrate`.");
    return failed(NOT_READY);
  }
}

function addressId(form: FormData): string | null {
  const id = form.get("id");
  return typeof id === "string" && z.uuid().safeParse(id).success ? id : null;
}

/**
 * Add an address to `userId`'s book, or change one of theirs (`id`). The
 * caller has checked who is asking: the customer themselves, or an admin.
 */
export async function saveAddressFor(userId: string, form: FormData): Promise<AddressActionState> {
  const editing = form.get("id") !== null && form.get("id") !== "";
  const id = addressId(form);
  if (editing && !id) return failed(GONE);

  const parsed = parseAddressForm(form);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, error: "Check the highlighted details.", at: Date.now() };

  return changing(async () => {
    const result = id ? await updateAddress(userId, id, parsed.values) : await createAddress(userId, parsed.values);
    if (result.ok) return done(id ? "Address saved" : "Address added");
    return failed(
      result.reason === "limit"
        ? `An account holds up to ${MAX_SAVED_ADDRESSES} addresses. Delete one to add another.`
        : GONE
    );
  });
}

/** Delete one of `userId`'s addresses. Posts `id`. */
export async function removeAddressFor(userId: string, form: FormData): Promise<AddressActionState> {
  const id = addressId(form);
  if (!id) return failed(GONE);
  return changing(async () => ((await deleteAddress(userId, id)) ? done("Address deleted") : failed(GONE)));
}

/** Make one of `userId`'s addresses their default. Posts `id`. */
export async function makeDefaultFor(userId: string, form: FormData): Promise<AddressActionState> {
  const id = addressId(form);
  if (!id) return failed(GONE);
  return changing(async () => ((await setDefaultAddress(userId, id)) ? done("Default address changed") : failed(GONE)));
}
