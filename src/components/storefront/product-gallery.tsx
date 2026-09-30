"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { RotateCw } from "lucide-react";

import { BAT_IMAGE, BAT_SIDE_LABELS } from "@/lib/catalogue";
import type { StoreBat } from "@/lib/products/model";
import { cn } from "@/lib/utils";

import { BatTurn } from "./bat-turn";
import { PhotoTrack } from "./photo-track";
import { StageCaption } from "./stage-caption";
import { PhotoThumbnails, StageRail, StageThumb } from "./stage-thumbnails";
import { useSwipe } from "./use-swipe";

interface View {
  id: string;
  name: string;
  label: string;
  transform: string;
  swatch: ReactNode;
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

/**
 * The dark stage: floodlight glow, a floor shadow, the caption and the script
 * line. From xl it stretches to the hero's height, which grows past 760px
 * when the details beside it need more room.
 */
function Stage({ caption, count, children }: { caption: string; count?: string; children: ReactNode }) {
  return (
    <div className="relative h-[560px] overflow-hidden bg-[linear-gradient(180deg,#161616_0%,#0e0e0e_70%)] text-on-dark md:h-[760px] xl:h-auto">
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
      {children}
      <StageCaption label={caption} count={count} />
    </div>
  );
}

/** The standard cut-out, shown from six angles; swipe or drag to turn it. */
function StudioViews({ bat }: { bat: StoreBat }) {
  const views = buildViews(bat.grade);
  const [active, setActive] = useState(0);
  const swipe = useSwipe({ count: views.length, active, onChange: setActive });
  const view = views[active];

  return (
    <Stage caption={view.label}>
      <div
        className="absolute inset-x-0 top-10 bottom-16 flex cursor-grab touch-pan-y touch-pinch-zoom items-center justify-center overflow-hidden select-none active:cursor-grabbing md:bottom-10"
        {...swipe.handlers}
      >
        <Image
          src={BAT_IMAGE}
          alt={`Astaad ${bat.name}, ${bat.grade} bat`}
          width={224}
          height={568}
          preload
          style={{ transform: view.transform, translate: `${swipe.offset}px` }}
          className={cn(
            "h-[420px] w-auto drop-shadow-[0_48px_56px_rgba(0,0,0,0.8)] transition-[transform,translate,filter] duration-500 ease-out md:h-[568px]",
            swipe.dragging && "transition-none"
          )}
        />
      </div>
      <StageRail label="Product views">
        {views.map((item, index) => (
          <StageThumb key={item.id} selected={index === active} onSelect={() => setActive(index)}>
            <span className="hidden md:block">{item.swatch}</span>
            {item.name}
          </StageThumb>
        ))}
      </StageRail>
    </Stage>
  );
}

/**
 * The bat's own photos, primary first, with thumbnails when there is more than
 * one. Swipe (or drag with a mouse) left or right between them. A bat whose
 * sides are marked also gets a "360°" thumbnail: the turn-around (see BatTurn).
 */
function Photos({ bat }: { bat: StoreBat }) {
  const [active, setActive] = useState(0);
  const [turning, setTurning] = useState(false);
  const [side, setSide] = useState(0);
  const count = bat.images.length;
  const turn = bat.turn.length > 0;

  return (
    <Stage
      caption={turning ? "Drag to turn" : bat.grade}
      count={turning ? BAT_SIDE_LABELS[bat.turn[side].side] : count > 1 ? `${active + 1} of ${count}` : undefined}
    >
      {turning ? (
        <BatTurn bat={bat} index={side} onChange={setSide} />
      ) : (
        <PhotoTrack count={count} active={active} onChange={setActive}>
          {(index, near) => (
            <div className="absolute inset-x-16 top-10 bottom-16 md:inset-x-28 md:bottom-24">
              <Image
                src={bat.images[index]}
                alt={count > 1 ? `Astaad ${bat.name}, photo ${index + 1} of ${count}` : `Astaad ${bat.name}, ${bat.grade} bat`}
                fill
                preload={index === 0}
                loading={index === 0 ? undefined : near ? "eager" : "lazy"}
                sizes="(min-width: 1024px) 40vw, 80vw"
                className="object-contain drop-shadow-[0_48px_56px_rgba(0,0,0,0.8)]"
              />
            </div>
          )}
        </PhotoTrack>
      )}
      <PhotoThumbnails
        images={bat.images}
        active={turning ? null : active}
        onSelect={(index) => {
          setTurning(false);
          setActive(index);
        }}
      >
        {turn && (
          <StageThumb selected={turning} onSelect={() => setTurning(true)} label="Turn the bat around">
            <RotateCw className="size-5 md:size-6" strokeWidth={1.5} aria-hidden="true" />
            360°
          </StageThumb>
        )}
      </PhotoThumbnails>
    </Stage>
  );
}

/**
 * The dark product stage. The standard cut-out gets six studio views; a bat
 * with its own photos shows those instead.
 */
export function ProductGallery({ bat }: { bat: StoreBat }) {
  const studio = bat.images.length === 1 && bat.images[0] === BAT_IMAGE;
  return studio ? <StudioViews bat={bat} /> : <Photos bat={bat} />;
}
