// Store settings: the defaults, and the Settings form's fields and checks.
// Pure and client-safe; the row lives in src/db/settings.ts.
import type { StoreSettings } from "@/db/schema";
import { DEFAULT_CARRIER, isCarrierId, type CarrierId } from "@/lib/shipping";

export type Settings = Omit<StoreSettings, "id" | "updatedAt">;

/** Until the admin saves Settings (and while no database is configured). */
export const DEFAULT_SETTINGS: Settings = {
  storeName: "Astaad Sports",
  supportEmail: null,
  supportPhone: null,
  storeAddress: null,
  gstin: null,
  freeDelivery: true,
  deliveryFeePaise: 0,
  defaultCarrier: DEFAULT_CARRIER,
  dispatchTime: null,
};

/** What an order pays for delivery. */
export function deliveryFeePaise(settings: Pick<Settings, "freeDelivery" | "deliveryFeePaise">): number {
  return settings.freeDelivery ? 0 : settings.deliveryFeePaise;
}

/** The courier the tracking form starts on. */
export function defaultCarrier(settings: Pick<Settings, "defaultCarrier">): CarrierId {
  return isCarrierId(settings.defaultCarrier) ? settings.defaultCarrier : DEFAULT_CARRIER;
}

export const SETTINGS_LIMITS = {
  storeName: 60,
  supportEmail: 120,
  storeAddress: 200,
  dispatchTime: 60,
  maxDeliveryFeeRupees: 5000,
} as const;

export type SettingsField =
  | "storeName"
  | "supportEmail"
  | "supportPhone"
  | "storeAddress"
  | "gstin"
  | "deliveryFee"
  | "defaultCarrier"
  | "dispatchTime"
  | "adminName";

export type SettingsFieldErrors = Partial<Record<SettingsField, string>>;

export type ParsedSettingsForm =
  | { ok: true; settings: Settings; adminName: string }
  | { ok: false; fieldErrors: SettingsFieldErrors };

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

/** A 10-digit Indian mobile or landline with its STD code, with or without +91: kept as typed, tidied. */
function phoneOrNull(value: string): string | null | "invalid" {
  if (!value) return null;
  const digits = value.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^\d{10}$/.test(digits) ? value : "invalid";
}

/** 15 characters: state code, PAN, entity number, Z, check character. */
const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/**
 * Check the Settings form. Field names: storeName, supportEmail, supportPhone,
 * storeAddress, gstin, freeDelivery ("on" when checked), deliveryFee (rupees),
 * defaultCarrier, dispatchTime, adminName.
 */
export function parseSettingsForm(form: FormData): ParsedSettingsForm {
  const errors: SettingsFieldErrors = {};

  const storeName = text(form, "storeName");
  if (!storeName) errors.storeName = "Enter the store name.";
  else if (storeName.length > SETTINGS_LIMITS.storeName) errors.storeName = `Keep the name under ${SETTINGS_LIMITS.storeName} characters.`;

  const supportEmail = text(form, "supportEmail").toLowerCase();
  if (supportEmail && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail) || supportEmail.length > SETTINGS_LIMITS.supportEmail)) {
    errors.supportEmail = "Enter an email address like help@astaadsports.com.";
  }

  const supportPhone = phoneOrNull(text(form, "supportPhone"));
  if (supportPhone === "invalid") errors.supportPhone = "Enter a 10-digit number, for example 98765 43210.";

  const storeAddress = text(form, "storeAddress");
  if (storeAddress.length > SETTINGS_LIMITS.storeAddress) errors.storeAddress = `Keep the address under ${SETTINGS_LIMITS.storeAddress} characters.`;

  const gstin = text(form, "gstin").toUpperCase().replace(/\s/g, "");
  if (gstin && !GSTIN_PATTERN.test(gstin)) errors.gstin = "A GSTIN has 15 characters, like 03ABCDE1234F1Z5.";

  const freeDelivery = form.get("freeDelivery") === "on";
  let deliveryFeePaise = 0;
  const feeText = text(form, "deliveryFee").replace(/[₹,\s]/g, "").replace(/\.0+$/, "");
  if (!freeDelivery) {
    const fee = /^\d+$/.test(feeText) ? Number(feeText) : Number.NaN;
    if (!feeText) errors.deliveryFee = "Enter the delivery charge, or turn free delivery back on.";
    else if (Number.isNaN(fee) || fee < 1 || fee > SETTINGS_LIMITS.maxDeliveryFeeRupees) {
      errors.deliveryFee = `Enter the charge in whole rupees, up to ${SETTINGS_LIMITS.maxDeliveryFeeRupees}.`;
    } else deliveryFeePaise = fee * 100;
  }

  const defaultCarrier = text(form, "defaultCarrier");
  if (!isCarrierId(defaultCarrier)) errors.defaultCarrier = "Choose a courier.";

  const dispatchTime = text(form, "dispatchTime");
  if (dispatchTime.length > SETTINGS_LIMITS.dispatchTime) errors.dispatchTime = `Keep this under ${SETTINGS_LIMITS.dispatchTime} characters.`;

  const adminName = text(form, "adminName");
  if (!adminName) errors.adminName = "Enter your name.";
  else if (adminName.length > 60) errors.adminName = "Keep your name under 60 characters.";

  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  return {
    ok: true,
    adminName,
    settings: {
      storeName,
      supportEmail: supportEmail || null,
      supportPhone: supportPhone === "invalid" ? null : supportPhone,
      storeAddress: storeAddress || null,
      gstin: gstin || null,
      freeDelivery,
      deliveryFeePaise,
      defaultCarrier,
      dispatchTime: dispatchTime || null,
    },
  };
}
