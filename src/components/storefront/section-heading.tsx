import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Eyebrow } from "./eyebrow";

export interface SectionHeadingProps {
  id: string;
  eyebrow: ReactNode;
  eyebrowBar?: boolean;
  title: ReactNode;
  /** Right-hand text or link. */
  aside?: ReactNode;
  tone?: "light" | "dark";
  /** `sans` = 40px Inter; `display` = 56px Montserrat italic caps. */
  face?: "sans" | "display";
  /** Display size override, e.g. "md:text-[48px]". */
  titleClassName?: string;
  /** Below md: the phone sizes of the home page (24px sans, 32px display) and a tighter gap to the aside. */
  compact?: boolean;
  className?: string;
}

export function SectionHeading({
  id,
  eyebrow,
  eyebrowBar,
  title,
  aside,
  tone = "light",
  face = "sans",
  titleClassName,
  compact,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-end md:justify-between md:gap-6",
        compact ? "gap-3" : "gap-6",
        className
      )}
    >
      <div className="flex flex-col gap-2 md:gap-3">
        <Eyebrow bar={eyebrowBar} className={tone === "dark" ? "text-on-dark-muted" : undefined}>
          {eyebrow}
        </Eyebrow>
        <h2
          id={id}
          className={cn(
            face === "display"
              ? "type-display text-[40px] leading-[0.95] tracking-[-0.02em] md:text-[56px]"
              : "text-[32px] leading-9 font-bold tracking-[-0.03em] md:text-[40px] md:leading-[44px]",
            compact &&
              (face === "display"
                ? "max-md:text-[32px] max-md:leading-none max-md:tracking-[-0.01em]"
                : "max-md:text-2xl max-md:leading-[30px] max-md:tracking-[-0.02em]"),
            titleClassName
          )}
        >
          {title}
        </h2>
      </div>
      {aside}
    </div>
  );
}
