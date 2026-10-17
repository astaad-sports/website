import Image from "next/image";
import type { ReactNode } from "react";
import { Play } from "lucide-react";

import type { StoreVideo } from "@/lib/products/model";
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

/**
 * Thumbnails for a product's photos, primary first, then its videos (with a
 * play mark), after any extra thumbs in `children` (the turn-around). Videos
 * count on from the photos: with three photos, `active` 3 is the first
 * video. `active` is null while an extra thumb is showing. Shown only when
 * there is something to choose between. `alt` describes each photo for image
 * search; a screen reader hears the button's own label instead.
 */
export function PhotoThumbnails({
  images,
  videos = [],
  alt,
  active,
  onSelect,
  children,
}: {
  images: string[];
  videos?: StoreVideo[];
  alt: (index: number) => string;
  active: number | null;
  onSelect: (index: number) => void;
  children?: ReactNode;
}) {
  if (images.length + videos.length < 2 && !children) return null;
  return (
    <StageRail label="Product photos and videos">
      {children}
      {images.map((src, index) => (
        <StageThumb
          key={src}
          selected={index === active}
          onSelect={() => onSelect(index)}
          label={`Photo ${index + 1} of ${images.length}`}
        >
          <span className="relative block size-full">
            <Image src={src} alt={alt(index)} fill sizes="64px" className="object-contain" />
          </span>
        </StageThumb>
      ))}
      {videos.map((video, index) => (
        <StageThumb
          key={video.url}
          selected={images.length + index === active}
          onSelect={() => onSelect(images.length + index)}
          label={`Video ${index + 1} of ${videos.length}`}
        >
          <span className="relative flex size-full items-center justify-center">
            {video.poster && <Image src={video.poster} alt="" fill sizes="64px" className="object-cover" />}
            <span className="relative flex size-6 items-center justify-center rounded-full bg-surface-dark/80 text-on-dark">
              <Play className="size-3 translate-x-px fill-current" strokeWidth={2} aria-hidden="true" />
            </span>
          </span>
        </StageThumb>
      ))}
    </StageRail>
  );
}
