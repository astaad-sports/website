"use client";

import Image from "next/image";
import { useState } from "react";
import { RotateCw } from "lucide-react";

import { BAT_IMAGE, type Bat } from "@/lib/catalogue";
import { cn } from "@/lib/utils";

interface View {
  id: string;
  name: string;
  label: string;
  transform: string;
  swatch: React.ReactNode;
}

const SWATCH = "block rounded-[3px]";

function buildViews(grade: string): View[] {
  return [
    {
      id: "front",
      name: "Front",
      label: `Front · ${grade}`,
      transform: "none",
      swatch: <span className={cn(SWATCH, "h-[46px] w-6 bg-[linear-gradient(180deg,#2c2c2c_0_30%,#d9b979_30%_100%)]")} />,
    },
    {
      id: "back",
      name: "Back",
      label: "Back · Full spine and edges",
      transform: "scaleX(-1)",
      swatch: <span className={cn(SWATCH, "h-[46px] w-6 bg-[linear-gradient(180deg,#2c2c2c_0_30%,#c9a866_30%_100%)]")} />,
    },
    {
      id: "side",
      name: "Side",
      label: "Side · 40 mm edges",
      transform: "scaleX(0.32)",
      swatch: <span className={cn(SWATCH, "h-[46px] w-2.5 bg-[linear-gradient(180deg,#2c2c2c_0_30%,#d9b979_30%_100%)]")} />,
    },
    {
      id: "handle",
      name: "Handle",
      label: "Handle · Sarawak cane, oval",
      transform: "translateY(180px) scale(2.2)",
      swatch: <span className={cn(SWATCH, "h-[46px] w-6 bg-[linear-gradient(180deg,#3d4241_0_70%,#d9b979_70%_100%)]")} />,
    },
    {
      id: "close-up",
      name: "Close-up",
      label: "Close-up · Astaad lion crest",
      transform: "translateY(-30px) scale(2.4)",
      swatch: <span className={cn(SWATCH, "h-[46px] w-6 bg-[radial-gradient(circle_at_50%_40%,#fec502_0_6px,#d9b979_7px_100%)]")} />,
    },
    {
      id: "360",
      name: "360°",
      label: "360° · drag to rotate",
      transform: "perspective(900px) rotateY(38deg)",
      swatch: <RotateCw className="size-6" strokeWidth={1.5} aria-hidden="true" />,
    },
  ];
}

/** The dark product stage: the blade under a floodlight glow with six views. */
export function ProductGallery({ bat }: { bat: Bat }) {
  const views = buildViews(bat.grade);
  const [active, setActive] = useState(0);
  const view = views[active];

  return (
    <div className="relative h-[560px] overflow-hidden bg-[linear-gradient(180deg,#161616_0%,#0e0e0e_70%)] text-on-dark md:h-[760px]">
      <div
        aria-hidden="true"
        className="absolute top-[130px] left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(254,197,2,0.22)_0%,rgba(254,197,2,0)_66%)]"
      />
      <div
        aria-hidden="true"
        className="absolute top-[110px] left-1/2 size-[440px] -translate-x-1/2 rounded-full border border-brand-yellow/30"
      />
      <div
        aria-hidden="true"
        className="absolute top-[640px] left-1/2 hidden h-[60px] w-[380px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0)_70%)] md:block"
      />
      <div className="absolute inset-x-0 top-10 bottom-16 flex items-center justify-center overflow-hidden md:bottom-10">
        <Image
          src={BAT_IMAGE}
          alt={`Astaad ${bat.name}, ${bat.grade} bat`}
          width={224}
          height={568}
          priority
          style={{ transform: view.transform }}
          className="h-[420px] w-auto drop-shadow-[0_48px_56px_rgba(0,0,0,0.8)] transition-[transform,filter] duration-500 ease-out md:h-[568px]"
        />
      </div>

      <nav
        aria-label="Product views"
        className="absolute top-6 left-4 flex flex-col gap-2 md:top-[120px] md:left-10 md:gap-2.5"
      >
        {views.map((item, index) => {
          const selected = index === active;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setActive(index)}
              className={cn(
                "flex h-14 w-12 cursor-pointer flex-col items-center justify-center gap-1 rounded-xs border py-1.5 text-[10px] leading-3 font-semibold tracking-[0.12em] uppercase transition-colors md:h-[76px] md:w-16",
                selected
                  ? "border-brand-yellow bg-surface-dark-raised text-on-dark"
                  : "border-border-dark bg-surface-dark-sunken text-on-dark-subtle hover:text-on-dark"
              )}
            >
              <span className="hidden md:block">{item.swatch}</span>
              {item.name}
            </button>
          );
        })}
      </nav>

      <p className="type-eyebrow absolute bottom-4 left-4 text-on-dark-subtle md:bottom-9 md:left-10">
        {view.label}
      </p>
      <p
        aria-hidden="true"
        className="type-script-accent absolute right-10 bottom-[30px] hidden text-[36px] text-brand-yellow md:block"
      >
        Built for Greatness
      </p>
    </div>
  );
}
