import "server-only";

import { readWhatsAppAccount, saveWhatsAppAccount, updateWhatsAppAccount } from "@/db/whatsapp";
import { siteUrl } from "@/lib/site";

import { whatsAppCredentials } from "./account";
import { graph } from "./cloud-api";
import { formatWaId, waIdFromPhone, whatsappConfig } from "./config";
import { TEMPLATES, templateSubmission } from "./templates";

function reason(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 500);
}

/**
 * Finish Meta's Embedded Signup for the store's own number, which stays on
 * the WhatsApp Business app (Meta's "coexistence"). In order, as Meta asks:
 * turn the signup's code (good for 30 seconds) into the business token, keep
 * the connection, subscribe the store's app to the account's webhooks, then
 * start the one-time contacts and chat-history syncs, which must start within
 * 24 hours. The number is not registered again: the Business app already has
 * it. Throws only when nothing could be kept; a later step's failure is
 * recorded on the connection and can be tried again (retryAfterConnect).
 */
export async function connectNumber(input: { code: string; businessAccountId: string; phoneNumberId: string }): Promise<{
  displayNumber: string | null;
  error: string | null;
}> {
  const { appId, appSecret } = whatsappConfig();
  if (!appId || !appSecret) throw new Error("Set NEXT_PUBLIC_META_APP_ID and WHATSAPP_APP_SECRET first.");

  const { access_token: accessToken } = (await graph("oauth/access_token", {
    query: { client_id: appId, client_secret: appSecret, code: input.code },
  })) as { access_token?: string };
  if (!accessToken) throw new Error("Meta gave no token for the signup. Try Connect WhatsApp again.");

  // The number as Meta shows it; the connection is kept even if this can't be read.
  const phone = (await graph(input.phoneNumberId, {
    token: accessToken,
    query: { fields: "display_phone_number,verified_name,is_on_biz_app,platform_type" },
  }).catch(() => ({}))) as { display_phone_number?: string };
  const waId = waIdFromPhone(phone.display_phone_number);
  const displayNumber = waId ? formatWaId(waId) : (phone.display_phone_number ?? null);

  await saveWhatsAppAccount({
    businessAccountId: input.businessAccountId,
    phoneNumberId: input.phoneNumberId,
    displayNumber,
    accessToken,
  });
  return { displayNumber, error: await retryAfterConnect() };
}

/**
 * The steps after connecting that haven't happened: the webhook subscription
 * (asked each time; Meta takes a repeat) and each sync not yet started. Each
 * sync can run only once per connection, so one that started is never asked
 * again. Records and returns why a step failed, or null when all are done.
 */
export async function retryAfterConnect(): Promise<string | null> {
  const account = await readWhatsAppAccount();
  if (!account) return "WhatsApp is not connected.";
  const token = account.accessToken;
  try {
    await graph(`${account.businessAccountId}/subscribed_apps`, { token, method: "POST" });
    if (!account.contactsSyncId) {
      const { request_id } = (await graph(`${account.phoneNumberId}/smb_app_data`, {
        token,
        method: "POST",
        body: { messaging_product: "whatsapp", sync_type: "smb_app_state_sync" },
      })) as { request_id?: string };
      await updateWhatsAppAccount({ contactsSyncId: request_id ?? "started" });
    }
    if (!account.historySyncId) {
      const { request_id } = (await graph(`${account.phoneNumberId}/smb_app_data`, {
        token,
        method: "POST",
        body: { messaging_product: "whatsapp", sync_type: "history" },
      })) as { request_id?: string };
      await updateWhatsAppAccount({ historySyncId: request_id ?? "started" });
    }
    await updateWhatsAppAccount({ error: null });
    return null;
  } catch (error) {
    const message = reason(error);
    console.error(`WhatsApp setup after connecting stopped: ${message}`);
    await updateWhatsAppAccount({ error: message }).catch(() => {});
    return message;
  }
}

/** A template as WhatsApp Manager has it: e.g. APPROVED, PENDING or REJECTED, or null when not submitted. */
export interface TemplateState {
  name: string;
  status: string | null;
}

async function templateAccount(): Promise<{ token: string; businessAccountId: string }> {
  const credentials = await whatsAppCredentials();
  const businessAccountId = credentials?.businessAccountId;
  if (!credentials || !businessAccountId) {
    throw new Error("Connect WhatsApp first, or set WHATSAPP_BUSINESS_ACCOUNT_ID.");
  }
  return { token: credentials.accessToken, businessAccountId };
}

async function listSubmitted(account: { token: string; businessAccountId: string }) {
  const { data } = (await graph(`${account.businessAccountId}/message_templates`, {
    token: account.token,
    query: { fields: "name,language,status", limit: "200" },
  })) as { data?: { name: string; language: string; status: string }[] };
  return data ?? [];
}

/** Where each of the store's templates stands in WhatsApp Manager. */
export async function templateStates(): Promise<TemplateState[]> {
  const { templateLanguage } = whatsappConfig();
  const submitted = await listSubmitted(await templateAccount());
  return Object.values(TEMPLATES).map(({ name }) => ({
    name,
    status: submitted.find((row) => row.name === name && row.language === templateLanguage)?.status ?? null,
  }));
}

/**
 * Submit each of the store's templates that WhatsApp Manager doesn't have
 * yet, for Meta to review. Their buttons open SITE_URL, which can't change
 * once approved, so this refuses to run without it.
 */
export async function submitTemplates(): Promise<TemplateState[]> {
  if (!process.env.SITE_URL?.trim()) {
    throw new Error(`Set SITE_URL to the live address first: the buttons would open ${siteUrl()}.`);
  }
  const account = await templateAccount();
  const { templateLanguage } = whatsappConfig();
  const submitted = await listSubmitted(account);
  const states: TemplateState[] = [];
  for (const template of Object.values(TEMPLATES)) {
    const found = submitted.find((row) => row.name === template.name && row.language === templateLanguage);
    if (found) {
      states.push({ name: template.name, status: found.status });
      continue;
    }
    const { status } = (await graph(`${account.businessAccountId}/message_templates`, {
      token: account.token,
      method: "POST",
      body: templateSubmission(template, siteUrl(), templateLanguage),
    })) as { status?: string };
    states.push({ name: template.name, status: status ?? "PENDING" });
  }
  return states;
}
