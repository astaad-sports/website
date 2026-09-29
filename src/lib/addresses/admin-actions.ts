"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { getCustomer } from "@/db/customers";
import { isAdmin } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/session";

import { makeDefaultFor, removeAddressFor, saveAddressFor, type AddressActionState } from "./save";

const NOT_ADMIN = "Only store admins can change a customer's addresses. Sign in again.";

/**
 * Run a change to a customer's address book for an admin. `customerId` is
 * bound by the customer's page; the admin and the customer are checked here.
 */
async function onCustomerBook(
  customerId: string,
  form: FormData,
  change: (userId: string, form: FormData) => Promise<AddressActionState>
): Promise<AddressActionState> {
  if (!isAdmin(await getCurrentUser())) return { error: NOT_ADMIN, at: Date.now() };
  if (!z.uuid().safeParse(customerId).success || !(await getCustomer(customerId))) {
    return { error: "This customer no longer exists.", at: Date.now() };
  }
  const result = await change(customerId, form);
  if (result.saved) refresh();
  return result;
}

/** Add an address to a customer's book, or save a change to one (`id`). */
export async function saveCustomerAddress(
  customerId: string,
  _previous: AddressActionState,
  form: FormData
): Promise<AddressActionState> {
  return onCustomerBook(customerId, form, saveAddressFor);
}

/** Delete one of a customer's addresses. Posts `id`. */
export async function removeCustomerAddress(
  customerId: string,
  _previous: AddressActionState,
  form: FormData
): Promise<AddressActionState> {
  return onCustomerBook(customerId, form, removeAddressFor);
}

/** Make one of a customer's addresses their default. Posts `id`. */
export async function makeDefaultCustomerAddress(
  customerId: string,
  _previous: AddressActionState,
  form: FormData
): Promise<AddressActionState> {
  return onCustomerBook(customerId, form, makeDefaultFor);
}
