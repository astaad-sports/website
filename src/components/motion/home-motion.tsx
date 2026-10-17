"use client";

import { useRef, type ReactNode } from "react";

import { gsap, SplitText, useGSAP, withMotion } from "./gsap";

/** Where a scroll reveal starts: the element's top this far down the screen. */
const START = "top 88%";

/** Undo GSAP's inline styles once a reveal ends, so hover effects (Tailwind's `translate`) work again. */
const DONE = { clearProps: "transform,translate,rotate,scale,opacity,visibility" };

/**
 * The home page's motion, set up once over everything inside it. Sections
 * stay server components and ask for motion with data attributes:
 *
 * - `data-motion-heading` (SectionHeading): eyebrow, title and aside rise in turn.
 * - `data-motion-split`: a display title's words rise out of a mask.
 * - `data-motion-stagger`: the element's children rise in, one after another.
 * - `data-motion-zoom`: a photo settles from slightly zoomed in as it scrolls through.
 * - `data-motion-parallax="8"`: drifts against the scroll, by that percentage.
 * - `data-motion-float`: bobs gently, always (the bats in Engineered).
 * - `data-motion-glow`: breathes, always (the yellow glows; opacity only).
 * - `data-motion-callouts`: Engineered's lines draw out to their callouts.
 * - `data-motion-hero` with `-copy` and `-poster` inside: the hero eases away as you scroll.
 *
 * Every reveal plays once. Visitors who ask for less motion get none of it,
 * and nothing is hidden for them. Never put a transform reveal on an element
 * that Tailwind translates or rotates: GSAP's transform replaces it.
 */
export function HomeMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () =>
      withMotion(() => {
        const all = <T extends Element = HTMLElement>(selector: string) =>
          gsap.utils.toArray<T>(root.current?.querySelectorAll(selector) ?? []);

        for (const heading of all("[data-motion-heading]")) {
          const [lead, ...rest] = Array.from(heading.children);
          const parts = [...Array.from(lead?.children ?? []), ...rest].filter(
            (part) => !part.hasAttribute("data-motion-split")
          );
          gsap.from(parts, {
            y: 24,
            autoAlpha: 0,
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.09,
            scrollTrigger: { trigger: heading, start: START, once: true },
            ...DONE,
          });
        }

        for (const title of all("[data-motion-split]")) {
          SplitText.create(title, {
            type: "lines,words",
            mask: "lines",
            autoSplit: true,
            onSplit: (split) =>
              gsap.from(split.words, {
                yPercent: 110,
                duration: 0.9,
                ease: "power4.out",
                stagger: 0.06,
                scrollTrigger: { trigger: title, start: START, once: true },
              }),
          });
        }

        for (const group of all("[data-motion-stagger]")) {
          const items = group.children;
          gsap.from(items, {
            y: 32,
            autoAlpha: 0,
            duration: 0.65,
            ease: "power3.out",
            // A long row (thirty reviews) shares the same short wave as a short one.
            stagger: items.length > 8 ? { amount: 0.64 } : 0.08,
            scrollTrigger: { trigger: group, start: START, once: true },
            ...DONE,
          });
        }

        for (const photo of all("[data-motion-zoom]")) {
          gsap.fromTo(
            photo,
            { scale: 1.14 },
            {
              scale: 1,
              ease: "none",
              scrollTrigger: { trigger: photo, start: "top bottom", end: "center 40%", scrub: 0.6 },
            }
          );
        }

        for (const layer of all("[data-motion-parallax]")) {
          const amount = Number(layer.dataset.motionParallax) || 8;
          gsap.fromTo(
            layer,
            { yPercent: -amount },
            {
              yPercent: amount,
              ease: "none",
              scrollTrigger: { trigger: layer.parentElement, start: "top bottom", end: "bottom top", scrub: true },
            }
          );
        }

        all("[data-motion-float]").forEach((item, index) => {
          gsap.to(item, { y: -12, duration: 2.8 + index * 0.3, ease: "sine.inOut", yoyo: true, repeat: -1 });
        });

        all("[data-motion-glow]").forEach((glow, index) => {
          gsap.to(glow, { opacity: 0.45, duration: 3.2 + index * 0.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
        });

        for (const board of all("[data-motion-callouts]")) {
          const timeline = gsap.timeline({ scrollTrigger: { trigger: board, start: "top 75%", once: true } });
          for (const callout of board.querySelectorAll<HTMLElement>("[data-motion-callout]")) {
            const left = callout.dataset.motionCallout === "left";
            const line = callout.querySelector("[data-motion-line]");
            const dot = callout.querySelector("[data-motion-dot]");
            const box = callout.querySelector("[data-motion-box]");
            timeline
              .from(dot, { scale: 0, duration: 0.3, ease: "back.out(3)" }, "<0.12")
              .from(line, { scaleX: 0, transformOrigin: left ? "right center" : "left center", duration: 0.4, ease: "power2.out" }, "<0.1")
              .from(box, { x: left ? 16 : -16, autoAlpha: 0, duration: 0.45, ease: "power3.out" }, "<0.2");
          }
        }

        for (const hero of all("[data-motion-hero]")) {
          const scroll = { trigger: hero, start: "top top", end: "bottom top", scrub: true };
          gsap.to(hero.querySelector("[data-motion-hero-poster]"), { yPercent: 12, scale: 0.94, ease: "none", scrollTrigger: scroll });
          gsap.to(hero.querySelector("[data-motion-hero-copy]"), { yPercent: -10, autoAlpha: 0.2, ease: "none", scrollTrigger: scroll });
        }
      }),
    { scope: root }
  );

  return (
    <div ref={root} className="contents">
      {children}
    </div>
  );
}
