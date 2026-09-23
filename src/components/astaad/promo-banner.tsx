import Image, { type StaticImageData } from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Icon } from "./icon";

export interface PromoBannerProps {
  /** Tracked uppercase eyebrow — "Gear up". */
  eyebrow?: string;
  /** The `display-md` title — "Like a". */
  title: string;
  /** Emphasised word, `brand-yellow` on dark — "Pro". */
  emphasis?: string;
  cta?: string;
  href?: string;
  /** Three sit in a row under the product grid: dark / light / dark. */
  tone?: "dark" | "light";
  /** Dark, floodlit product photography for the right 40%. */
  image?: string | StaticImageData;
  imageAlt?: string;
  className?: string;
}

/**
 * A `rounded-lg` campaign tile: eyebrow, an uppercase `display-md` title with
 * an optional yellow emphasis word, and a small CTA with an arrow. Dark tiles
 * use the outline button; the light tile uses the primary.
 */
export function PromoBanner({
  eyebrow,
  title,
  emphasis,
  cta = "Shop Now",
  href,
  tone = "dark",
  image,
  imageAlt = "",
  className,
}: PromoBannerProps) {
  const light = tone === "light";
  return (
    <section
      className={cn(
        "relative flex min-h-[120px] w-full flex-col justify-center gap-2 overflow-hidden rounded-lg px-6 py-5",
        light ? "bg-surface-sunken text-foreground" : "bg-surface-dark text-on-dark",
        className
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 right-0 w-2/5",
          light ? "bg-border" : "bg-surface-dark-raised"
        )}
      >
        {image && (
          <Image
            src={image}
            alt={imageAlt}
            fill
            sizes="(min-width: 768px) 20vw, 40vw"
            className="object-cover"
          />
        )}
      </div>
      {eyebrow && (
        <span className="type-eyebrow relative opacity-85">{eyebrow}</span>
      )}
      <h3 className="type-display-md relative max-w-[60%]">
        {title}
        {emphasis && (
          <>
            {" "}
            <em className={light ? "text-foreground" : "text-brand-yellow"}>
              {emphasis}
            </em>
          </>
        )}
      </h3>
      <Button
        variant={light ? "default" : "secondary"}
        size="sm"
        render={href ? <Link href={href} /> : undefined}
        nativeButton={!href}
        className={cn(
          "relative mt-1 self-start",
          !light && "border-on-dark text-on-dark hover:bg-surface-dark-raised"
        )}
      >
        {cta}
        <Icon name="arrow-right" className="size-4" />
      </Button>
    </section>
  );
}
