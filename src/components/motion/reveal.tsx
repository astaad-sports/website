"use client";

import { useRef, type ReactNode } from "react";

import { gsap, ScrollTrigger, useGSAP, withMotion } from "./gsap";

/**
 * Children marked `data-reveal` rise and fade in, a few at a time, the first
 * time they scroll into view. Used below the fold, where nothing is on
 * screen yet when the page loads.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () =>
      withMotion(() => {
        const items = root.current?.querySelectorAll<HTMLElement>("[data-reveal]");
        if (!items?.length) return;
        gsap.set(items, { autoAlpha: 0, y: 18 });
        ScrollTrigger.batch(items, {
          start: "top 92%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out", stagger: 0.07, overwrite: true }),
        });
      }),
    { scope: root }
  );

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
