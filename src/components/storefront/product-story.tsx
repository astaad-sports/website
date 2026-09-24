import Image from "next/image";

import { type Bat } from "@/lib/catalogue";
import { siteImage } from "@/lib/site-images";

import { Eyebrow } from "./eyebrow";

const PHOTO = siteImage("home/bats-against-the-trees");

/** "Built for bigger innings." — Astaad bats against the trees beside four numbered points. */
export function ProductStory({ bat }: { bat: Bat }) {
  const points: [string, string, string][] = [
    ["01 · Willow", bat.grade, "Naturally air-dried and pressed for a lively face that only gets better."],
    ["02 · Balance", "Weight behind the middle", "Mass sits behind the sweet spot, not in the toe, so the bat swings through."],
    ["03 · Pickup", "Lighter than the scales say", "A balanced pickup that keeps your hands quick late in the innings."],
    ["04 · Control", "Big middle, forgiving edges", "Thick edges and a full sweet spot reward timing over brute force."],
  ];

  return (
    <section
      aria-labelledby="story-title"
      className="relative overflow-hidden bg-surface-dark text-on-dark"
    >
      <div className="grid lg:grid-cols-[minmax(0,680px)_1fr] xl:h-[720px]">
        <div className="relative h-[360px] lg:h-full">
          <Image
            src={PHOTO.src}
            alt="Astaad bats standing against tree trunks"
            fill
            sizes="(min-width: 1024px) 680px, 100vw"
            className="object-cover object-[50%_40%]"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(90deg,rgba(14,14,14,0)_55%,#0e0e0e_100%),linear-gradient(180deg,rgba(14,14,14,0.2)_0%,rgba(14,14,14,0)_40%,rgba(14,14,14,0.6)_100%)]"
          />
          <span className="type-eyebrow absolute bottom-8 left-4 text-on-dark-muted md:left-8 lg:bottom-12 lg:left-12">
            {bat.name} · {bat.grade}
          </span>
        </div>
        <div className="flex flex-col justify-between gap-12 px-4 py-12 md:px-8 lg:pr-16 lg:pl-6 xl:pt-24 xl:pb-20">
          <div className="flex flex-col gap-5">
            <Eyebrow bar className="text-on-dark-muted">
              The {bat.name}
            </Eyebrow>
            <h2
              id="story-title"
              className="type-display text-[48px] leading-[0.88] tracking-[-0.03em] md:text-[80px]"
            >
              Built for
              <br />
              bigger innings<span className="text-brand-yellow">.</span>
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 sm:gap-x-10">
            {points.map(([key, title, body]) => (
              <div key={key} className="flex flex-col gap-2 border-t border-border-dark pt-4">
                <span className="text-[11px] leading-[14px] font-semibold tracking-[0.2em] text-brand-yellow uppercase">
                  {key}
                </span>
                <span className="text-[17px] leading-6 font-bold">{title}</span>
                <span className="text-sm leading-5 text-on-dark-subtle">{body}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
