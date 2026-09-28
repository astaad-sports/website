"use client";

import { useRef, useState, type PointerEvent } from "react";

/** A swipe this share of the stage's width moves on, however slow. */
const FAR = 0.2;
/** A shorter flick moves on when it is at least this long (px) and this fast (px/ms). */
const FLICK_MIN = 24;
const FLICK_SPEED = 0.4;
/** How far the finger travels before the swipe counts as sideways. */
const SLOP = 6;

interface Start {
  id: number;
  x: number;
  y: number;
  time: number;
  width: number;
  sideways: boolean;
}

/**
 * Swipe left or right on a touch screen to step through a product's views.
 * The view follows the finger, with resistance past the first and last, and
 * moves on when the swipe goes far or fast enough. Spread `handlers` on the
 * swiped element and give it `touch-pan-y touch-pinch-zoom`, so up and down
 * still scrolls the page and two fingers still zoom. A mouse is left to the
 * thumbnails.
 */
export function useSwipe({
  count,
  active,
  onChange,
}: {
  count: number;
  active: number;
  onChange: (index: number) => void;
}) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<Start | null>(null);

  function reset() {
    start.current = null;
    setDragging(false);
    setOffset(0);
  }

  function end(event: PointerEvent<HTMLElement>) {
    const from = start.current;
    if (!from || event.pointerId !== from.id) return;
    reset();
    if (!from.sideways) return;
    const dx = event.clientX - from.x;
    const speed = Math.abs(dx) / Math.max(1, event.timeStamp - from.time);
    const far = Math.abs(dx) >= from.width * FAR || (Math.abs(dx) >= FLICK_MIN && speed >= FLICK_SPEED);
    const next = active + (dx < 0 ? 1 : -1);
    if (far && next >= 0 && next < count) onChange(next);
  }

  const handlers = {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (event.pointerType === "mouse" || count < 2) return;
      // A second finger is a pinch, not a swipe.
      if (start.current) return reset();
      start.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        time: event.timeStamp,
        width: event.currentTarget.offsetWidth,
        sideways: false,
      };
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const from = start.current;
      if (!from || event.pointerId !== from.id) return;
      const dx = event.clientX - from.x;
      if (!from.sideways) {
        // Mostly up or down: the page is scrolling, so let it.
        if (Math.abs(event.clientY - from.y) > Math.abs(dx)) {
          if (Math.abs(event.clientY - from.y) > SLOP) reset();
          return;
        }
        if (Math.abs(dx) < SLOP) return;
        from.sideways = true;
        setDragging(true);
      }
      const beyond = (active === 0 && dx > 0) || (active === count - 1 && dx < 0);
      setOffset(beyond ? dx / 3 : dx);
    },
    onPointerUp: end,
    onPointerCancel: reset,
  };

  return { offset, dragging, handlers };
}
