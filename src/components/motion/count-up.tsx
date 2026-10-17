"use client";

import { useRef, useState } from "react";

import { formatPaise, formatPrice } from "@/lib/format";

import { gsap, useGSAP, withMotion } from "./gsap";

/**
 * A rupee amount that rolls to its new value when it changes: a size with
 * another price, a coupon taking money off. The first render shows the
 * amount as it is, so nothing moves on page load. `unit` says whether
 * `value` is in rupees (prices) or paise (the cart's totals).
 */
export function CountUp({
  value,
  unit = "rupees",
  className,
}: {
  value: number;
  unit?: "rupees" | "paise";
  className?: string;
}) {
  const format = unit === "paise" ? formatPaise : formatPrice;
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useGSAP(
    () => {
      const start = from.current;
      from.current = value;
      if (start === value) return;
      setShown(value);
      return withMotion(() => {
        const proxy = { amount: start };
        setShown(start);
        gsap.to(proxy, {
          amount: value,
          duration: 0.6,
          ease: "power3.out",
          onUpdate: () => setShown(Math.round(proxy.amount)),
        });
      });
    },
    { dependencies: [value] }
  );

  return <span className={className}>{format(shown)}</span>;
}
