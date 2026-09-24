"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/** Settings has these four sections only, in this order. */
export const SETTINGS_SECTIONS = [
  { id: "store", title: "Store information" },
  { id: "shipping", title: "Shipping" },
  { id: "payment", title: "Payment" },
  { id: "account", title: "Admin account" },
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

const FIRST = SETTINGS_SECTIONS[0].id;
const LAST = SETTINGS_SECTIONS[SETTINGS_SECTIONS.length - 1].id;

/** A section is being read once its top passes this line, just under the sticky title bar. */
const READING_LINE = 120;

function atBottomOfPage(): boolean {
  const page = document.documentElement;
  return page.scrollHeight > window.innerHeight && window.innerHeight + window.scrollY >= page.scrollHeight - 2;
}

function sectionAtReadingLine(): SettingsSectionId {
  let current: SettingsSectionId = FIRST;
  for (const { id } of SETTINGS_SECTIONS) {
    const top = document.getElementById(id)?.getBoundingClientRect().top;
    if (top !== undefined && top <= READING_LINE) current = id;
  }
  return current;
}

/**
 * Desktop: the sections as links beside the form, the one being read marked.
 * The last sections can't scroll up to the reading line, so at the bottom of
 * the page the link the admin picked stays marked (or else the last one).
 */
export function SettingsNav() {
  const [active, setActive] = useState<SettingsSectionId>(FIRST);
  const picked = useRef<SettingsSectionId | null>(null);

  useEffect(() => {
    let frame = 0;
    function update() {
      frame = 0;
      if (atBottomOfPage()) {
        setActive(picked.current ?? LAST);
        return;
      }
      picked.current = null;
      setActive(sectionAtReadingLine());
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // A page opened at #payment has already scrolled there before this runs.
    onScroll();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <nav aria-label="Settings sections" className="sticky top-25 hidden w-50 shrink-0 flex-col gap-0.5 lg:flex">
      {SETTINGS_SECTIONS.map((section) => {
        const current = section.id === active;
        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            aria-current={current ? "location" : undefined}
            onClick={() => {
              picked.current = section.id;
              setActive(section.id);
            }}
            className={cn(
              "flex h-10 items-center rounded-sm px-3 text-sm leading-5 transition-colors",
              current ? "bg-surface-sunken font-semibold text-foreground" : "font-medium text-ink-muted hover:text-foreground"
            )}
          >
            {section.title}
          </a>
        );
      })}
    </nav>
  );
}
