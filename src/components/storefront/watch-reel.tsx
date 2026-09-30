"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/instagram/model";
import { siteImage } from "@/lib/site-images";
import { cn } from "@/lib/utils";

import { Eyebrow } from "./eyebrow";
import { InstagramGlyph } from "./instagram-glyph";

const REEL = siteImage("home/choice-of-professionals");
const POSTER = siteImage("home/choice-of-professionals-poster").src;

/** The reel plays once this much of it is on screen, and pauses once less than PAUSE_BELOW is. */
const PLAY_FROM = 0.5;
const PAUSE_BELOW = 0.25;

const CONTROL = "absolute bottom-3 size-10 rounded-full bg-surface-dark/80 text-on-dark hover:bg-surface-dark";

/**
 * "The choice of professionals": the brand reel from Instagram, a phone-shaped
 * video beside the words (below them on phones). It plays muted, and only
 * while it is on screen; the buttons pause it and turn the sound on. With
 * reduced motion set, it waits for the play button.
 */
export function WatchReel() {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  /** Once the player has pressed pause, scrolling back does not restart it. */
  const stopped = useRef(false);

  useEffect(() => {
    const element = video.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= PLAY_FROM && !stopped.current) element.play().catch(() => {});
        else if (entry.intersectionRatio < PAUSE_BELOW) element.pause();
      },
      { threshold: [PAUSE_BELOW, PLAY_FROM] }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function toggle() {
    const element = video.current;
    if (!element) return;
    if (element.paused) {
      stopped.current = false;
      element.play().catch(() => {});
    } else {
      stopped.current = true;
      element.pause();
    }
  }

  function toggleSound() {
    const element = video.current;
    if (!element) return;
    element.muted = !muted;
    setMuted(!muted);
    // Turning the sound on means "watch it": make sure it is playing.
    if (muted && element.paused) {
      stopped.current = false;
      element.play().catch(() => {});
    }
  }

  return (
    <section id="watch" aria-labelledby="watch-title" className="relative overflow-hidden bg-surface-dark text-on-dark">
      <div className="site-shell flex flex-col gap-6 py-8 md:gap-10 md:py-16 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:py-20">
        <div className="flex max-w-[600px] flex-col gap-4 md:gap-6">
          <Eyebrow bar className="text-on-dark-muted">
            Watch
          </Eyebrow>
          <h2
            id="watch-title"
            className="type-display text-[40px] leading-[0.95] tracking-[-0.02em] md:text-[72px] md:leading-[0.9]"
          >
            The choice of
            <br />
            professionals<span className="text-brand-yellow">.</span>
          </h2>
          <p className="max-w-[480px] text-[15px] leading-[22px] text-on-dark-subtle md:text-lg md:leading-7">
            From the nets to the workshop: the players who pick up an Astaad, and the hands that shape every bat.
          </p>
          <Button
            render={<a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" />}
            nativeButton={false}
            className="self-start"
          >
            <InstagramGlyph className="size-5" />
            Follow @{INSTAGRAM_HANDLE}
            <span className="sr-only"> (opens Instagram)</span>
          </Button>
        </div>

        <div className="relative mx-auto w-full max-w-[360px] lg:mx-0 lg:w-[360px] lg:shrink-0">
          <div
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 size-[520px] -translate-1/2 rounded-full bg-[radial-gradient(circle,rgba(254,197,2,0.18)_0%,rgba(254,197,2,0)_66%)]"
          />
          <div className="relative overflow-hidden rounded-xs bg-surface-dark-raised shadow-float" style={{ aspectRatio: `${REEL.width} / ${REEL.height}` }}>
            <video
              ref={video}
              src={REEL.src}
              poster={POSTER}
              muted
              loop
              playsInline
              preload="none"
              aria-label="Astaad Sports, the choice of professionals: players in the nets and in matches with their Astaad bats, and bats being shaped in the workshop"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              className="size-full object-cover"
            />
            <Button
              size="icon"
              variant="secondary"
              aria-label={playing ? "Pause the video" : "Play the video"}
              onClick={toggle}
              className={cn(CONTROL, "left-3")}
            >
              {playing ? (
                <Pause className="size-4" strokeWidth={2} aria-hidden="true" />
              ) : (
                <Play className="size-4" strokeWidth={2} aria-hidden="true" />
              )}
            </Button>
            <Button
              size="icon"
              variant="secondary"
              aria-label={muted ? "Turn the sound on" : "Turn the sound off"}
              aria-pressed={!muted}
              onClick={toggleSound}
              className={cn(CONTROL, "right-3")}
            >
              {muted ? (
                <VolumeX className="size-4" strokeWidth={2} aria-hidden="true" />
              ) : (
                <Volume2 className="size-4" strokeWidth={2} aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
