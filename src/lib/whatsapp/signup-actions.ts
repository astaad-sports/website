"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { isAdmin } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/session";

import { connectNumber, retryAfterConnect, submitTemplates, type TemplateState } from "./manage";

export type WhatsAppSetupResult = { ok: true; message: string; templates?: TemplateState[] } | { ok: false; error: string };

const NOT_ADMIN: WhatsAppSetupResult = { ok: false, error: "Only store admins can set up WhatsApp. Sign in again." };

const signupSchema = z.object({
  code: z.string().min(1).max(2048),
  businessAccountId: z.string().regex(/^\d{5,25}$/),
  phoneNumberId: z.string().regex(/^\d{5,25}$/),
});

function failed(error: unknown): WhatsAppSetupResult {
  return { ok: false, error: error instanceof Error ? error.message : String(error) };
}

/**
 * What Meta's Embedded Signup gave the admin's browser: the code and the ids
 * of the account and number. Connects the number (see connectNumber).
 */
export async function finishWhatsAppSignup(input: unknown): Promise<WhatsAppSetupResult> {
  if (!isAdmin(await getCurrentUser())) return NOT_ADMIN;
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Meta's signup didn't say which number was connected. Try again." };
  try {
    const { displayNumber, error } = await connectNumber(parsed.data);
    refresh();
    return error
      ? { ok: false, error: `Connected ${displayNumber ?? "the number"}, but the next step failed: ${error}` }
      : { ok: true, message: `Connected ${displayNumber ?? "the number"}. Your chats and contacts are syncing.` };
  } catch (error) {
    return failed(error);
  }
}

/** Try the webhook subscription and any sync that hasn't started again. */
export async function retryWhatsAppSetup(): Promise<WhatsAppSetupResult> {
  if (!isAdmin(await getCurrentUser())) return NOT_ADMIN;
  const error = await retryAfterConnect().catch((caught: unknown) => (caught instanceof Error ? caught.message : String(caught)));
  refresh();
  return error ? { ok: false, error } : { ok: true, message: "Done. Your chats and contacts are syncing." };
}

/** Submit the order templates WhatsApp Manager doesn't have yet. */
export async function submitWhatsAppTemplates(): Promise<WhatsAppSetupResult> {
  if (!isAdmin(await getCurrentUser())) return NOT_ADMIN;
  try {
    const templates = await submitTemplates();
    refresh();
    return { ok: true, message: "Templates sent to Meta for review.", templates };
  } catch (error) {
    return failed(error);
  }
}
