import Image from "next/image";
import Link from "next/link";

import { Eyebrow } from "./eyebrow";

/** "More than equipment." — the brand story beside the floodlit kit photograph. */
export function BrandStory() {
  return (
    <section
      aria-labelledby="story-title"
      className="relative overflow-hidden bg-surface-dark text-on-dark"
    >
      <div className="site-shell flex flex-col gap-12 py-16 lg:h-[560px] lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:py-0">
        <div className="flex max-w-[600px] flex-col gap-6">
          <Eyebrow bar className="text-on-dark-muted">
            Our story
          </Eyebrow>
          <h2
            id="story-title"
            className="type-display text-[56px] leading-[0.88] tracking-[-0.03em] md:text-[88px]"
          >
            More than
            <br />
            equipment<span className="text-brand-yellow">.</span>
          </h2>
          <p className="max-w-[480px] text-lg leading-7 text-on-dark-subtle">
            Astaad Sports is built for players who expect more from their game. Every piece
            of kit is made by us, tested on the pitch, and sold directly to you.
          </p>
          <Link
            href="/about"
            className="inline-flex items-center gap-2.5 self-start border-b-2 border-brand-yellow py-2 text-sm leading-5 font-bold tracking-[0.08em] text-on-dark uppercase transition-colors hover:text-brand-yellow"
          >
            About Astaad Sports
          </Link>
        </div>
        <div className="relative mr-6 aspect-[3/2] w-full max-w-[600px] shrink-0 lg:h-[400px] lg:w-[600px]">
          <span
            aria-hidden="true"
            className="absolute inset-0 translate-x-6 translate-y-6 border border-brand-yellow/50"
          />
          <Image
            src="/images/stadium-kit.png"
            alt="Astaad gloves, bat, helmet and ball under stadium lights"
            fill
            sizes="(min-width: 1024px) 600px, 100vw"
            className="object-cover object-[50%_80%] contrast-[1.05] saturate-[1.05]"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,14,14,0)_50%,rgba(14,14,14,0.7)_100%)]"
          />
          <span
            aria-hidden="true"
            className="type-script-accent absolute bottom-5 left-6 text-brand-yellow"
          >
            Play Belong Grow
          </span>
        </div>
      </div>
    </section>
  );
}
