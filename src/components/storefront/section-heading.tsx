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
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("flex flex-col gap-6 md:flex-row md:items-end md:justify-between", className)}>
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
