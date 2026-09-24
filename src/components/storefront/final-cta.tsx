import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Crest } from "@/components/astaad";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FinalCtaProps {
  label: string;
  title: string;
  highlight: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
  crestSize?: number;
  titleClassName?: string;
  /** A photograph dimmed behind the band. */
  backdrop?: string;
}

/** The closing black band: crest, a two-line display headline, one or two buttons (full width, stacked, on phones). */
export function FinalCta({
  label,
  title,
  highlight,
  primary,
  secondary,
  crestSize = 72,
  titleClassName,
  backdrop,
}: FinalCtaProps) {
  return (
    <section
      aria-label={label}
      className="relative overflow-hidden border-t border-surface-dark-raised bg-surface-dark text-on-dark"
    >
      {backdrop && (
        <>
          <Image src={backdrop} alt="" fill sizes="100vw" className="object-cover object-[50%_60%] opacity-30" />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,14,14,0.55)_0%,rgba(14,14,14,0.35)_50%,#0e0e0e_100%)]"
          />
        </>
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-180px] left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(254,197,2,0.22)_0%,rgba(254,197,2,0)_66%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-60px] left-1/2 size-[500px] -translate-x-1/2 rounded-full border border-brand-yellow/30"
      />
      <div className="site-shell relative flex min-h-[400px] flex-col items-center justify-center gap-6 py-12 text-center md:min-h-[480px] md:gap-7 md:py-16">
        <Crest size={crestSize} />
        <h2
          className={cn(
            "type-display text-[44px] leading-[0.92] tracking-[-0.02em] md:text-[72px]",
            titleClassName
          )}
        >
          {title}
          <br />
          <span className="text-brand-yellow">{highlight}</span>
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-4 max-md:w-full max-md:flex-col max-md:items-stretch max-md:gap-2.5">
          <Button
            size="lg"
            render={<Link href={primary.href} />}
            nativeButton={false}
            className="h-14 rounded-xs px-9 text-[15px] font-bold tracking-[0.08em] uppercase"
          >
            {primary.label}
            <ArrowRight className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />
          </Button>
          {secondary && (
            <Button
              size="lg"
              variant="secondary"
              render={<Link href={secondary.href} />}
              nativeButton={false}
              className="h-14 rounded-xs border border-border-on-dark px-8 text-[15px] text-on-dark hover:border-on-dark hover:bg-transparent"
            >
              {secondary.label}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
