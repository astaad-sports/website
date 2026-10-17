"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, Tag, Timer, X } from "lucide-react";

import { useCatalogue } from "@/components/cart/catalogue-provider";
import { SheetClose } from "@/components/ui/sheet";
import { gsap, motionWelcome, useGSAP, useMotionWelcome, withMotion } from "@/components/motion/gsap";
import type { StoreAnnouncement } from "@/lib/products/model";
import { cn } from "@/lib/utils";

import { CopyCode } from "./copy-code";
import { OfferCountdown } from "./offer-countdown";

/** How long each offer shows before the next, when there are several. */
const ROTATE_MS = 6000;

// Dismissing the bar lasts for the browser tab's session, for the offers it
// showed: a new offer brings it back.
const DISMISSED_KEY = "astaad-offer-bar-dismissed";
const DISMISSED_EVENT = "astaad-offer-bar-dismissed";

function readDismissed(): string | null {
  try {
    return window.sessionStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

function writeDismissed(value: string) {
  try {
    window.sessionStorage.setItem(DISMISSED_KEY, value);
  } catch {
    // Storage blocked: the bar still hides until the page changes.
  }
  window.dispatchEvent(new Event(DISMISSED_EVENT));
}

function subscribeDismissed(onChange: () => void) {
  window.addEventListener(DISMISSED_EVENT, onChange);
  return () => window.removeEventListener(DISMISSED_EVENT, onChange);
}

/** One offer's line: headline, time left and, for a coupon, its code. In a preview nothing links away. */
function OfferLine({ offer, more, preview }: { offer: StoreAnnouncement; more: number; preview: boolean }) {
  const headline = (
    <>
      <Tag className="size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
      <span className="truncate">{offer.headline}</span>
      <ArrowRight
        className="hidden size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 md:block"
        strokeWidth={2}
        aria-hidden="true"
      />
    </>
  );
  return (
    <div data-slide className="flex min-w-0 items-center justify-center gap-2.5 md:gap-3">
      {preview ? (
        <span className="flex min-w-0 items-center gap-1.5">{headline}</span>
      ) : (
        <Link
          href="/offers"
          className="group flex min-w-0 items-center gap-1.5 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-yellow"
        >
          {headline}
        </Link>
      )}
      <span aria-hidden="true" className={cn("text-on-yellow/50", offer.code ? "hidden md:inline" : "")}>
        ·
      </span>
      {/* Phones show a timer icon in place of "Ends in", leaving the headline room. */}
      <span className={cn("flex shrink-0 items-center gap-1 font-bold whitespace-nowrap", offer.code && "hidden md:flex")}>
        <Timer className="size-3.5 sm:hidden" strokeWidth={2} aria-label="Ends in" />
        <span className="hidden sm:inline">Ends in </span>
        <OfferCountdown endsAt={offer.endsAt} prefix="" />
      </span>
      {offer.code && <CopyCode code={offer.code} tone="yellow" />}
      {more > 0 && (
        <Link href="/offers" className="hidden shrink-0 font-bold underline underline-offset-2 sm:inline">
          +{more} more
        </Link>
      )}
    </div>
  );
}

/**
 * The thin yellow strip above the header while an announced offer runs.
 * Several take turns, every six seconds, holding still while the pointer
 * or keyboard is on the bar (and not at all for visitors who asked for less
 * motion: they see the first, and "+1 more"). The × hides it for the session.
 * `preview` shows one offer as the admin is writing it: no turns, no ×.
 */
export function OfferBar({
  announcements,
  preview = false,
  className,
}: {
  announcements: StoreAnnouncement[];
  preview?: boolean;
  className?: string;
}) {
  const bar = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const ids = announcements.map((offer) => offer.id).join(",");
  const dismissed = useSyncExternalStore(subscribeDismissed, readDismissed, () => null);
  const motion = useMotionWelcome();
  const hidden = !preview && dismissed === ids;
  const rotates = !preview && announcements.length > 1;
  const current = announcements[index % Math.max(1, announcements.length)];

  useGSAP(
    () => {
      const shine = bar.current?.querySelector("[data-shine]");
      if (!shine) return;
      // One light sweep across the bar as the page opens.
      return withMotion(() => {
        gsap.fromTo(shine, { xPercent: -100 }, { xPercent: 260, duration: 1.4, ease: "power2.inOut", delay: 0.4 });
      });
    },
    { scope: bar }
  );

  // Turn to the next offer: the line lifts out, the next rises in. A plain
  // effect, so holding the bar (or asking for less motion) clears the timer.
  useEffect(() => {
    if (!rotates || held || !motion) return;
    const timer = window.setTimeout(() => {
      const slide = bar.current?.querySelector("[data-slide]");
      gsap.to(slide ?? [], {
        yPercent: -60,
        autoAlpha: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => setIndex((value) => (value + 1) % announcements.length),
      });
    }, ROTATE_MS);
    return () => window.clearTimeout(timer);
  }, [rotates, held, motion, index, announcements.length]);

  // The incoming offer rises in; the first one is already on screen.
  const shownIndex = useRef(index);
  useGSAP(
    () => {
      if (shownIndex.current === index) return;
      shownIndex.current = index;
      const slide = bar.current?.querySelector("[data-slide]");
      if (slide) gsap.fromTo(slide, { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.35, ease: "power3.out" });
    },
    { dependencies: [index], scope: bar, revertOnUpdate: true }
  );

  function dismiss() {
    if (!motionWelcome()) return writeDismissed(ids);
    gsap.to(bar.current, { height: 0, autoAlpha: 0, duration: 0.3, ease: "power2.inOut", onComplete: () => writeDismissed(ids) });
  }

  if (!current || hidden) return null;
  // Visitors who asked for less motion get no turns; the others are a tap away.
  const more = rotates && !motion ? announcements.length - 1 : 0;

  return (
    <div
      ref={bar}
      role="region"
      aria-label="Offers"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      className={cn(
        "relative overflow-hidden bg-brand-yellow text-[13px] leading-5 font-semibold text-on-yellow",
        className
      )}
    >
      <span
        data-shine
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -translate-x-full bg-linear-to-r from-transparent via-white/45 to-transparent"
      />
      <div className={cn("relative flex h-10 items-center gap-2", preview ? "px-3" : "site-shell pr-12 pl-12 md:pr-14 md:pl-14")}>
        <div className="min-w-0 flex-1 overflow-hidden" aria-live={rotates ? "off" : undefined}>
          <OfferLine key={current.id} offer={current} more={more} preview={preview} />
        </div>
        {!preview && (
          <button
            type="button"
            onClick={dismiss}
            aria-label="Hide offers"
            className="absolute top-0 right-2 flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-on-yellow/10 focus-visible:outline-2 focus-visible:outline-on-yellow md:right-4"
          >
            <X className="size-4" strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

/** The offer bar for the store's pages: the catalogue's running announced offers. */
export function SiteOfferBar() {
  const { announcements } = useCatalogue();
  if (announcements.length === 0) return null;
  return <OfferBar announcements={announcements} />;
}

/** "Offers" in the header's links, in yellow, only while something is announced. */
export function OffersNavLink({ className, active }: { className?: string; active?: boolean }) {
  const { announcements } = useCatalogue();
  if (announcements.length === 0) return null;
  return (
    <Link href="/offers" aria-current={active ? "page" : undefined} className={className}>
      Offers
    </Link>
  );
}

/** "Offers" in the phone menu: closes the menu as it opens the page. */
export function OffersMenuItem({ active }: { active?: boolean }) {
  const { announcements } = useCatalogue();
  if (announcements.length === 0) return null;
  return (
    <li>
      <SheetClose
        data-slot="sheet-link"
        nativeButton={false}
        render={
          <Link
            href="/offers"
            aria-current={active ? "page" : undefined}
            className="flex min-h-11 items-center gap-2 px-4 text-sm leading-5 font-semibold text-brand-yellow"
          />
        }
      >
        <Tag className="size-4" strokeWidth={1.5} aria-hidden="true" />
        Offers
      </SheetClose>
    </li>
  );
}
