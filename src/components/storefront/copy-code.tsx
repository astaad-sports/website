"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";

import { gsap, useGSAP, withMotion } from "@/components/motion/gsap";

const TONES = {
  // On the yellow offer bar.
  yellow: "border-on-yellow/40 bg-on-yellow/5 text-on-yellow hover:bg-on-yellow/10",
  // On the black stage.
  dark: "border-brand-yellow/60 bg-brand-yellow/10 text-brand-yellow hover:bg-brand-yellow/20",
  // On white.
  light: "border-border-strong bg-surface-raised text-foreground hover:bg-surface-sunken",
};

/**
 * A coupon code as a dashed ticket: tap to copy it for the cart. Says
 * "Copied" for two seconds, aloud too.
 */
export function CopyCode({
  code,
  tone = "light",
  size = "sm",
  className,
}: {
  code: string;
  tone?: keyof typeof TONES;
  size?: "sm" | "lg";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const icon = useRef<HTMLSpanElement>(null);
  const reset = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(reset.current), []);

  useGSAP(
    () => {
      if (!copied) return;
      return withMotion(() => {
        gsap.fromTo(icon.current, { scale: 0.4, rotate: -30 }, { scale: 1, rotate: 0, duration: 0.4, ease: "back.out(2.4)" });
      });
    },
    { dependencies: [copied], revertOnUpdate: true }
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      return; // No clipboard (an old browser, a denied permission): the code is still there to read.
    }
    setCopied(true);
    window.clearTimeout(reset.current);
    reset.current = window.setTimeout(() => setCopied(false), 2000);
  }

  const Icon = copied ? Check : Copy;
  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center rounded-xs border border-dashed font-bold tracking-[0.08em] uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current",
        size === "lg" ? "h-12 gap-2.5 px-4 text-base" : "h-7 gap-1.5 px-2 text-xs",
        TONES[tone],
        className
      )}
    >
      <span>{code}</span>
      <span ref={icon} className="inline-flex" aria-hidden="true">
        <Icon className={size === "lg" ? "size-4.5" : "size-3.5"} strokeWidth={2} />
      </span>
      <span className="sr-only">{copied ? "Copied" : "Copy code"}</span>
      <span aria-live="polite" className="sr-only">
        {copied ? `${code} copied` : ""}
      </span>
    </button>
  );
}
