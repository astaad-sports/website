"use server";

import { refresh } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";

import { makeDefaultFor, removeAddressFor, saveAddressFor, type AddressActionState } from "./save";

const SIGNED_OUT: AddressActionState = { error: "Your session has ended. Sign in again to change your addresses." };

/** Run a change to the signed-in customer's own address book, then show the page as it is now. */
async function onOwnBook(
  form: FormData,
  change: (userId: string, form: FormData) => Promise<AddressActionState>
): Promise<AddressActionState> {
  const user = await getCurrentUser();
  if (!user) return { ...SIGNED_OUT, at: Date.now() };
  const result = await change(user.id, form);
  if (result.saved) refresh();
  return result;
}

/** Add an address, or save a change to one (`id`), from the account page. */
export async function saveAddress(_previous: AddressActionState, form: FormData): Promise<AddressActionState> {
  return onOwnBook(form, saveAddressFor);
}

/** Delete one of the customer's addresses. Posts `id`. */
export async function removeAddress(_previous: AddressActionState, form: FormData): Promise<AddressActionState> {
  return onOwnBook(form, removeAddressFor);
}

/** Make one of the customer's addresses their default. Posts `id`. */
export async function makeDefaultAddress(_previous: AddressActionState, form: FormData): Promise<AddressActionState> {
  return onOwnBook(form, makeDefaultFor);
}
