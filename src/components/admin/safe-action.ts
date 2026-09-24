import { unstable_rethrow } from "next/navigation";

import type { ProductActionState } from "@/lib/products/admin-actions";

type ProductAction = (previous: ProductActionState, form: FormData) => Promise<ProductActionState>;

/**
 * A product action as an admin screen runs it. A failure to run (no signal,
 * a server error) becomes the brief's error line instead of the error page,
 * which would throw away what the admin typed; a redirect still goes through.
 * Each result is stamped with this device's clock, so results from different
 * actions on one screen compare fairly when picking the newest message.
 */
export function safeAction(action: ProductAction): ProductAction {
  return async (previous, form) => {
    try {
      return { ...(await action(previous, form)), at: Date.now() };
    } catch (error) {
      unstable_rethrow(error);
      return { error: "Something went wrong. Try again.", at: Date.now() };
    }
  };
}
