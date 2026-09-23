import Image, { type StaticImageData } from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The catalogue has exactly five categories, always named this way. */
export const CATEGORIES = [
  "Bats",
  "Batting Pads",
  "Batting Gloves",
  "Helmets",
  "Cricket Kitbags",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface CategoryChipProps {
  label: Category;
  /** A product cut-out for the disc. */
  image?: string | StaticImageData;
  href?: string;
  /** `sm` is the mobile "Shop by Category" grid; `responsive` is sm below md. */
  size?: "md" | "sm" | "responsive";
  onClick?: () => void;
  className?: string;
}

const DISC_SIZE = {
  md: "size-24",
  sm: "size-18",
  responsive: "size-18 md:size-24",
} as const;

const LABEL_SIZE = {
  md: "text-sm leading-5",
  sm: "text-xs leading-4",
  responsive: "text-xs leading-4 md:text-sm md:leading-5",
} as const;

/**
 * A circular `surface-circle` tile with a product cut-out and the category
 * name beneath. The five of them form the category strip under the hero.
 */
export function CategoryChip({
  label,
  image,
  href,
  size = "md",
  onClick,
  className,
}: CategoryChipProps) {
  return (
    <Button
      variant="ghost"
      render={href ? <Link href={href} /> : undefined}
      nativeButton={!href}
      onClick={onClick}
      className={cn(
        "h-auto min-h-0 flex-col gap-2 rounded-md p-1 font-normal text-foreground hover:bg-transparent",
        LABEL_SIZE[size],
        className
      )}
    >
      <span
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-circle border border-border bg-surface-circle",
          DISC_SIZE[size]
        )}
      >
        {image && (
          <Image
            src={image}
            alt=""
            fill
            sizes="96px"
            className="object-contain p-3"
          />
        )}
      </span>
      <span>{label}</span>
    </Button>
  );
}
