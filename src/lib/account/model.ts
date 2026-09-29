// The customer's own details, as the account page edits them: the form's
// fields and checks. Pure and client-safe; the row lives in src/db/users.ts.
import { normalisePhone } from "@/lib/checkout";

export const PROFILE_LIMITS = { name: 80 } as const;

export type ProfileField = "name" | "phone";

export type ProfileFieldErrors = Partial<Record<ProfileField, string>>;

export interface ProfileValues {
  name: string;
  /** Ten digits, or null when the customer leaves it out. */
  phone: string | null;
}

export type ParsedProfile = { ok: true; values: ProfileValues } | { ok: false; fieldErrors: ProfileFieldErrors };

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

/**
 * Check the account details form. Field names: name, phone. The name is
 * needed; the mobile number can be left empty, which removes it.
 */
export function parseProfileForm(form: FormData): ParsedProfile {
  const fieldErrors: ProfileFieldErrors = {};

  const name = text(form, "name");
  if (name.length < 2) fieldErrors.name = "Enter your full name.";
  else if (name.length > PROFILE_LIMITS.name) fieldErrors.name = `Keep your name under ${PROFILE_LIMITS.name} characters.`;

  const typed = text(form, "phone");
  const phone = normalisePhone(typed);
  if (typed && !/^[6-9]\d{9}$/.test(phone)) fieldErrors.phone = "Enter a 10-digit mobile number, or leave this empty.";

  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  return { ok: true, values: { name, phone: typed ? phone : null } };
}

/** "98765 43210" from the ten digits on the account; anything else is shown as it is. */
export function formatMobile(phone: string): string {
  const digits = normalisePhone(phone);
  return /^\d{10}$/.test(digits) ? `${digits.slice(0, 5)} ${digits.slice(5)}` : phone;
}

/** A Firebase sign-in provider, as the account page names it mid-sentence. Unknown ones are left out. */
const SIGN_IN_METHODS: Record<string, string> = {
  "google.com": "Google",
  password: "an email and password",
};

/** "Google", "an email and password", or both, from a Firebase user's provider ids. */
export function signInMethods(providerIds: readonly string[]): string[] {
  return Object.keys(SIGN_IN_METHODS)
    .filter((id) => providerIds.includes(id))
    .map((id) => SIGN_IN_METHODS[id]);
}
