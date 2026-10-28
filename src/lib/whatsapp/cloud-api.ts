import "server-only";

import { whatsAppCredentials } from "./account";
import { whatsappConfig } from "./config";
import { messagePayload, type OutgoingMessage } from "./messages";

export { whatsappConfigured } from "./account";

/** Meta refused a request, or never answered. */
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

/**
 * One Graph API request ("<id>/<edge>", with the version put in front),
 * within 15 seconds. Resolves with Meta's JSON; throws a WhatsAppError with
 * Meta's message when it refuses.
 */
export async function graph(
  path: string,
  { token, method = "GET", body, query }: { token?: string; method?: "GET" | "POST"; body?: unknown; query?: Record<string, string> }
): Promise<unknown> {
  const { graphVersion } = whatsappConfig();
  const url = new URL(`https://graph.facebook.com/${graphVersion}/${path}`);
  for (const [name, value] of Object.entries(query ?? {})) url.searchParams.set(name, value);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
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

/** POST to the business number's `edge` ("messages") with the credentials messages go out with. */
async function postToNumber(edge: string, body: Record<string, unknown>): Promise<unknown> {
  const credentials = await whatsAppCredentials();
  if (!credentials) throw new Error("WhatsApp is not connected. Use Connect WhatsApp in Settings.");
  return graph(`${credentials.phoneNumberId}/${edge}`, { token: credentials.accessToken, method: "POST", body });
}

/**
 * Send one message to `to` (a waId). Resolves with WhatsApp's id for it
 * (the "wamid" its status webhooks quote). Meta accepting it is not
 * delivery: a template it then cannot deliver comes back as a `failed`
 * status on the webhook. Throws a WhatsAppError when Meta refuses it.
 */
export async function sendWhatsApp(to: string, message: OutgoingMessage): Promise<{ id: string }> {
  const body = (await postToNumber("messages", messagePayload(to, message))) as { messages?: { id?: string }[] };
  return { id: body.messages?.[0]?.id ?? "" };
}

/** Show the customer's message as read (the blue ticks). Best effort: a failure is only logged. */
export async function markWhatsAppRead(messageId: string): Promise<void> {
  try {
    await postToNumber("messages", { messaging_product: "whatsapp", status: "read", message_id: messageId });
  } catch (error) {
    console.error(`WhatsApp message not marked read: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}
