"use client";

import { useRef } from "react";

import { gsap, useGSAP, withMotion } from "@/components/motion/gsap";
import { useCountdown } from "@/components/motion/use-countdown";
import { countdownText } from "@/lib/offers/model";
import { cn } from "@/lib/utils";

/**
 * "Ends in 2d 14h 06m", then "Ends in 14:06:32" over the last two days.
 * Rendered at the server's time and corrected in the browser.
 */
export function OfferCountdown({
  endsAt,
  prefix = "Ends in ",
  className,
}: {
  endsAt: string;
  prefix?: string;
  className?: string;
}) {
  const parts = useCountdown(endsAt);
  return (
    <span role="timer" className={cn("tabular-nums", className)} suppressHydrationWarning>
      {prefix}
      {countdownText(parts)}
    </span>
  );
}

/** One digit of the big countdown: drops in from above when it changes. */
function FlipDigit({ value }: { value: string }) {
  const cell = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);

  useGSAP(
    () => {
      if (previous.current === value) return;
      previous.current = value;
      return withMotion(() => {
        gsap.fromTo(cell.current, { yPercent: -55, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.35, ease: "power3.out" });
      });
    },
    { dependencies: [value], revertOnUpdate: true }
  );

  return (
    <span className="relative inline-flex h-[1.25em] w-[0.72em] items-center justify-center overflow-hidden rounded-xs bg-surface-dark-raised">
      <span ref={cell} className="inline-block" suppressHydrationWarning>
        {value}
      </span>
    </span>
  );
}

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * The sale page's countdown: days, hours, minutes and seconds in tiles, each
 * digit dropping in as it changes. Days go once fewer than one is left.
 */
export function FlipCountdown({ endsAt, className }: { endsAt: string; className?: string }) {
  const parts = useCountdown(endsAt);
  const units = [
    ...(parts.days > 0 ? [{ label: parts.days === 1 ? "Day" : "Days", value: pad(parts.days) }] : []),
    { label: "Hrs", value: pad(parts.hours) },
    { label: "Min", value: pad(parts.minutes) },
    { label: "Sec", value: pad(parts.seconds) },
  ];
  return (
    <div
      role="timer"
      aria-label={`Ends in ${countdownText(parts)}`}
      className={cn("flex items-start gap-2 md:gap-3", className)}
      suppressHydrationWarning
    >
      {units.map((unit, index) => (
        <div key={unit.label} className="flex items-start gap-2 md:gap-3">
          {index > 0 && (
            <span aria-hidden="true" className="text-[32px] leading-[1.25em] font-bold text-on-dark-subtle md:text-[48px]">
              :
            </span>
          )}
          <div className="flex flex-col items-center gap-2">
            <span
              aria-hidden="true"
              className="flex gap-1 text-[32px] leading-none font-bold tracking-[-0.02em] tabular-nums md:text-[48px]"
            >
              {unit.value.split("").map((digit, place) => (
                <FlipDigit key={place} value={digit} />
              ))}
            </span>
            <span className="type-eyebrow text-[11px] text-on-dark-muted">{unit.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
