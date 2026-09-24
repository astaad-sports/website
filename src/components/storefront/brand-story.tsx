import Image from "next/image";
import Link from "next/link";

import { siteImage } from "@/lib/site-images";

import { Eyebrow } from "./eyebrow";

const PHOTO = siteImage("home/bats-in-the-workshop");

/**
 * "More than equipment." — the brand story beside Astaad bats standing among
 * willow clefts. On phones the photo comes first, edge to edge.
 */
export function BrandStory() {
  return (
    <section
      aria-labelledby="story-title"
      className="relative overflow-hidden bg-surface-dark text-on-dark"
    >
      <div className="site-shell flex flex-col-reverse gap-6 pb-8 md:flex-col md:gap-12 md:py-16 lg:h-[560px] lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:py-0">
        <div className="flex max-w-[600px] flex-col gap-4 md:gap-6">
          <Eyebrow bar className="text-on-dark-muted">
            Our story
          </Eyebrow>
          {/* "Equipment." is about 6.4em wide, so under 405px the size follows
              the screen (less the 32px of side padding) instead of clipping */}
          <h2
            id="story-title"
            className="type-display text-[length:min(56px,(100vw_-_32px)/6.65)] leading-[0.88] tracking-[-0.03em] md:text-[88px]"
          >
            More than
            <br />
            equipment<span className="text-brand-yellow">.</span>
          </h2>
          <p className="max-w-[480px] text-[15px] leading-[22px] text-on-dark-subtle md:text-lg md:leading-7">
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
        <div className="relative -mx-4 h-[240px] shrink-0 md:mx-0 md:mr-6 md:aspect-[3/2] md:h-auto md:w-full md:max-w-[600px] lg:h-[400px] lg:w-[600px]">
          <span
            aria-hidden="true"
            className="absolute inset-0 hidden translate-x-6 translate-y-6 border border-brand-yellow/50 md:block"
          />
          <Image
            src={PHOTO.src}
            alt="Astaad bats standing among willow clefts in the workshop"
            fill
            sizes="(min-width: 1024px) 600px, 100vw"
            className="object-cover object-[50%_45%]"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,14,14,0)_50%,rgba(14,14,14,0.7)_100%)]"
          />
          <span
            aria-hidden="true"
            className="type-script-accent absolute bottom-4 left-4 text-brand-yellow md:bottom-5 md:left-6"
          >
            Play Belong Grow
          </span>
        </div>
      </div>
    </section>
  );
}
