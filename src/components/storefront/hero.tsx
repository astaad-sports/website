import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { siteImage } from "@/lib/site-images";

import { Eyebrow } from "./eyebrow";

const PROMISES = ["Premium Quality", "Made for Players", "Built to Perform"];

const POSTER = siteImage("home/hero-astaad-sports");

/**
 * The hero: the Astaad Sports poster of players with their Astaad kit on the
 * right, the headline on the left. On phones the poster fills the top of the
 * screen, whole, and the headline and buttons follow under it.
 */
export function HomeHero() {
  return (
    <section
      aria-label="Built for bigger innings"
      className="relative overflow-hidden bg-surface-dark text-on-dark"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-260px] left-[700px] hidden h-[1300px] w-[360px] rotate-[26deg] bg-[linear-gradient(90deg,rgba(254,197,2,0)_0%,rgba(254,197,2,0.13)_50%,rgba(254,197,2,0)_100%)] lg:block"
      />

      {/* From md the poster stands beside the headline column; from xl, where the promises
          fit under the headline, it is as tall as both rows. min-h rather than h, so a
          taller column grows the hero instead of clipping it. */}
      <div className="site-shell relative flex flex-col md:grid md:min-h-[640px] md:grid-cols-[minmax(0,1fr)_auto] md:grid-rows-[1fr_auto] md:gap-x-8 md:gap-y-8 md:py-12 lg:min-h-[760px] lg:gap-x-12 lg:py-14 xl:gap-x-16">
        <div className="flex max-w-[720px] flex-col gap-4 pt-7 pb-7 md:col-start-1 md:row-start-1 md:gap-6 md:self-center md:py-0">
          <Eyebrow bar className="text-on-dark-muted max-md:text-[11px] max-md:tracking-[0.2em] max-md:[&>span]:w-5">
            Astaad Sports · Cricket equipment
          </Eyebrow>
          <h1 className="type-display text-[length:min(62px,(100vw_-_32px)/5.8)] leading-[0.9] tracking-[-0.02em] sm:text-[88px] sm:leading-[0.88] sm:tracking-[-0.03em] md:text-[64px] lg:text-[88px] xl:text-[112px] min-[1440px]:text-[124px]">
            Built for
            <br />
            <span className="text-brand-yellow">Bigger innings</span>
          </h1>
          <p className="max-w-[300px] text-base leading-6 text-on-dark-muted md:mt-2 md:max-w-[520px] md:text-xl md:leading-[30px]">
            Premium cricket equipment for players who never settle.
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2.5 md:mt-3 md:gap-4">
            <Button
              size="lg"
              render={<Link href="/#collection" />}
              nativeButton={false}
              className="h-13 flex-1 rounded-xs px-4 text-[15px] font-bold tracking-[0.02em] md:h-14 md:flex-none md:px-8"
            >
              Shop Bats
              <ArrowRight className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />
            </Button>
            <Button
              size="lg"
              variant="secondary"
              render={<Link href="/#collection" />}
              nativeButton={false}
              className="h-13 flex-1 rounded-xs border border-border-on-dark px-4 text-[15px] text-on-dark hover:border-on-dark hover:bg-transparent md:h-14 md:flex-none md:px-8"
            >
              Explore Collection
            </Button>
          </div>
        </div>

        {/* On phones the promises give way to the poster and headline. */}
        <ul className="hidden flex-col gap-2 text-xs leading-4 font-semibold tracking-[0.22em] text-on-dark-muted uppercase sm:flex-row sm:flex-wrap sm:items-center sm:gap-0 md:col-span-2 md:col-start-1 md:row-start-2 md:flex xl:col-span-1">
          {PROMISES.map((promise, index) => (
            <li
              key={promise}
              className={index === 0 ? "sm:pr-7" : "sm:border-l sm:border-border-on-dark sm:px-7"}
            >
              {promise}
            </li>
          ))}
        </ul>

        {/* The poster, with its own embers glowing out from behind it and the yellow ring.
            Up to 440px wide it runs edge to edge; from there it keeps that width. From md
            its width keeps it as tall as the 2:3 poster it replaced (it is 9:16), so the
            hero keeps its height. */}
        <div className="relative isolate -mx-4 flex justify-center max-md:order-first min-[441px]:max-md:mt-6 md:col-start-2 md:row-start-1 md:mx-0 md:self-center xl:row-span-2">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[130%] w-[190%] -translate-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(234,88,12,0.34)_0%,rgba(154,52,18,0.18)_50%,rgba(14,14,14,0)_100%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 -z-10 hidden aspect-square w-[138%] -translate-1/2 rounded-full border border-brand-yellow/[0.38] lg:block"
          />
          <Image
            src={POSTER.src}
            alt="Astaad Sports: players in their team colours with their Astaad bats, gloves and helmets."
            width={POSTER.width}
            height={POSTER.height}
            preload
            sizes="(min-width: 1440px) 372px, (min-width: 1280px) 356px, (min-width: 1024px) 320px, (min-width: 768px) 236px, min(100vw, 440px)"
            className="h-auto w-full max-w-[440px] min-[441px]:rounded-xs min-[441px]:shadow-[0_40px_80px_rgba(0,0,0,0.65)] min-[441px]:ring-1 min-[441px]:ring-white/10 md:w-[236px] lg:w-[320px] xl:w-[356px] min-[1440px]:w-[372px]"
          />
        </div>
      </div>
    </section>
  );
}
