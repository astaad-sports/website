"use client";

import { IconButton } from "@/components/astaad";
import { useSaved } from "@/components/wishlist/use-wishlist";

/** The heart on a product plate: outline at rest, filled once saved to this browser's wishlist. */
export function WishlistButton({
  productId,
  name,
  onDark,
  className,
}: {
  productId: string;
  name: string;
  onDark?: boolean;
  className?: string;
}) {
  const { saved, toggle } = useSaved(productId);
  return (
    <IconButton
      icon="heart"
      label={saved ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      pressed={saved}
      filled={saved}
      onDark={onDark}
      onClick={toggle}
      className={className}
    />
  );
}
