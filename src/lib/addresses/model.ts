// Saved delivery addresses: the address form's fields and checks, and how an
// address reads on the page. Pure and client-safe; the rows live in
// src/db/addresses.ts.
import { addressSchema, type AddressField, type ShippingAddress } from "@/lib/checkout";

/** Plenty for home, work, the academy and a few relatives; keeps a list anyone can scan. */
export const MAX_SAVED_ADDRESSES = 10;

export const ADDRESS_LABEL_MAX = 30;

/** Offered as one-tap names for an address; the customer can type their own. */
export const SUGGESTED_LABELS = ["Home", "Work", "Academy"];

/** A saved address as the pages and forms pass it around: plain values, nothing of the database's. */
export interface SavedAddress extends ShippingAddress {
  id: string;
  /** What the customer calls it, or null. */
  label: string | null;
  isDefault: boolean;
}

export type AddressFormField = AddressField | "label";

export type AddressFieldErrors = Partial<Record<AddressFormField, string>>;

export interface AddressValues extends ShippingAddress {
  label: string | null;
  isDefault: boolean;
}

export type ParsedAddress = { ok: true; values: AddressValues } | { ok: false; fieldErrors: AddressFieldErrors };

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

/**
 * Check the address form, by checkout's rules. Field names: label, name,
 * phone, line1, line2, city, state, pincode, isDefault ("on" when ticked).
 */
export function parseAddressForm(form: FormData): ParsedAddress {
  const fieldErrors: AddressFieldErrors = {};

  const label = text(form, "label");
  if (label.length > ADDRESS_LABEL_MAX) fieldErrors.label = `Keep the name under ${ADDRESS_LABEL_MAX} characters.`;

  const parsed = addressSchema.safeParse({
    name: text(form, "name"),
    phone: text(form, "phone"),
    line1: text(form, "line1"),
    line2: text(form, "line2"),
    city: text(form, "city"),
    state: text(form, "state"),
    pincode: text(form, "pincode"),
  });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !(field in fieldErrors)) fieldErrors[field as AddressField] = issue.message;
    }
  }

  if (!parsed.success || Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  return { ok: true, values: { ...parsed.data, label: label || null, isDefault: form.get("isDefault") === "on" } };
}

/** An address reduced to what makes it the same place for the same person, however it was typed. */
function fingerprint(address: ShippingAddress): string {
  return [address.name, address.phone, address.line1, address.line2 ?? "", address.city, address.state, address.pincode]
    .map((part) => part.trim().replace(/\s+/g, " ").toLowerCase())
    .join("|");
}

/** Whether two addresses are the same person at the same place; capitals and spacing don't count. */
export function sameAddress(a: ShippingAddress, b: ShippingAddress): boolean {
  return fingerprint(a) === fingerprint(b);
}

/** The lines under the name: street, area, then "Ludhiana, Punjab 141002". */
export function addressLines(address: Pick<ShippingAddress, "line1" | "line2" | "city" | "state" | "pincode">): string[] {
  return [address.line1, ...(address.line2 ? [address.line2] : []), `${address.city}, ${address.state} ${address.pincode}`];
}

/** "Home · Ludhiana 141002", or "Arjun Singh Gill · Ludhiana 141002" for one with no name of its own: a saved address in one line. */
export function addressSummary(address: Pick<SavedAddress, "label" | "name" | "city" | "pincode">): string {
  return `${address.label ?? address.name} · ${address.city} ${address.pincode}`;
}
