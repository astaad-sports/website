"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

import type { StoreVideo } from "@/lib/products/model";
import { cn } from "@/lib/utils";

/** The video plays once this much of it is on screen, and pauses once less than PAUSE_BELOW is. */
const PLAY_FROM = 0.5;
const PAUSE_BELOW = 0.25;

const CONTROL =
  "flex size-10 cursor-pointer items-center justify-center rounded-full bg-surface-dark/80 text-on-dark transition-colors hover:bg-surface-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow";

/** Keep a press on a button from starting a swipe, which would capture the pointer and swallow the click. */
const keepFromSwipe = (event: PointerEvent) => event.stopPropagation();

/**
 * A product video on the gallery stage. While its slide shows and it is on
 * screen it plays, muted and inline, on a loop; it pauses when the shopper
 * moves on or scrolls away. With reduced motion set it waits for the play
 * button. The buttons pause it and turn the sound on. `near` says its slide
 * is showing or next to it, so it fetches the start of the file ahead of time.
 */
export function GalleryVideo({
  video,
  active,
  near,
  label,
  className,
}: {
  video: StoreVideo;
  active: boolean;
  near: boolean;
  /** Read out for the video, e.g. "Run Machine, video 1 of 2". */
  label: string;
  /** Where the video sits on the stage. */
  className?: string;
}) {
  const element = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [onScreen, setOnScreen] = useState(false);
  /** The shopper pressed pause: it stays paused until they press play, or leave the slide. */
  const stopped = useRef(false);

  useEffect(() => {
    const target = element.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= PLAY_FROM) setOnScreen(true);
        else if (entry.intersectionRatio < PAUSE_BELOW) setOnScreen(false);
      },
      { threshold: [PAUSE_BELOW, PLAY_FROM] }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const target = element.current;
    if (!target) return;
    if (!active) {
      stopped.current = false;
      target.pause();
      return;
    }
    if (!onScreen) {
      target.pause();
      return;
    }
    if (stopped.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    target.play().catch(() => {});
  }, [active, onScreen]);

  function toggle() {
    const target = element.current;
    if (!target) return;
    if (target.paused) {
      stopped.current = false;
      target.play().catch(() => {});
    } else {
      stopped.current = true;
      target.pause();
    }
  }

  function toggleSound() {
    const target = element.current;
    if (!target) return;
    target.muted = !muted;
    setMuted(!muted);
    // Turning the sound on means "watch it": make sure it is playing.
    if (muted && target.paused) {
      stopped.current = false;
      target.play().catch(() => {});
    }
  }

  return (
    <div className={cn("absolute", className)}>
      <video
        ref={element}
        // Without a still, Safari shows nothing until it plays; a moment in, it shows that frame.
        src={video.poster ? video.url : `${video.url}#t=0.1`}
        poster={video.poster ?? undefined}
        muted
        loop
        playsInline
        preload={active || near ? "metadata" : "none"}
        aria-label={label}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="size-full object-contain"
      />
      {!playing && (
        <button
          type="button"
          aria-label="Play the video"
          onPointerDown={keepFromSwipe}
          onClick={toggle}
          className={cn(CONTROL, "absolute top-1/2 left-1/2 size-16 -translate-1/2")}
        >
          <Play className="size-6 translate-x-0.5 fill-current" strokeWidth={2} aria-hidden="true" />
        </button>
      )}
      <div className="absolute top-0 right-0 flex gap-2">
        {playing && (
          <button
            type="button"
            aria-label="Pause the video"
            onPointerDown={keepFromSwipe}
            onClick={toggle}
            className={CONTROL}
          >
            <Pause className="size-4" strokeWidth={2} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          aria-label={muted ? "Turn the sound on" : "Turn the sound off"}
          aria-pressed={!muted}
          onPointerDown={keepFromSwipe}
          onClick={toggleSound}
          className={CONTROL}
        >
          {muted ? (
            <VolumeX className="size-4" strokeWidth={2} aria-hidden="true" />
          ) : (
            <Volume2 className="size-4" strokeWidth={2} aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
