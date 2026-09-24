"use client";

import { useEffect, useState } from "react";
import { CircleCheck } from "lucide-react";

import { cn } from "@/lib/utils";

function ToastMessage({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2600);
    return () => clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-4 bottom-24 z-50 flex items-center gap-2.5 rounded-sm bg-surface-dark px-4 py-3 text-sm leading-5 font-semibold text-on-dark shadow-float",
        "lg:inset-x-auto lg:top-6 lg:right-10 lg:bottom-auto lg:min-w-72"
      )}
    >
      <CircleCheck className="size-5 shrink-0 text-[#4ad07a]" strokeWidth={2} aria-hidden="true" />
      {message}
    </div>
  );
}

/**
 * A short success message ("Tracking updated") that fades after a moment.
 * `at` changes with every result, so the same message shows again.
 * The live region stays mounted so screen readers announce each message.
 */
export function Toast({ message, at }: { message?: string; at?: number }) {
  return (
    <div role="status" aria-live="polite">
      {message && at ? <ToastMessage key={at} message={message} /> : null}
    </div>
  );
}
