"use client";

import { useEffect } from "react";
import { CircleAlert, RotateCw } from "lucide-react";

import { BUTTON_PRIMARY, PAGE } from "@/components/admin/styles";

/**
 * An admin page or action failed unexpectedly (a dropped connection, the
 * database unreachable). The admin frame stays, with the brief's error line
 * and a way to try again.
 */
export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className={PAGE}>
      <div role="alert" className="flex flex-col items-start gap-4">
        <span className="flex items-center gap-2 text-[15px] leading-[22px] font-semibold">
          <CircleAlert className="size-5 text-danger" strokeWidth={1.5} aria-hidden="true" />
          Something went wrong. Try again.
        </span>
        <button type="button" onClick={() => retry()} className={BUTTON_PRIMARY}>
          <RotateCw aria-hidden="true" />
          Try again
        </button>
      </div>
    </main>
  );
}
