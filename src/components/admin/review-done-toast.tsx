"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Toast } from "./toast";

export type ReviewDone = "added" | "deleted";

const MESSAGE: Record<ReviewDone, string> = { added: "Review added", deleted: "Review deleted" };

/**
 * "Review added" or "Review deleted" once, after the review editor sends the
 * admin back to the list with ?done=. The URL then loses ?done=, so a reload
 * or Back doesn't say it again.
 */
export function ReviewDoneToast({ done, href }: { done: ReviewDone | null; href: string }) {
  const router = useRouter();
  // Kept when ?done= goes; `at` 1 because it only ever shows once.
  const [message] = useState(() => (done ? MESSAGE[done] : undefined));

  useEffect(() => {
    if (done) router.replace(href, { scroll: false });
  }, [done, href, router]);

  return <Toast message={message} at={message ? 1 : undefined} />;
}
