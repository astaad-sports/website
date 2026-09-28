"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { CircleAlert, LoaderCircle, Send } from "lucide-react";

import { retryEmail, type AdminActionState } from "@/lib/orders/admin-actions";

import { ErrorLine } from "./product-row";
import { safeAction } from "./safe-action";
import { Toast } from "./toast";

/** An order email that didn't send, as the notice shows it. */
export interface FailedEmail {
  id: string;
  /** "Order confirmation" */
  label: string;
  /** "priya@example.com", or several separated by commas. */
  recipients: string;
  /** It never finished sending, so it may have gone: said as such, with no reason. */
  stuck: boolean;
  /** Resend's reason; null when there is none. */
  error: string | null;
}

interface RetryState extends AdminActionState {
  /** The email the last result is about, so its error shows under that one. */
  emailId?: string;
}

const safeRetry = safeAction(retryEmail);

async function retryAndRemember(previous: RetryState, form: FormData): Promise<RetryState> {
  return { ...(await safeRetry(previous, form)), emailId: String(form.get("emailId")) };
}

/** "Send again", with the email named for screen readers, as several can fail. */
function SendAgainButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="-ml-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-sm px-2 text-sm leading-5 font-semibold hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <LoaderCircle className="size-4 animate-spin" strokeWidth={2} aria-hidden="true" />
      ) : (
        <Send className="size-4" strokeWidth={1.5} aria-hidden="true" />
      )}
      {pending ? "Sending…" : "Send again"}
      <span className="sr-only">, {label}</span>
    </button>
  );
}

/**
 * Order emails that didn't send, under the order's header like the stock
 * notice: who each was for, Resend's reason, and Send again. Rendered even
 * with none, so the "Email sent" toast outlives the notice it clears.
 */
export function FailedEmails({ emails }: { emails: FailedEmail[] }) {
  const [state, retry, sending] = useActionState(retryAndRemember, {});
  // The last Send again's row is gone: sent, or no longer due, so an error about it shows below the list.
  const gone = !sending && state.emailId !== undefined && !emails.some((email) => email.id === state.emailId);

  // Send again disables its button and may remove its row, and either drops keyboard focus to the
  // page. Put it back on that row's Send again, else the next one, else the toast.
  const list = useRef<HTMLUListElement>(null);
  const anchor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (sending || !state.emailId) return;
    if (document.activeElement && document.activeElement !== document.body) return;
    const button =
      list.current?.querySelector<HTMLButtonElement>(`[data-email="${CSS.escape(state.emailId)}"] button`) ??
      list.current?.querySelector<HTMLButtonElement>("button");
    (button ?? anchor.current)?.focus();
  }, [sending, state]);

  return (
    <>
      {emails.length > 0 && (
        <ul ref={list} className="mt-2 flex flex-col gap-2">
          {emails.map((email) => {
            // A failed Send again says why in place of the stored reason, which it repeats.
            const retryError = !sending && state.emailId === email.id ? state.error : undefined;
            return (
              <li key={email.id} data-email={email.id} className="flex items-start gap-2">
                <CircleAlert className="mt-0.5 size-5 shrink-0 text-danger" strokeWidth={1.5} aria-hidden="true" />
                <div className="flex min-w-0 flex-col items-start gap-0.5">
                  <p className="text-[15px] leading-[22px] font-semibold text-danger">
                    {email.label} to <span className="break-all">{email.recipients}</span>{" "}
                    {email.stuck ? "didn't finish sending." : "didn't send."}
                  </p>
                  {retryError ? (
                    <ErrorLine message={retryError} />
                  ) : (
                    email.error && <p className="text-[13px] leading-[18px] break-words text-ink-muted">{email.error}</p>
                  )}
                  <form action={retry}>
                    <input type="hidden" name="emailId" value={email.id} />
                    <SendAgainButton label={email.label} />
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {gone && <ErrorLine message={state.error} className="mt-2" />}
      {/* Out of the header's flow, so it adds no gap; the toast itself is fixed to the screen. */}
      <div ref={anchor} tabIndex={-1} className="absolute outline-none">
        <Toast message={state.saved} at={state.at} />
      </div>
    </>
  );
}
