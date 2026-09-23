"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** Copies `value`, e.g. an AWB to paste into Trackon's tracking form. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the value is still on screen to select by hand.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 type-body-sm font-semibold text-foreground underline underline-offset-4"
    >
      {copied ? (
        <Check className="size-4" strokeWidth={2} aria-hidden="true" />
      ) : (
        <Copy className="size-4" strokeWidth={1.5} aria-hidden="true" />
      )}
      {copied ? "Copied" : label}
      <span role="status" className="sr-only">
        {copied ? `${value} copied` : ""}
      </span>
    </button>
  );
}
