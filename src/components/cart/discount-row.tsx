"use client";

import { useRef } from "react";

import { CountUp } from "@/components/motion/count-up";
import { gsap, useGSAP, withMotion } from "@/components/motion/gsap";

/**
 * The order summary's Discount row, shown while something is taken off. When
 * a discount appears (a coupon applied), the row opens and its amount rolls
 * up; one already there when the page opens just shows.
 */
export function DiscountRow({ paise }: { paise: number }) {
  const row = useRef<HTMLDivElement>(null);
  const before = useRef(paise);

  useGSAP(
    () => {
      const was = before.current;
      before.current = paise;
      if (was > 0 || paise === 0) return;
      return withMotion(() => {
        gsap.fromTo(
          row.current,
          { height: 0, autoAlpha: 0, y: -6 },
          { height: "auto", autoAlpha: 1, y: 0, duration: 0.4, ease: "power3.out" }
        );
        gsap.fromTo(
          row.current?.querySelector("dd") ?? [],
          { backgroundColor: "rgba(254, 197, 2, 0.55)" },
          { backgroundColor: "rgba(254, 197, 2, 0)", duration: 1.2, delay: 0.35, ease: "power1.out" }
        );
      });
    },
    { dependencies: [paise] }
  );

  if (paise <= 0) return null;
  return (
    <div ref={row} className="flex justify-between gap-4 overflow-hidden">
      <dt className="text-ink-muted">Discount</dt>
      <dd className="rounded-xs font-semibold tabular-nums">
        &minus;
        <CountUp value={paise} unit="paise" />
      </dd>
    </div>
  );
}
