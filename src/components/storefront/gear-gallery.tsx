"use client";

import Image from "next/image";
import { useState } from "react";

import type { StoreGear } from "@/lib/products/model";
import { cn } from "@/lib/utils";

import { PhotoThumbnails } from "./stage-thumbnails";

/** The dark product stage for gear: the photo under the floodlight glow, with thumbnails when there are several. */
export function GearGallery({ product }: { product: StoreGear }) {
  const [active, setActive] = useState(0);
  const count = product.images.length;
  const width = product.imageWidth * 2;
  const height = product.imageHeight * 2;
  const caption = [product.category, product.line].filter(Boolean).join(" · ");
  return (
    <div className="relative flex h-[480px] items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#161616_0%,#0e0e0e_70%)] text-on-dark md:h-[760px]">
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(254,197,2,0.22)_0%,rgba(254,197,2,0)_66%)]"
      />
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 size-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-yellow/30"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-[90px] left-1/2 hidden h-[60px] w-[380px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0)_70%)] md:block"
      />
      <div
        // Leave room for the thumbnails on a phone.
        className={cn("relative max-w-[560px]", count > 1 ? "w-[60%] md:w-[70%]" : "w-[70%]")}
        style={{ maxWidth: width, aspectRatio: `${width} / ${height}` }}
      >
        <Image
          src={product.images[active]}
          alt={count > 1 ? `Astaad ${product.name}, photo ${active + 1} of ${count}` : `Astaad ${product.name}`}
          fill
          preload={active === 0}
          sizes={`${width}px`}
          className="object-contain drop-shadow-[0_48px_56px_rgba(0,0,0,0.8)]"
        />
      </div>
      <PhotoThumbnails images={product.images} active={active} onSelect={setActive} />
      <p className="type-eyebrow absolute bottom-4 left-4 text-on-dark-subtle md:bottom-9 md:left-10">
        {count > 1 ? `${caption} · ${active + 1} of ${count}` : caption}
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
