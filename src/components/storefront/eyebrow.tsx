import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Tracked uppercase eyebrow; `bar` adds the 32px yellow rule before it. */
export function Eyebrow({
  bar,
  className,
  children,
}: {
  bar?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <p className={cn("type-eyebrow flex items-center gap-3 text-ink-muted", className)}>
      {bar && <span aria-hidden="true" className="block h-0.5 w-8 shrink-0 bg-brand-yellow" />}
      {children}
    </p>
  );
}
