import Image from "next/image";

import { cn } from "@/lib/utils";

/** Intrinsic size of public/brand/astaad-crest.png. */
const CREST_WIDTH = 802;
const CREST_HEIGHT = 649;

export interface CrestProps {
  /** Rendered height in px. Never below 40; the nav bar uses 48. */
  size?: number;
  priority?: boolean;
  className?: string;
}

/**
 * The Astaad crest: roaring lion on a black shield with gold flames and the
 * ASTAAD wordmark. Use it as supplied; never recolour, outline, rotate or
 * separate the lion from the shield. It carries its own black ground, so it
 * sits directly on both `surface` and `surface-dark`.
 */
export function Crest({ size = 48, priority, className }: CrestProps) {
  return (
    <Image
      src="/brand/astaad-crest.png"
      alt="Astaad Sports"
      width={Math.round((size * CREST_WIDTH) / CREST_HEIGHT)}
      height={size}
      priority={priority}
      className={cn("h-auto w-auto shrink-0", className)}
      style={{ height: size }}
    />
  );
}
