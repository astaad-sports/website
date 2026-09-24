"use client";

import Image, { type StaticImageData } from "next/image";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { Icon } from "./icon";
import { IconButton } from "./icon-button";

export interface CartLineItemProps {
  name: string;
  /** "Size: SH (Full Size)" */
  meta?: string;
  /** A formatted price — "₹ 28,999". */
  price: string;
  /** Controlled quantity; leave undefined for internal state. Never below 1. */
  qty?: number;
  defaultQty?: number;
  image?: string | StaticImageData;
  imageAlt?: string;
  onQty?: (qty: number) => void;
  onRemove?: () => void;
  /** A problem with this line, e.g. "Out of stock. Remove it to check out." Shown in `danger` under the price. */
  notice?: string;
  /** Highest quantity the + button allows. */
  maxQty?: number;
  className?: string;
}

/**
 * One product in the cart: image, name, a `meta` line in `ink-muted`, price,
 * a − / + quantity stepper and a `danger` trash IconButton. Quantity never
 * goes below 1 — removal is the trash button.
 */
export function CartLineItem({
  name,
  meta,
  price,
  qty,
  defaultQty = 1,
  image,
  imageAlt = "",
  onQty,
  onRemove,
  notice,
  maxQty,
  className,
}: CartLineItemProps) {
  const [internalQty, setInternalQty] = useState(defaultQty);
  const current = qty ?? internalQty;

  function setQty(next: number) {
    const clamped = Math.max(1, next);
    if (qty === undefined) setInternalQty(clamped);
    onQty?.(clamped);
  }

  return (
    <Card
      size="sm"
      className={cn(
        "grid w-full max-w-[420px] grid-cols-[88px_1fr] gap-4 p-3",
        className
      )}
    >
      <div className="relative flex h-[100px] items-center justify-center overflow-hidden rounded-sm bg-surface-sunken">
        {image && (
          <Image
            src={image}
            alt={imageAlt}
            fill
            sizes="88px"
            className="object-contain p-1"
          />
        )}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-[15px] leading-[22px] font-semibold text-foreground">
          {name}
        </p>
        {meta && <span className="type-body-sm text-ink-muted">{meta}</span>}
        <span className="type-price">{price}</span>
        {notice && <span className="type-body-sm font-semibold text-danger">{notice}</span>}
        <div className="mt-auto flex items-center justify-between">
          <div
            role="group"
            aria-label="Quantity"
            className="inline-flex items-center rounded-sm border border-border"
          >
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Decrease quantity"
              className="rounded-sm"
              disabled={current <= 1}
              onClick={() => setQty(current - 1)}
            >
              <Icon name="minus" />
            </Button>
            <span className="min-w-7 text-center text-sm leading-5 font-semibold tabular-nums">
              {current}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Increase quantity"
              className="rounded-sm"
              disabled={maxQty !== undefined && current >= maxQty}
              onClick={() => setQty(current + 1)}
            >
              <Icon name="plus" />
            </Button>
          </div>
          <IconButton
            icon="trash"
            label={`Remove ${name}`}
            className="text-danger"
            onClick={onRemove}
          />
        </div>
      </div>
    </Card>
  );
}
