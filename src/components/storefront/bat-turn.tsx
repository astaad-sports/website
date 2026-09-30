"use client";

import Image from "next/image";
import { useRef, useState, type DragEvent, type KeyboardEvent, type PointerEvent } from "react";
import { RotateCw } from "lucide-react";

import { BAT_SIDE_LABELS } from "@/lib/catalogue";
import type { StoreBat } from "@/lib/products/model";
import { cn } from "@/lib/utils";

/** How far (px) the pointer travels sideways to turn the bat one step. */
const STEP = 90;
/** How far the finger travels before the drag counts as sideways. */
const SLOP = 6;

interface Start {
  id: number;
  x: number;
  y: number;
  index: number;
  sideways: boolean;
}

/**
 * The bat turned around from its straight cut-outs: face, right edge, back,
 * left edge and round again (see StoreBat.turn). Drag or swipe sideways to
 * turn it, press the Turn button, or use the arrow keys. `index` is the side
 * showing; `onChange` reports the next one, for the caption.
 */
export function BatTurn({ bat, index, onChange }: { bat: StoreBat; index: number; onChange: (index: number) => void }) {
  const views = bat.turn;
  const count = views.length;
  const start = useRef<Start | null>(null);
  const [dragging, setDragging] = useState(false);
  const turnTo = (next: number) => onChange(((next % count) + count) % count);

  function reset() {
    start.current = null;
    setDragging(false);
  }

  const handlers = {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (event.button !== 0) return;
      // A second finger is a pinch, not a turn.
      if (start.current) return reset();
      event.currentTarget.setPointerCapture(event.pointerId);
      start.current = { id: event.pointerId, x: event.clientX, y: event.clientY, index, sideways: false };
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const from = start.current;
      if (!from || event.pointerId !== from.id) return;
      const dx = event.clientX - from.x;
      if (!from.sideways) {
        // Mostly up or down: on a touch screen the page is scrolling, so let it.
        if (Math.abs(event.clientY - from.y) > Math.abs(dx)) {
          if (Math.abs(event.clientY - from.y) > SLOP) reset();
          return;
        }
        if (Math.abs(dx) < SLOP) return;
        from.sideways = true;
        setDragging(true);
      }
      // Pulling the face to the left brings the right edge round.
      turnTo(from.index + Math.trunc(-dx / STEP));
    },
    onPointerUp: reset,
    onPointerCancel: reset,
    // A mouse drag would otherwise pick up the photo itself.
    onDragStart(event: DragEvent<HTMLElement>) {
      event.preventDefault();
    },
    onKeyDown(event: KeyboardEvent<HTMLElement>) {
      if (event.key === "ArrowRight") turnTo(index + 1);
      else if (event.key === "ArrowLeft") turnTo(index - 1);
      else return;
      event.preventDefault();
    },
  };

  return (
    <div className="absolute inset-0">
      <div
        role="img"
        aria-label={`Astaad ${bat.name}, ${BAT_SIDE_LABELS[views[index].side].toLowerCase()}. Drag or use the arrow keys to turn it.`}
        tabIndex={0}
        className={cn(
          "absolute inset-x-16 top-10 bottom-16 cursor-grab touch-pan-y touch-pinch-zoom outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-yellow md:inset-x-28 md:bottom-24",
          dragging && "cursor-grabbing"
        )}
        {...handlers}
      >
        {/* Every side is in the page from the start, so a turn never waits for a photo. */}
        {views.map((view, position) => (
          <Image
            key={view.side}
            src={view.url}
            alt=""
            fill
            loading="eager"
            sizes="(min-width: 1024px) 40vw, 80vw"
            className={cn(
              "object-contain drop-shadow-[0_48px_56px_rgba(0,0,0,0.8)]",
              position !== index && "invisible"
            )}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => turnTo(index + 1)}
        aria-label="Turn the bat"
        className="absolute top-1/2 right-4 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-border-dark bg-surface-dark-raised/80 text-on-dark transition-colors hover:bg-surface-dark-raised md:right-10"
      >
        <RotateCw className="size-5" strokeWidth={1.5} aria-hidden="true" />
      </button>
    </div>
  );
}
