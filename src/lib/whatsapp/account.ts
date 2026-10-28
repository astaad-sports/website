import "server-only";

import { readWhatsAppAccount } from "@/db/whatsapp";

import { whatsappConfig, whatsappStatus, type WhatsAppStatus } from "./config";

/** What sending needs: the token, and the ids of the number and its WhatsApp Business Account. */
export interface WhatsAppCredentials {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string | null;
}

/**
 * The credentials messages go out with: WHATSAPP_ACCESS_TOKEN and
 * WHATSAPP_PHONE_NUMBER_ID when both are set, else the number Connect
 * WhatsApp connected; null when there is neither. A database that can't be
 * read counts as none, so a payment never waits on it.
 */
export async function whatsAppCredentials(): Promise<WhatsAppCredentials | null> {
  const { accessToken, phoneNumberId, businessAccountId } = whatsappConfig();
  if (accessToken && phoneNumberId) return { accessToken, phoneNumberId, businessAccountId };
  if (!process.env.DATABASE_URL) return null;
  const account = await readWhatsAppAccount().catch((error: unknown) => {
    console.error(`WhatsApp connection not read: ${error instanceof Error ? error.message : "unknown error"}`);
    return undefined;
  });
  return account
    ? { accessToken: account.accessToken, phoneNumberId: account.phoneNumberId, businessAccountId: account.businessAccountId }
    : null;
}

/** True once messages can go out (see whatsAppCredentials). Without that nothing is sent or recorded. */
export async function whatsappConfigured(): Promise<boolean> {
  return (await whatsAppCredentials()) !== null;
}

/** The Settings page's WhatsApp status, with the connected number. Never exposes a token. */
export async function loadWhatsAppStatus(): Promise<WhatsAppStatus> {
  const account = process.env.DATABASE_URL ? await readWhatsAppAccount().catch(() => undefined) : undefined;
  return whatsappStatus(
    account
      ? {
          displayNumber: account.displayNumber,
          connectedAt: account.connectedAt,
          synced: account.contactsSyncId !== null && account.historySyncId !== null,
          error: account.error,
        }
      : null
  );
}
