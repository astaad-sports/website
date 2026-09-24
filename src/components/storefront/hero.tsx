import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { siteImage } from "@/lib/site-images";

import { Eyebrow } from "./eyebrow";

const PROMISES = ["Premium Quality", "Made for Players", "Built to Perform"];

const BACKDROP = siteImage("home/hero-bats-by-the-logs");
const BAT = siteImage("bats/scoop-master-front");

/** The hero: Astaad bats by the log pile on the right, the headline on the left. */
export function HomeHero() {
  return (
    <section
      aria-label="Built for bigger innings"
      className="relative overflow-hidden bg-surface-dark text-on-dark"
    >
      <div className="absolute inset-y-0 right-[-80px] hidden w-[1000px] md:block">
        <Image
          src={BACKDROP.src}
          alt=""
          fill
          preload
          sizes="1000px"
          className="object-cover object-[35%_50%] opacity-[0.62]"
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(90deg,#0e0e0e_0%,#0e0e0e_30%,rgba(14,14,14,0.7)_52%,rgba(14,14,14,0.15)_78%,rgba(14,14,14,0)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,14,14,0.35)_0%,rgba(14,14,14,0)_30%,rgba(14,14,14,0)_60%,#0e0e0e_100%)]"
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
        sizes="100px"
        className="absolute top-[78px] right-[340px] hidden h-[624px] w-[246px] -rotate-12 object-contain drop-shadow-[0_48px_56px_rgba(0,0,0,0.75)] lg:block"
      />

      {/* From lg the featured bat sits beside the headline column, bottom-aligned with the
          promises, as in the design. min-h rather than h, so a taller column grows the hero
          instead of clipping the bottom row. */}
      <div className="site-shell relative flex min-h-[640px] flex-col justify-between gap-16 pt-14 pb-12 lg:grid lg:min-h-[760px] lg:grid-cols-[minmax(0,1fr)_auto] lg:grid-rows-[1fr_auto] lg:gap-x-16 lg:gap-y-8 lg:pt-32 lg:pb-14">
        <div className="flex max-w-[720px] flex-col gap-6 lg:col-start-1 lg:row-start-1">
          <Eyebrow bar className="text-on-dark-muted">
            Astaad Sports · Cricket equipment
          </Eyebrow>
          <h1 className="type-display text-[64px] leading-[0.88] tracking-[-0.03em] sm:text-[88px] xl:text-[124px]">
            Built for
            <br />
            <span className="text-brand-yellow">Bigger innings</span>
          </h1>
          <p className="mt-2 max-w-[520px] text-lg leading-7 text-on-dark-muted md:text-xl md:leading-[30px]">
            Premium cricket equipment for players who never settle.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <Button
              size="lg"
              render={<Link href="/#collection" />}
              nativeButton={false}
              className="h-14 rounded-xs px-8 text-[15px] font-bold tracking-[0.02em]"
            >
              Shop Bats
              <ArrowRight className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />
            </Button>
            <Button
              size="lg"
              variant="secondary"
              render={<Link href="/#collection" />}
              nativeButton={false}
              className="h-14 rounded-xs border border-border-on-dark px-8 text-[15px] text-on-dark hover:border-on-dark hover:bg-transparent"
            >
              Explore Collection
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between lg:contents">
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
            <span className="text-lg leading-6 font-bold">Legacy One</span>
            <span className="text-[13px] leading-[18px] text-on-dark-subtle">
              Top 1% Grade 1+ Players English Willow
            </span>
            <span aria-hidden="true" className="mt-1.5 block h-0.5 w-12 bg-brand-yellow" />
          </div>
        </div>
      </div>
    </section>
  );
}
