"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";

import { linkWithToken, unlinkWhatsApp } from "@/db/whatsapp";
import { requireUser } from "@/lib/auth/session";

import { linkedMessage } from "./bot";
import { sendWhatsApp, whatsappConfigured } from "./cloud-api";

/**
 * Link the WhatsApp number a bot link is for to the signed-in account. The
 * link proves the number (only its WhatsApp was sent it), the session the
 * account. On WhatsApp the bot then says so. Back to the account page either
 * way; a link already used or expired says so there.
 */
export async function linkWhatsApp(token: string): Promise<void> {
  const user = await requireUser(`/account/whatsapp/${token}`);
  const waId = await linkWithToken(token, user.id);
  if (!waId) redirect(`/account/whatsapp/${token}`);

  if (user.email && (await whatsappConfigured())) {
    const email = user.email;
    // They wrote to the store within the last 30 minutes, so a plain message is allowed.
    after(() =>
      sendWhatsApp(waId, linkedMessage(email)).catch((error) =>
        console.error(`WhatsApp link confirmation not sent: ${error instanceof Error ? error.message : "unknown error"}`)
      )
    );
  }
  redirect("/account?whatsapp=linked#whatsapp");
}

/** Let go of the number linked to the signed-in account: it gets no more updates for this account's orders. */
export async function unlinkWhatsAppAccount(): Promise<void> {
  const user = await requireUser("/account");
  await unlinkWhatsApp(user.id);
  redirect("/account#whatsapp");
}
