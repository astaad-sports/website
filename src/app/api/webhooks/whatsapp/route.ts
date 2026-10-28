import { after } from "next/server";

import { whatsappConfig } from "@/lib/whatsapp/config";
import { handleWebhook } from "@/lib/whatsapp/inbound";
import { isValidMetaSignature, readWebhook } from "@/lib/whatsapp/webhook";

/**
 * Meta's check of the webhook address: in the Meta app, WhatsApp >
 * Configuration > Webhook, enter this URL and WHATSAPP_VERIFY_TOKEN as the
 * verify token. Meta then calls here and expects its challenge back.
 */
export async function GET(request: Request) {
  const { verifyToken } = whatsappConfig();
  if (!verifyToken) return new Response("Verify token is not configured", { status: 503 });
  const params = new URL(request.url).searchParams;
  if (params.get("hub.mode") !== "subscribe" || params.get("hub.verify_token") !== verifyToken) {
    return new Response("Forbidden", { status: 403 });
  }
  return new Response(params.get("hub.challenge") ?? "", { headers: { "Content-Type": "text/plain" } });
}

/**
 * WhatsApp webhooks: subscribe the app to the `messages` field. Customers'
 * messages get the bot's replies (see src/lib/whatsapp/inbound.ts), and the
 * delivery statuses of order updates are recorded. Meta signs each delivery
 * with the app secret (WHATSAPP_APP_SECRET); anything unsigned is turned away.
 * The work happens after the response, since Meta wants an answer quickly
 * and sends again when it gets none.
 */
export async function POST(request: Request) {
  const { appSecret } = whatsappConfig();
  if (!appSecret) return new Response("App secret is not configured", { status: 503 });

  // The signature covers the raw body, so read it before parsing.
  const rawBody = await request.text();
  if (!isValidMetaSignature(rawBody, request.headers.get("x-hub-signature-256") ?? "", appSecret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const contents = readWebhook(body);
  if (contents.messages.length > 0 || contents.statuses.length > 0) after(() => handleWebhook(contents));
  // Acknowledge every signed delivery, handled or not, so Meta does not send it again.
  return Response.json({ received: true });
}
