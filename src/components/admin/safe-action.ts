import { unstable_rethrow } from "next/navigation";

/** Any admin action result: a message for the page, and when it arrived. */
type ActionState = { error?: string; at?: number };

/**
 * An admin action as a screen runs it. A failure to run (no signal, a server
 * error) becomes the brief's error line instead of the error page, which
 * would throw away what the admin typed; a redirect still goes through. Each
 * result is stamped with this device's clock, so results from different
 * actions on one screen compare fairly when picking the newest message.
 */
export function safeAction<S extends ActionState>(
  action: (previous: S, form: FormData) => Promise<S>
): (previous: S, form: FormData) => Promise<S> {
  return async (previous, form) => {
    try {
      return { ...(await action(previous, form)), at: Date.now() };
    } catch (error) {
      unstable_rethrow(error);
      return { error: "Something went wrong. Try again.", at: Date.now() } as S;
    }
  };
}
