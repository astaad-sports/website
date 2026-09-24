"use server";

import { readSettings, writeSettings } from "@/db/settings";
import { setUserName } from "@/db/users";
import { isAdmin } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { productsChanged } from "@/lib/products/catalogue";

import { parseSettingsForm, type SettingsFieldErrors } from "./model";

export interface SettingsActionState {
  fieldErrors?: SettingsFieldErrors;
  error?: string;
  saved?: string;
  at?: number;
}

/**
 * Save the Settings page: the store's details, delivery, courier and dispatch
 * line, and the signed-in admin's own name. See parseSettingsForm for the fields.
 */
export async function saveSettings(_previous: SettingsActionState, form: FormData): Promise<SettingsActionState> {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) return { error: "Only store admins can change settings. Sign in again.", at: Date.now() };

  const parsed = parseSettingsForm(form);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, error: "Check the highlighted fields.", at: Date.now() };

  // Free delivery hides the charge field; keep the saved charge for when it's turned off again.
  const settings = parsed.settings.freeDelivery
    ? { ...parsed.settings, deliveryFeePaise: (await readSettings())?.deliveryFeePaise ?? 0 }
    : parsed.settings;
  await writeSettings(settings);
  if (parsed.adminName !== user.name) await setUserName(user.id, parsed.adminName);
  // Delivery charges and store details show on every storefront page.
  productsChanged();
  return { saved: "Settings saved", at: Date.now() };
}
