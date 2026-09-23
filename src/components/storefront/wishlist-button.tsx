"use client";

import { useState } from "react";

import { IconButton } from "@/components/astaad";

/** The heart on a product plate: outline at rest, filled once saved. */
export function WishlistButton({
  name,
  onDark,
  className,
}: {
  name: string;
  onDark?: boolean;
  className?: string;
}) {
  const [saved, setSaved] = useState(false);
  return (
    <IconButton
      icon="heart"
      label={saved ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      pressed={saved}
      filled={saved}
      onDark={onDark}
      onClick={() => setSaved((value) => !value)}
      className={className}
    />
  );
}
