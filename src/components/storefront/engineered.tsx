import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BAT_IMAGE } from "@/lib/catalogue";
import { cn } from "@/lib/utils";

import { Eyebrow } from "./eyebrow";

interface Callout {
  label: string;
  value: string;
  side: "left" | "right";
  top: number;
  width: number;
  line: { left: number; top: number; width: number };
  dot: { left: number; top: number };
}

const CALLOUTS: Callout[] = [
  { label: "Handle", value: "Round · Semi Oval · Oval", side: "left", top: 74, width: 176, line: { left: 174, top: 96, width: 100 }, dot: { left: 270, top: 92 } },
  { label: "Weight", value: "1120 – 1220 g", side: "left", top: 240, width: 178, line: { left: 176, top: 262, width: 100 }, dot: { left: 272, top: 258 } },
  { label: "Knocking", value: "Match-ready · Free", side: "left", top: 430, width: 192, line: { left: 190, top: 452, width: 96 }, dot: { left: 282, top: 448 } },
  { label: "Profile", value: "Duckbill · Mid-Low · Full Spine", side: "right", top: 154, width: 184, line: { left: 440, top: 176, width: 96 }, dot: { left: 436, top: 172 } },
  { label: "Name engraving", value: "Free · up to 15 letters", side: "right", top: 308, width: 184, line: { left: 446, top: 330, width: 90 }, dot: { left: 442, top: 326 } },
  { label: "Scuff sheet", value: "Clear · optional", side: "right", top: 454, width: 184, line: { left: 430, top: 476, width: 106 }, dot: { left: 426, top: 472 } },
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

/** "Engineered for your game": the bat with six customisation callouts. */
export function Engineered() {
  return (
    <section
      aria-labelledby="eng-title"
      className="relative overflow-hidden bg-surface-dark text-on-dark"
    >
      <div className="site-shell flex flex-col items-center gap-12 py-16 xl:h-[680px] xl:flex-row xl:items-center xl:justify-between xl:py-0">
        <div className="flex w-full max-w-[520px] flex-col gap-6">
          <Eyebrow bar className="text-on-dark-muted">
            Premium collection
          </Eyebrow>
          <h2
            id="eng-title"
            className="type-display text-[48px] leading-[0.9] tracking-[-0.02em] md:text-[72px]"
          >
            Engineered
            <br />
            for <span className="text-brand-yellow">your</span> game
          </h2>
          <p className="max-w-[440px] text-[17px] leading-[26px] text-on-dark-subtle">
            Every English Willow bat is finished to your specification. Pick the weight,
            profile and handle you play with, add your name, and we knock it in before it
            ships.
          </p>
          <Button
            size="lg"
            render={<Link href="/#build" />}
            nativeButton={false}
            className="h-13 self-start rounded-xs px-7 text-sm font-bold"
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
            src={BAT_IMAGE}
            alt="Astaad English willow bat with customization points"
            width={200}
            height={508}
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

        {/* Smaller screens: the bat, then the callouts as a list. */}
        <div className="flex w-full flex-col items-center gap-8 xl:hidden">
          <div className="relative flex items-center justify-center">
            <div
              aria-hidden="true"
              className="absolute size-[320px] rounded-full bg-[radial-gradient(circle,rgba(254,197,2,0.24)_0%,rgba(254,197,2,0)_66%)]"
            />
            <Image
              src={BAT_IMAGE}
              alt="Astaad English willow bat"
              width={160}
              height={406}
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
