"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Toast } from "./toast";

export type OfferDone = "created" | "deleted";

const MESSAGE: Record<OfferDone, string> = { created: "Offer created", deleted: "Offer deleted" };

/**
 * "Offer created" or "Offer deleted" once, after the offer form sends the
 * admin back to the list with ?done=. The URL then loses ?done=, so a reload
 * or Back doesn't say it again.
 */
export function OfferDoneToast({ done, href }: { done: OfferDone | null; href: string }) {
  const router = useRouter();
  // Kept when ?done= goes; `at` 1 because it only ever shows once.
  const [message] = useState(() => (done ? MESSAGE[done] : undefined));

  useEffect(() => {
    if (done) router.replace(href, { scroll: false });
  }, [done, href, router]);

  return <Toast message={message} at={message ? 1 : undefined} />;
}
