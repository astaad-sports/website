"use client";

import { useCountdown } from "@/components/motion/use-countdown";
import { COUNTDOWN_CLOSE_MS, countdownText } from "@/lib/offers/model";
import { cn } from "@/lib/utils";

/**
 * The words of an OfferNote: "Diwali Sale · ends 25 Oct", and over its last
 * two days "Diwali Sale · ends in 14:06:32", ticking.
 */
export function OfferNoteText({ name, endsAt, label, className }: { name: string; endsAt: string; label: string; className?: string }) {
  const left = useCountdown(endsAt);
  const close = left.total > 0 && left.total < COUNTDOWN_CLOSE_MS;
  return (
    <span className={cn(close && "tabular-nums", className)} suppressHydrationWarning>
      {close ? `${name} · ends in ${countdownText(left)}` : label}
    </span>
  );
}
