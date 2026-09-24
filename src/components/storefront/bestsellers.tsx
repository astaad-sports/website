"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

import { KitCard } from "./kit-card";
import type { KitTile } from "./kit-tiles";
import { SectionHeading } from "./section-heading";

/** "What players are buying." — up to four tiles; the arrows scroll the row on small screens. */
export function Bestsellers({ items }: { items: KitTile[] }) {
  const row = useRef<HTMLDivElement>(null);

  function scroll(direction: 1 | -1) {
    const node = row.current;
    if (!node) return;
    const card = node.firstElementChild as HTMLElement | null;
    node.scrollBy({ left: direction * ((card?.offsetWidth ?? 300) + 24), behavior: "smooth" });
  }

  return (
    <section
      aria-labelledby="best-title"
      className="site-shell flex flex-col gap-8 pt-16 pb-16 xl:h-[600px] xl:pb-0"
    >
      <SectionHeading
        id="best-title"
        eyebrow="Bestsellers"
        title="What players are buying."
        aside={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              aria-label="Previous products"
              onClick={() => scroll(-1)}
              className="size-12 rounded-full border border-border bg-surface-raised hover:bg-surface-sunken"
            >
              <ChevronLeft className="size-5" strokeWidth={1.5} aria-hidden="true" />
            </Button>
            <Button
              size="icon"
              aria-label="Next products"
              onClick={() => scroll(1)}
              className="size-12 rounded-full bg-surface-dark text-on-dark hover:bg-surface-dark-raised"
            >
              <ChevronRight className="size-5" strokeWidth={1.5} aria-hidden="true" />
            </Button>
          </div>
        }
      />
      <div
        ref={row}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 md:-mx-8 md:px-8 xl:mx-0 xl:grid xl:grid-cols-4 xl:overflow-visible xl:px-0"
      >
        {items.map((item) => (
          <KitCard
            key={item.slug}
            {...item}
            className="w-[280px] shrink-0 snap-start sm:w-[320px] xl:w-auto"
          />
        ))}
      </div>
    </section>
  );
}
