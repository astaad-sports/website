"use client";

import { useRef, type ReactNode } from "react";

import { gsap, useGSAP, withMotion } from "@/components/motion/gsap";
import { cn } from "@/lib/utils";

/**
 * A price that no longer applies, struck through. The line draws across, left
 * to right, the first time the price is on screen (`play="load"` as the page
 * opens). Without motion, or before the script runs, the line is simply there.
 */
export function StruckPrice({
  children,
  play = "scroll",
  className,
}: {
  children: ReactNode;
  play?: "scroll" | "load";
  className?: string;
}) {
  const line = useRef<HTMLSpanElement>(null);

  useGSAP(() =>
    withMotion(() => {
      gsap.fromTo(
        line.current,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 0.45,
          ease: "power2.out",
          delay: play === "load" ? 0.35 : 0.15,
          scrollTrigger: play === "scroll" ? { trigger: line.current, start: "top 95%", once: true } : undefined,
        }
      );
    })
  );

  return (
    <s className={cn("relative inline-block whitespace-nowrap text-ink-subtle no-underline", className)}>
      {children}
      <span
        ref={line}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[55%] h-[max(1px,0.07em)] origin-left bg-current"
      />
    </s>
  );
}
