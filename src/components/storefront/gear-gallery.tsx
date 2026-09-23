import Image from "next/image";

import { type GearProduct } from "@/lib/catalogue";

/** The dark product stage for gear: the cut-out under the floodlight glow. */
export function GearGallery({ product }: { product: GearProduct }) {
  const width = product.imageWidth * 2;
  const height = product.imageHeight * 2;
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
        className="relative w-[70%] max-w-[560px]"
        style={{ maxWidth: width, aspectRatio: `${width} / ${height}` }}
      >
        <Image
          src={product.image}
          alt={`Astaad ${product.name}`}
          fill
          priority
          sizes={`${width}px`}
          className="object-contain drop-shadow-[0_48px_56px_rgba(0,0,0,0.8)]"
        />
      </div>
      <p className="type-eyebrow absolute bottom-4 left-4 text-on-dark-subtle md:bottom-9 md:left-10">
        {product.category} · {product.line}
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
