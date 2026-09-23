"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { Icon } from "./icon";
import { IconButton } from "./icon-button";
import { PriceRating } from "./price-rating";

export interface ProductCardProps {
  /** The line — "Astaad Pro". */
  line: string;
  /** The model — "English Willow Cricket Bat". */
  name: string;
  /** A formatted price — "₹ 28,999". */
  price: string;
  /** A product cut-out on white or transparent. */
  image?: string | StaticImageData;
  imageAlt?: string;
  /** Merchandising flag — "Bestseller", "New". */
  badge?: string;
  rating?: number;
  reviewCount?: number;
  /** Link the name to the product page. */
  href?: string;
  /** Controlled wishlist state; leave undefined for an internal toggle. */
  saved?: boolean;
  onSave?: (saved: boolean) => void;
  onAdd?: () => void;
  className?: string;
}

/**
 * The grid tile: product cut-out on `surface-sunken`, optional Badge top-left,
 * wishlist heart top-right, name on two lines (line, then model), PriceRating,
 * and a full-width small primary "Add to Cart". Let the grid column set the
 * width (five across at 1440px with `gap-5`, two across on mobile with `gap-3`).
 */
export function ProductCard({
  line,
  name,
  price,
  image,
  imageAlt = "",
  badge,
  rating,
  reviewCount,
  href,
  saved,
  onSave,
  onAdd,
  className,
}: ProductCardProps) {
  const [internalSaved, setInternalSaved] = useState(false);
  const isSaved = saved ?? internalSaved;

  function toggleSave() {
    const next = !isSaved;
    if (saved === undefined) setInternalSaved(next);
    onSave?.(next);
  }

  return (
    <Card
      size="sm"
      className={cn(
        "relative w-full gap-2 p-3 transition-shadow hover:shadow-float",
        className
      )}
    >
      <div className="relative flex h-[140px] items-center justify-center overflow-hidden rounded-sm bg-surface-sunken">
        {image && (
          <Image
            src={image}
            alt={imageAlt}
            fill
            sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
            className="object-contain p-2"
          />
        )}
      </div>
      {badge && <Badge className="absolute top-3 left-3">{badge}</Badge>}
      <IconButton
        icon="heart"
        label={isSaved ? "Remove from wishlist" : "Save to wishlist"}
        pressed={isSaved}
        filled={isSaved}
        onClick={toggleSave}
        className="absolute top-2 right-2"
      />
      <p className="type-body-sm text-foreground">
        {href ? <Link href={href}>{line}</Link> : line}
        <span className="block">{name}</span>
      </p>
      <PriceRating price={price} rating={rating} count={reviewCount} />
      <Button size="sm" className="w-full" onClick={onAdd}>
        <Icon name="cart" className="size-4" />
        Add to Cart
      </Button>
    </Card>
  );
}
