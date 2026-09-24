import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { siteImage } from "@/lib/site-images";

import { Eyebrow } from "./eyebrow";

const PROMISES = ["Premium Quality", "Made for Players", "Built to Perform"];

const BACKDROP = siteImage("home/hero-bats-by-the-logs");
const BAT = siteImage("bats/scoop-master-front");

/**
 * The hero: Astaad bats by the log pile on the right, the headline on the left.
 * On phones the photo and the featured bat fill the top of the screen and the
 * headline and buttons sit over its dark foot.
 */
export function HomeHero() {
  return (
    <section
      aria-label="Built for bigger innings"
      className="relative overflow-hidden bg-surface-dark text-on-dark"
    >
      <div className="absolute inset-x-0 top-0 h-[400px] md:inset-x-auto md:inset-y-0 md:right-[-80px] md:h-auto md:w-[1000px]">
        <Image
          src={BACKDROP.src}
          alt=""
          fill
          preload
          sizes="(min-width: 768px) 1000px, 100vw"
          className="object-cover object-[20%_60%] opacity-40 md:object-[35%_50%] md:opacity-[0.62]"
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden bg-[linear-gradient(90deg,#0e0e0e_0%,#0e0e0e_30%,rgba(14,14,14,0.7)_52%,rgba(14,14,14,0.15)_78%,rgba(14,14,14,0)_100%)] md:block"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden bg-[linear-gradient(180deg,rgba(14,14,14,0.35)_0%,rgba(14,14,14,0)_30%,rgba(14,14,14,0)_60%,#0e0e0e_100%)] md:block"
      />
      {/* Phones: a yellow glow and ring behind the bat, and the photo fading into black under the headline. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-20px] right-[-110px] size-[380px] rounded-full bg-[radial-gradient(circle,rgba(254,197,2,0.32)_0%,rgba(254,197,2,0.08)_45%,rgba(254,197,2,0)_70%)] md:hidden"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-9 right-[-90px] size-[330px] rounded-full border border-brand-yellow/30 md:hidden"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-[120px] h-[300px] bg-[linear-gradient(180deg,rgba(14,14,14,0)_0%,rgba(14,14,14,0.75)_45%,#0e0e0e_85%)] md:hidden"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-260px] left-[700px] hidden h-[1300px] w-[360px] rotate-[26deg] bg-[linear-gradient(90deg,rgba(254,197,2,0)_0%,rgba(254,197,2,0.13)_50%,rgba(254,197,2,0)_100%)] lg:block"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[100px] right-[210px] hidden size-[560px] rounded-full border border-brand-yellow/[0.38] lg:block"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[140px] right-[250px] hidden size-[480px] rounded-full bg-[radial-gradient(circle,rgba(254,197,2,0.22)_0%,rgba(254,197,2,0)_68%)] lg:block"
      />
      <Image
        src={BAT.src}
        alt="Astaad Scoop Master English willow bat"
        width={BAT.width}
        height={BAT.height}
        preload
        sizes="(min-width: 1024px) 100px, 64px"
        className="absolute top-6 right-11 h-[380px] w-[150px] rotate-[14deg] object-contain drop-shadow-[0_32px_40px_rgba(0,0,0,0.75)] md:hidden lg:top-[78px] lg:right-[340px] lg:block lg:h-[624px] lg:w-[246px] lg:-rotate-12 lg:drop-shadow-[0_48px_56px_rgba(0,0,0,0.75)]"
      />

      {/* From lg the featured bat sits beside the headline column, bottom-aligned with the
          promises, as in the design. min-h rather than h, so a taller column grows the hero
          instead of clipping the bottom row. On phones the eyebrow tops the screen and the
          headline, copy and buttons sit at the foot, clear of the bat. */}
      <div className="site-shell relative flex min-h-[600px] flex-col justify-between gap-16 pt-5 pb-7 md:min-h-[640px] md:pt-14 md:pb-12 lg:grid lg:min-h-[760px] lg:grid-cols-[minmax(0,1fr)_auto] lg:grid-rows-[1fr_auto] lg:gap-x-16 lg:gap-y-8 lg:pt-32 lg:pb-14">
        <div className="flex max-w-[720px] flex-1 flex-col gap-4 md:flex-none md:gap-6 lg:col-start-1 lg:row-start-1">
          <Eyebrow bar className="mb-auto text-on-dark-muted max-md:text-[11px] max-md:tracking-[0.2em] max-md:[&>span]:w-5 md:mb-0">
            Astaad Sports · Cricket equipment
          </Eyebrow>
          <h1 className="type-display text-[length:min(62px,(100vw_-_32px)/5.8)] leading-[0.9] tracking-[-0.02em] sm:text-[88px] sm:leading-[0.88] sm:tracking-[-0.03em] xl:text-[124px]">
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

        {/* On phones the promises and the featured bat's name give way to the photo and headline. */}
        <div className="hidden flex-col gap-8 md:flex md:flex-row md:items-end md:justify-between lg:contents">
          <ul className="flex flex-col gap-2 text-xs leading-4 font-semibold tracking-[0.22em] text-on-dark-muted uppercase sm:flex-row sm:flex-wrap sm:items-center sm:gap-0 lg:col-start-1 lg:row-start-2">
            {PROMISES.map((promise, index) => (
              <li
                key={promise}
                className={index === 0 ? "sm:pr-7" : "sm:border-l sm:border-border-on-dark sm:px-7"}
              >
                {promise}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-1.5 md:items-end md:text-right lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-end">
            <span className="text-xs leading-4 font-medium tracking-[0.22em] text-on-dark-subtle uppercase">
              Featured
            </span>
            <span className="text-lg leading-6 font-bold">Scoop Master</span>
            <span className="text-[13px] leading-[18px] text-on-dark-subtle">Handcrafted by Astaad</span>
            <span aria-hidden="true" className="mt-1.5 block h-0.5 w-12 bg-brand-yellow" />
          </div>
        </div>
      </div>
    </section>
  );
}
