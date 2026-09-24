import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The column of thumbnails in the top-left corner of a dark product stage. It
 * scrolls when there are more photos than fit; the padding (offset by the
 * negative margin) keeps the focus ring from being clipped by the scroll box.
 */
export function StageRail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav
      aria-label={label}
      className="no-scrollbar absolute top-6 bottom-14 left-4 -m-1 flex flex-col gap-2 overflow-y-auto p-1 md:top-[120px] md:bottom-24 md:left-10 md:gap-2.5"
    >
      {children}
    </nav>
  );
}

/** One thumbnail on the stage; the one showing has a yellow frame. */
export function StageThumb({
  selected,
  onSelect,
  label,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  /** Read out instead of the contents, for photo thumbnails. */
  label?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onSelect}
      className={cn(
        "flex h-14 w-12 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xs border py-1.5 text-[10px] leading-3 font-semibold tracking-[0.12em] uppercase transition-colors md:h-[76px] md:w-16",
        selected
          ? "border-brand-yellow bg-surface-dark-raised text-on-dark"
          : "border-border-dark bg-surface-dark-sunken text-on-dark-subtle hover:text-on-dark"
      )}
    >
      {children}
    </button>
  );
}

/** Thumbnails for a product's photos, primary first. Shown only when there is more than one. */
export function PhotoThumbnails({
  images,
  active,
  onSelect,
}: {
  images: string[];
  active: number;
  onSelect: (index: number) => void;
}) {
  if (images.length < 2) return null;
  return (
    <StageRail label="Product photos">
      {images.map((src, index) => (
        <StageThumb
          key={src}
          selected={index === active}
          onSelect={() => onSelect(index)}
          label={`Photo ${index + 1} of ${images.length}`}
        >
          <span className="relative block size-full">
            <Image src={src} alt="" fill sizes="64px" className="object-contain" />
          </span>
        </StageThumb>
      ))}
    </StageRail>
  );
}
