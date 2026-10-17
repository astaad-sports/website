"use client";

import { useRef } from "react";

import { gsap, useGSAP, withMotion } from "@/components/motion/gsap";
import { cn } from "@/lib/utils";

const SIZES = {
  // Phone cards and the bat builder.
  xs: "h-[22px] px-2 text-[11px] leading-[22px] tracking-[0.04em]",
  // Plates on the shop grids.
  sm: "h-6 px-2.5 text-xs leading-6 tracking-[0.04em]",
  // Product pages.
  md: "h-[26px] px-2.5 text-xs leading-[26px] tracking-[0.06em]",
};

/**
 * The yellow "20% OFF" chip. It pops in once: on a product page as the page
 * opens (`play="load"`), on a card the first time it scrolls into view.
 */
export function SaleChip({
  percent,
  size = "sm",
  play = "scroll",
  className,
}: {
  percent: number;
  size?: keyof typeof SIZES;
  play?: "scroll" | "load";
  className?: string;
}) {
  const chip = useRef<HTMLSpanElement>(null);

  useGSAP(() =>
    withMotion(() => {
      gsap.fromTo(
        chip.current,
        { scale: 0.55, rotate: -8, autoAlpha: 0 },
        {
          scale: 1,
          rotate: 0,
          autoAlpha: 1,
          duration: 0.5,
          ease: "back.out(2.2)",
          delay: play === "load" ? 0.2 : 0,
          scrollTrigger: play === "scroll" ? { trigger: chip.current, start: "top 95%", once: true } : undefined,
        }
      );
    })
  );

  return (
    <span
      ref={chip}
      className={cn("inline-block shrink-0 rounded-xs bg-brand-yellow font-bold text-on-yellow", SIZES[size], className)}
    >
      {percent}% OFF
    </span>
  );
}
