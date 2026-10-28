import "server-only";

import { whatsappConfig, whatsappSending } from "./config";
import { messagePayload, type OutgoingMessage } from "./messages";

/** Meta refused a message, or never answered. */
export class WhatsAppError extends Error {
  /** The HTTP status; null when no answer came (a network error or the timeout). */
  readonly status: number | null;
  /** Meta's error code, e.g. 131047 (more than 24 hours since the customer wrote) or 132001 (no such template). */
  readonly code: number | null;

  constructor(message: string, status: number | null, code: number | null = null, options?: ErrorOptions) {
    super(message, options);
    this.name = "WhatsAppError";
    this.status = status;
    this.code = code;
  }
}

interface GraphErrorBody {
  error?: { message?: string; code?: number; error_data?: { details?: string } };
}

/** True once WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are set. Without them nothing is sent or recorded. */
export function whatsappConfigured(): boolean {
  return whatsappSending();
}

/** POST to the business number's endpoint `path` ("messages"), within 15 seconds. */
async function post(path: string, body: Record<string, unknown>): Promise<unknown> {
  const { accessToken, phoneNumberId, graphVersion } = whatsappConfig();
  if (!accessToken || !phoneNumberId) {
    throw new Error("WhatsApp is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.");
  }

  let response: Response;
  try {
    response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw new WhatsAppError(timedOut ? "WhatsApp didn't answer within 15 seconds." : "Couldn't reach WhatsApp.", null, null, {
      cause: error,
    });
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    let message = detail.slice(0, 300) || response.statusText;
    let code: number | null = null;
    try {
      const { error } = JSON.parse(detail) as GraphErrorBody;
      message = [error?.message, error?.error_data?.details].filter(Boolean).join(" ") || message;
      code = error?.code ?? null;
    } catch {
      // Not JSON: keep the start of the text.
    }
    throw new WhatsAppError(`WhatsApp (${response.status}${code ? `, ${code}` : ""}): ${message}`, response.status, code);
  }
  return response.json().catch(() => ({}));
}

/**
 * Send one message to `to` (a waId). Resolves with WhatsApp's id for it
 * (the "wamid" its status webhooks quote). Meta accepting it is not
 * delivery: a template it then cannot deliver comes back as a `failed`
 * status on the webhook. Throws a WhatsAppError when Meta refuses it.
 */
export async function sendWhatsApp(to: string, message: OutgoingMessage): Promise<{ id: string }> {
  const body = (await post("messages", messagePayload(to, message))) as { messages?: { id?: string }[] };
  return { id: body.messages?.[0]?.id ?? "" };
}

/** Show the customer's message as read (the blue ticks). Best effort: a failure is only logged. */
export async function markWhatsAppRead(messageId: string): Promise<void> {
  try {
    await post("messages", { messaging_product: "whatsapp", status: "read", message_id: messageId });
  } catch (error) {
    console.error(`WhatsApp message not marked read: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}
