"use server";

import { z } from "zod";

import { optOut, reminderEmail, savedCartFor, saveCartFor } from "@/db/carts";
import { getCurrentUser } from "@/lib/auth/session";
import { cartItemSchema, MAX_LINES, type CartItem } from "@/lib/cart";

const itemsSchema = z.array(cartItemSchema).max(MAX_LINES);

/**
 * Keep the signed-in customer's cart on their account, as the browser has it
 * (an empty cart deletes it), for the cart reminder and for their other
 * devices. Does nothing for a guest. Never throws: the cart works without it.
 */
export async function saveCart(items: unknown): Promise<void> {
  const parsed = itemsSchema.safeParse(items);
  if (!parsed.success) return;
  try {
    const user = await getCurrentUser();
    if (user) await saveCartFor(user.id, parsed.data);
  } catch (error) {
    console.error("Could not save the cart:", error instanceof Error ? error.message : error);
  }
}

/** The signed-in customer's saved cart, for a browser whose own cart is empty; none for a guest. */
export async function loadSavedCart(): Promise<CartItem[]> {
  try {
    const user = await getCurrentUser();
    return user ? await savedCartFor(user.id) : [];
  } catch (error) {
    console.error("Could not load the saved cart:", error instanceof Error ? error.message : error);
    return [];
  }
}

export interface UnsubscribeState {
  done?: boolean;
  error?: string;
}

/** "Stop these emails" on the unsubscribe page: no more cart reminders to the address that reminder went to. */
export async function stopCartReminders(_previous: UnsubscribeState, form: FormData): Promise<UnsubscribeState> {
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return { error: "This link isn't complete. Copy the whole link from the email." };
  try {
    const email = await reminderEmail(id.data);
    if (!email) return { error: "We couldn't find this email. Copy the whole link from the email." };
    await optOut(email);
    return { done: true };
  } catch {
    return { error: "Something went wrong. Try again." };
  }
}
