"use client";

import { useCountdown } from "@/components/motion/use-countdown";
import { COUNTDOWN_CLOSE_MS, countdownText } from "@/lib/offers/model";
import { cn } from "@/lib/utils";

/**
 * The words of an OfferNote: "Diwali Sale · ends 25 Oct", and over its last
 * two days "Diwali Sale · ends in 14:06:32", ticking. `compact` (a small
 * card) drops the name then, so the time fits: "Ends in 14:06:32".
 */
export function OfferNoteText({
  name,
  endsAt,
  label,
  compact = false,
  className,
}: {
  name: string;
  endsAt: string;
  label: string;
  compact?: boolean;
  className?: string;
}) {
  const left = useCountdown(endsAt);
  const close = left.total > 0 && left.total < COUNTDOWN_CLOSE_MS;
  const ticking = compact ? `Ends in ${countdownText(left)}` : `${name} · ends in ${countdownText(left)}`;
  return (
    <span className={cn(close && "tabular-nums", className)} suppressHydrationWarning>
      {close ? ticking : label}
    </span>
  );
}
