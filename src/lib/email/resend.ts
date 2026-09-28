import "server-only";

import { emailConfig, resendPayload, type OutgoingEmail } from "./config";
import { SendError } from "./failure";

const API = "https://api.resend.com";

/** True once RESEND_API_KEY is set. Without it no email is sent or recorded. */
export function resendConfigured(): boolean {
  return emailConfig().apiKey !== null;
}

/** What Resend returns when it turns an email down. */
interface ResendErrorBody {
  statusCode?: number;
  message?: string;
  name?: string;
}

/**
 * Send one email through Resend's REST API, from EMAIL_FROM (or Resend's
 * test sender), with the email's Idempotency-Key when it has one. Resolves
 * with Resend's id for it. Throws a SendError: "Resend (<status>): <Resend's
 * message>" with the status and Resend's error name when Resend refuses it,
 * or one with no status when Resend cannot be reached or takes over 15
 * seconds to answer.
 */
export async function sendEmail(email: OutgoingEmail): Promise<{ id: string }> {
  const { apiKey, from } = emailConfig();
  if (!apiKey) throw new Error("Resend is not configured. Set RESEND_API_KEY.");

  let response: Response;
  try {
    response = await fetch(`${API}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(email.idempotencyKey ? { "Idempotency-Key": email.idempotencyKey } : {}),
      },
      body: JSON.stringify(resendPayload(email, from)),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    // No answer, so Resend may have the email all the same.
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw new SendError(timedOut ? "Resend didn't answer within 15 seconds." : "Couldn't reach Resend.", null, null, {
      cause: error,
    });
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    let message = detail.slice(0, 300) || response.statusText;
    let code: string | null = null;
    try {
      const body = JSON.parse(detail) as ResendErrorBody;
      message = body.message || message;
      code = body.name || null;
    } catch {
      // Not JSON (a proxy's error page, say): keep the start of the text.
    }
    throw new SendError(`Resend (${response.status}): ${message}`, response.status, code);
  }

  // A 2xx means Resend has the email, so it counts as sent even if the reply is odd:
  // treating it as failed would invite a second copy.
  const body = (await response.json().catch(() => ({}))) as { id?: string };
  return { id: body.id ?? "" };
}
