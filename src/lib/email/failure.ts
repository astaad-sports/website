// Why an email didn't send, and whether it may have gone all the same.
// Pure: src/lib/email/resend.ts throws SendError, and the notifier asks
// sendFailure whether the next try keeps Resend's Idempotency-Key.
import type { OrderEmailKind } from "@/db/schema";

import { isAdminAlert } from "./kinds";

/** Resend didn't take an email: it turned it down, or never answered. */
export class SendError extends Error {
  /** Resend's HTTP status; null when no answer came (a network error or the timeout). */
  readonly status: number | null;
  /** Resend's name for the error, e.g. "validation_error"; null when it gave none. */
  readonly code: string | null;

  constructor(message: string, status: number | null, code: string | null = null, options?: ErrorOptions) {
    super(message, options);
    this.name = "SendError";
    this.status = status;
    this.code = code;
  }
}

/**
 * What a failed send means for the next try.
 * - "unclear": the email may have gone (no answer, a timeout, a 5xx, 408,
 *   429, or 409 concurrent_idempotent_requests). The next try keeps the
 *   Idempotency-Key, so within 24 hours Resend drops it if the first went.
 * - "rejected": it did not go (any other 4xx, such as 403 from the test
 *   sender or an unverified domain, or 422 for a bad address; or it never
 *   reached Resend). The next try starts with a new key.
 * - "earlier_try": 409 invalid_idempotent_request. Resend already has this
 *   key with a different email, so an earlier try may have gone. The next
 *   try, a deliberate Send again, starts with a new key.
 */
export type SendFailure = "unclear" | "rejected" | "earlier_try";

/** Which SendFailure an error from sendEmail (or before it) is. */
export function sendFailure(error: unknown): SendFailure {
  if (!(error instanceof SendError)) return "rejected";
  const { status, code } = error;
  if (status === 409) {
    if (code === "invalid_idempotent_request") return "earlier_try";
    if (code === "concurrent_idempotent_requests") return "unclear";
  }
  if (status === null || status === 408 || status === 429) return "unclear";
  return status >= 400 && status < 500 ? "rejected" : "unclear";
}

/**
 * Why a send of this kind of email failed, in words for the order page. An
 * earlier try that may have gone is checked with whoever it was for: the
 * customer, or the admins' own inboxes for an alert to them.
 */
export function failureReason(error: unknown, kind: OrderEmailKind): string {
  if (sendFailure(error) === "earlier_try") {
    const check = isAdminAlert(kind) ? "Check your inbox" : "Check with the customer";
    return `An earlier try may have gone through. ${check} before sending again.`;
  }
  return error instanceof Error ? error.message : String(error);
}
