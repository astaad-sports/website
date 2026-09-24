import Image from "next/image";

import { siteImage, type SiteImageKey } from "@/lib/site-images";

import { SectionHeading } from "./section-heading";

const STEPS: { image: SiteImageKey; title: string; body: string; alt: string }[] = [
  {
    image: "craft/clefts",
    title: "The cleft",
    body: "English willow clefts, air-dried and graded before a blade is cut.",
    alt: "Willow clefts stacked to dry",
  },
  {
    image: "craft/cane-handles",
    title: "The handle",
    body: "Sarawak cane with three rubber inserts, for grip and spring.",
    alt: "Cane handles standing in a basket",
  },
  {
    image: "craft/handle-splice",
    title: "The splice",
    body: "The handle is spliced deep into the shoulders of the blade.",
    alt: "The shoulders of bats where the handle is spliced in",
  },
  {
    image: "craft/drawknife",
    title: "Shaped by hand",
    body: "A drawknife takes each blade to its profile.",
    alt: "A drawknife shaping the back of a blade",
  },
  {
    image: "craft/planing",
    title: "Planed true",
    body: "The face and edges are planed and sanded smooth.",
    alt: "A blade held in a vise while it is planed",
  },
  {
    image: "craft/lathe",
    title: "The finish",
    body: "The handle is turned and finished on the lathe.",
    alt: "A bat handle being finished on a lathe",
  },
  {
    image: "craft/bat-on-the-workbench",
    title: "Ready to play",
    body: "Knocked in, gripped and stickered for your first innings.",
    alt: "A finished Astaad bat on the workbench among wood shavings",
  },
];

/**
 * "From cleft to crease": how a bat is made, in seven photographs. It follows
 * the brand story on the same black ground. A row that scrolls on smaller
 * screens; all seven side by side from lg.
 */
export function Craft() {
  return (
    <section aria-labelledby="craft-title" className="bg-surface-dark text-on-dark">
      <div className="site-shell flex flex-col gap-10 pb-16 md:pb-20">
        <SectionHeading
          id="craft-title"
          tone="dark"
          eyebrow="Handcrafted"
          title="From cleft to crease."
          aside={
            <p className="max-w-[380px] text-[15px] leading-[22px] text-on-dark-subtle md:text-right">
              English willow, shaped by hand and finished to order.
            </p>
          }
        />
        <ol className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 md:-mx-8 md:px-8 lg:mx-0 lg:grid lg:grid-cols-7 lg:overflow-visible lg:px-0">
          {STEPS.map((step, index) => (
            <li key={step.image} className="flex w-[220px] shrink-0 snap-start flex-col gap-4 lg:w-auto">
              <span className="relative block aspect-[4/5] overflow-hidden rounded-xs bg-surface-dark-raised">
                <Image
                  src={siteImage(step.image).src}
                  alt={step.alt}
                  fill
                  sizes="(min-width: 1024px) 14vw, 220px"
                  className="object-cover"
                />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-[11px] leading-[14px] font-semibold tracking-[0.2em] text-brand-yellow uppercase">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-[15px] leading-5 font-bold">{step.title}</span>
                <span className="text-[13px] leading-[18px] text-on-dark-subtle">{step.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
