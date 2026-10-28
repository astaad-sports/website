// WhatsApp Cloud API settings from the environment, and the numbers they
// name. Pure: tests pass their own environment. Sending is in ./cloud-api.ts.

/** Meta's Graph API version, unless WHATSAPP_GRAPH_VERSION names another. */
export const DEFAULT_GRAPH_VERSION = "v23.0";

/** The language the store's templates are approved in (see ./templates.ts). */
export const DEFAULT_TEMPLATE_LANGUAGE = "en";

export interface WhatsAppConfig {
  /** WHATSAPP_ACCESS_TOKEN: a System User token with whatsapp_business_messaging. Null means nothing is sent. */
  accessToken: string | null;
  /** WHATSAPP_PHONE_NUMBER_ID: the business number's id in WhatsApp Manager (not the number itself). */
  phoneNumberId: string | null;
  /** WHATSAPP_BUSINESS_ACCOUNT_ID: the WABA, for submitting the templates (scripts/whatsapp-templates.ts). */
  businessAccountId: string | null;
  /** WHATSAPP_APP_SECRET: the Meta app's secret, which signs every webhook. */
  appSecret: string | null;
  /** WHATSAPP_VERIFY_TOKEN: any value, typed into the app's webhook settings so Meta can check the address. */
  verifyToken: string | null;
  graphVersion: string;
  templateLanguage: string;
  /** NEXT_PUBLIC_WHATSAPP_NUMBER as a waId: the business number customers write to. */
  businessNumber: string | null;
  /**
   * ADMIN_WHATSAPP_NUMBERS as waIds: they get the new-order alert and can SHIP.
   * Never the business number itself, which can't message itself, and whose
   * WhatsApp Business app replies reach the store as echoes, not messages.
   */
  adminNumbers: string[];
}

function setting(env: Record<string, string | undefined>, name: string): string | null {
  const value = env[name]?.trim();
  return value ? value : null;
}

/**
 * A phone number as WhatsApp names it: country code and number, digits only.
 * A 10-digit Indian mobile (with or without +91 or a leading 0) gets 91; a
 * number of 11 to 15 digits is taken to have its country code already.
 * Null for anything else.
 */
export function waIdFromPhone(value: string | null | undefined): string | null {
  if (!value) return null;
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (/^[6-9]\d{9}$/.test(digits)) return `91${digits}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return digits;
  // Another country's number, which an admin may use. An Indian one of the wrong length is not.
  return /^[1-9]\d{10,14}$/.test(digits) && !digits.startsWith("91") ? digits : null;
}

/** The waIds in a comma-separated list, without blanks, numbers that aren't, or repeats. */
export function waIdList(list: string | undefined): string[] {
  if (!list) return [];
  const ids = list.split(",").map((entry) => waIdFromPhone(entry));
  return [...new Set(ids.filter((id): id is string => id !== null))];
}

/** A waId for people: "919876543210" → "+91 98765 43210"; others get a plus. */
export function formatWaId(waId: string): string {
  return /^91\d{10}$/.test(waId) ? `+91 ${waId.slice(2, 7)} ${waId.slice(7)}` : `+${waId}`;
}

/** The same number with all but its last four digits hidden: "+91 ••••• •3210". */
export function maskWaId(waId: string): string {
  const last = waId.slice(-4);
  return /^91\d{10}$/.test(waId) ? `+91 ••••• •${last}` : `+${"•".repeat(Math.max(waId.length - 4, 0))}${last}`;
}

/** How WhatsApp messages are sent, from WHATSAPP_* and ADMIN_WHATSAPP_NUMBERS. A blank value counts as unset. */
export function whatsappConfig(env: Record<string, string | undefined> = process.env): WhatsAppConfig {
  const businessNumber = waIdFromPhone(env.NEXT_PUBLIC_WHATSAPP_NUMBER);
  return {
    accessToken: setting(env, "WHATSAPP_ACCESS_TOKEN"),
    phoneNumberId: setting(env, "WHATSAPP_PHONE_NUMBER_ID"),
    businessAccountId: setting(env, "WHATSAPP_BUSINESS_ACCOUNT_ID"),
    appSecret: setting(env, "WHATSAPP_APP_SECRET"),
    verifyToken: setting(env, "WHATSAPP_VERIFY_TOKEN"),
    graphVersion: setting(env, "WHATSAPP_GRAPH_VERSION") ?? DEFAULT_GRAPH_VERSION,
    templateLanguage: setting(env, "WHATSAPP_TEMPLATE_LANGUAGE") ?? DEFAULT_TEMPLATE_LANGUAGE,
    businessNumber,
    adminNumbers: waIdList(env.ADMIN_WHATSAPP_NUMBERS).filter((number) => number !== businessNumber),
  };
}

/** True once the token and phone number id are set: order updates go out. */
export function whatsappSending(config: WhatsAppConfig = whatsappConfig()): boolean {
  return config.accessToken !== null && config.phoneNumberId !== null;
}

export interface WhatsAppStatus {
  /** The token and phone number id are set, so templates are sent. */
  sending: boolean;
  /** The app secret and verify token are set, so the webhook (and the bot) works. */
  webhook: boolean;
  /** The number customers write to, e.g. "+91 88820 74750"; null until NEXT_PUBLIC_WHATSAPP_NUMBER is set. */
  businessNumber: string | null;
  /** How many ADMIN_WHATSAPP_NUMBERS get the new-order alert. */
  adminNumbers: number;
}

/** For the admin's Settings page. Never exposes a token. */
export function whatsappStatus(env: Record<string, string | undefined> = process.env): WhatsAppStatus {
  const config = whatsappConfig(env);
  return {
    sending: whatsappSending(config),
    webhook: config.appSecret !== null && config.verifyToken !== null,
    businessNumber: config.businessNumber ? formatWaId(config.businessNumber) : null,
    adminNumbers: config.adminNumbers.length,
  };
}
