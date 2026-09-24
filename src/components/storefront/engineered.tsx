import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { siteImage } from "@/lib/site-images";
import { cn } from "@/lib/utils";

import { Eyebrow } from "./eyebrow";

const BAT = siteImage("bats/scoop-master-front");

interface Callout {
  label: string;
  value: string;
  side: "left" | "right";
  top: number;
  width: number;
  line: { left: number; top: number; width: number };
  dot: { left: number; top: number };
}

// The bat stands in a 200 × 508 box at (260, 26): the blade's edges are at
// x 325 and 395 from its shoulder (y 210) to the toe (y 534); the handle's are
// at 350 and 370. Each line runs from its box to the bat, with the dot on the edge.
const CALLOUTS: Callout[] = [
  { label: "Handle", value: "Round · Semi Oval · Oval", side: "left", top: 74, width: 176, line: { left: 174, top: 96, width: 176 }, dot: { left: 346, top: 92 } },
  { label: "Weight", value: "1120 – 1220 g", side: "left", top: 240, width: 178, line: { left: 176, top: 262, width: 149 }, dot: { left: 321, top: 258 } },
  { label: "Knocking", value: "Match-ready · Free", side: "left", top: 430, width: 192, line: { left: 190, top: 452, width: 135 }, dot: { left: 321, top: 448 } },
  { label: "Profile", value: "Duckbill · Mid-Low · Full Spine", side: "right", top: 206, width: 184, line: { left: 394, top: 228, width: 142 }, dot: { left: 390, top: 224 } },
  { label: "Toe shape", value: "Round · Semi Round · Flat", side: "right", top: 454, width: 184, line: { left: 394, top: 476, width: 142 }, dot: { left: 390, top: 472 } },
  { label: "Name engraving", value: "Free · up to 15 letters", side: "right", top: 302, width: 184, line: { left: 394, top: 324, width: 142 }, dot: { left: 390, top: 320 } },
  { label: "Scuff sheet", value: "Clear · optional", side: "right", top: 378, width: 184, line: { left: 394, top: 400, width: 142 }, dot: { left: 390, top: 396 } },
];

function CalloutBox({ callout, className, style }: { callout: Callout; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      style={style}
      className={cn("flex flex-col gap-0.5 rounded-xs bg-surface-dark-raised px-4 py-3", className)}
    >
      <span className="text-[11px] leading-[14px] font-medium tracking-[0.2em] text-on-dark-subtle uppercase">
        {callout.label}
      </span>
      <span className="text-[15px] leading-5 font-semibold text-on-dark">{callout.value}</span>
    </div>
  );
}

// The phone's pointers: each label's line ends on the bat, `reach` px right of the
// column's centre (negative is left), at `top` px down the 330px drawing. The bat
// stands 300px tall, centred and turned 12°, so its edge moves left as it goes down.
const POINTERS: { label: string; side: "left" | "right"; top: number; reach: number }[] = [
  { label: "Handle", side: "left", top: 36, reach: 28 },
  { label: "Weight", side: "right", top: 104, reach: 20 },
  { label: "Profile", side: "left", top: 172, reach: -23 },
  { label: "Engraving", side: "right", top: 240, reach: 2 },
];

/** Phones: the bat turned in its glow, four of its choices pointed out beside it. */
function PointedBat() {
  return (
    <div aria-hidden="true" className="relative h-[330px] w-full">
      <div className="absolute top-2 left-1/2 size-[300px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(254,197,2,0.26)_0%,rgba(254,197,2,0)_68%)]" />
      <div className="absolute top-[25px] left-1/2 size-[260px] -translate-x-1/2 rounded-full border border-brand-yellow/30" />
      <Image
        src={BAT.src}
        alt=""
        width={BAT.width}
        height={BAT.height}
        sizes="48px"
        className="absolute top-[15px] left-[calc(50%-21px)] h-[300px] w-[42px] rotate-12 object-contain drop-shadow-[0_28px_32px_rgba(0,0,0,0.75)]"
      />
      {POINTERS.map((pointer) => (
        <div
          key={pointer.label}
          className={cn("absolute flex -translate-y-1/2 items-center", pointer.side === "right" && "flex-row-reverse")}
          style={
            pointer.side === "left"
              ? { top: pointer.top, left: 0, right: `calc(50% - ${pointer.reach}px)` }
              : { top: pointer.top, right: 0, left: `calc(50% + ${pointer.reach}px)` }
          }
        >
          <span className="flex h-8 shrink-0 items-center gap-2 rounded-full border border-border-on-dark bg-surface-dark-raised px-3 text-xs leading-4 font-semibold">
            <span className="size-1.5 rounded-full bg-brand-yellow" />
            {pointer.label}
          </span>
          <span className="h-px flex-1 bg-brand-yellow/60" />
          <span className="size-[7px] shrink-0 rounded-full bg-brand-yellow" />
        </div>
      ))}
    </div>
  );
}

/** "Engineered for your game": the bat with six customisation callouts. */
export function Engineered() {
  return (
    <section
      aria-labelledby="eng-title"
      className="relative overflow-hidden bg-surface-dark text-on-dark"
    >
      <div className="site-shell flex flex-col items-center gap-6 py-8 md:gap-12 md:py-16 xl:h-[680px] xl:flex-row xl:items-center xl:justify-between xl:py-0">
        <div className="flex w-full max-w-[520px] flex-col gap-4 md:gap-6">
          <Eyebrow bar className="text-on-dark-muted">
            Premium collection
          </Eyebrow>
          {/* "Engineered" is about 6.8em wide, so under 368px the size follows
              the screen (less the 32px of side padding) instead of clipping */}
          <h2
            id="eng-title"
            className="type-display text-[length:min(48px,(100vw_-_32px)/7)] leading-[0.9] tracking-[-0.02em] md:text-[72px]"
          >
            Engineered
            <br />
            for <span className="text-brand-yellow">your</span> game
          </h2>
          <p className="max-w-[440px] text-[15px] leading-[22px] text-on-dark-subtle md:text-[17px] md:leading-[26px]">
            Every English Willow bat is finished to your specification. Pick the weight,
            profile, toe and handle you play with, add your name, and we knock it in before
            it ships.
          </p>
          <Button
            size="lg"
            render={<Link href="/#build" />}
            nativeButton={false}
            className="hidden h-13 self-start rounded-xs px-7 text-sm font-bold md:inline-flex"
          >
            Build your bat
            <ArrowRight className="size-4" strokeWidth={2.2} aria-hidden="true" />
          </Button>
        </div>

        {/* Desktop: the annotated bat at the design's exact coordinates. */}
        <div className="relative hidden h-[560px] w-[720px] shrink-0 xl:block">
          <div
            aria-hidden="true"
            className="absolute top-10 left-40 size-[400px] rounded-full bg-[radial-gradient(circle,rgba(254,197,2,0.24)_0%,rgba(254,197,2,0)_66%)]"
          />
          <div
            aria-hidden="true"
            className="absolute top-[30px] left-[110px] size-[500px] rounded-full border border-border-dark"
          />
          <Image
            src={BAT.src}
            alt="Astaad English willow bat with customization points"
            width={BAT.width}
            height={BAT.height}
            sizes="80px"
            className="absolute top-[26px] left-[260px] h-[508px] w-[200px] object-contain drop-shadow-[0_40px_48px_rgba(0,0,0,0.75)]"
          />
          {CALLOUTS.map((callout) => (
            <div key={callout.label}>
              <span
                aria-hidden="true"
                className="absolute h-px bg-border-on-dark"
                style={{ left: callout.line.left, top: callout.line.top, width: callout.line.width }}
              />
              <span
                aria-hidden="true"
                className="absolute size-[9px] rounded-full bg-brand-yellow"
                style={{ left: callout.dot.left, top: callout.dot.top }}
              />
              <CalloutBox
                callout={callout}
                className="absolute"
                style={{
                  top: callout.top,
                  width: callout.width,
                  ...(callout.side === "left" ? { left: 0 } : { right: 0 }),
                }}
              />
            </div>
          ))}
        </div>

        {/* Phones: the bat with four pointers, every callout in a row that scrolls sideways, then the button. */}
        <div className="flex w-full flex-col gap-5 md:hidden">
          <PointedBat />
          <ul
            aria-label="What you can choose"
            className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4"
          >
            {CALLOUTS.map((callout) => (
              <li key={callout.label} className="w-[176px] shrink-0 snap-start">
                <CalloutBox callout={callout} className="h-full" />
              </li>
            ))}
          </ul>
          <Button
            size="lg"
            render={<Link href="/#build" />}
            nativeButton={false}
            className="h-13 w-full rounded-xs text-sm font-bold"
          >
            Build your bat
            <ArrowRight className="size-4" strokeWidth={2.2} aria-hidden="true" />
          </Button>
        </div>

        {/* Tablets: the bat, then the callouts as a list. */}
        <div className="hidden w-full flex-col items-center gap-8 md:flex xl:hidden">
          <div className="relative flex items-center justify-center">
            <div
              aria-hidden="true"
              className="absolute size-[320px] rounded-full bg-[radial-gradient(circle,rgba(254,197,2,0.24)_0%,rgba(254,197,2,0)_66%)]"
            />
            <Image
              src={BAT.src}
              alt="Astaad English willow bat"
              width={BAT.width}
              height={BAT.height}
              sizes="64px"
              className="relative h-[406px] w-[160px] object-contain drop-shadow-[0_40px_48px_rgba(0,0,0,0.75)]"
            />
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 md:grid-cols-3">
            {CALLOUTS.map((callout) => (
              <CalloutBox key={callout.label} callout={callout} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
