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
}

/** The closing black band: crest, a two-line display headline, one or two buttons. */
export function FinalCta({
  label,
  title,
  highlight,
  primary,
  secondary,
  crestSize = 72,
  titleClassName,
}: FinalCtaProps) {
  return (
    <section
      aria-label={label}
      className="relative overflow-hidden border-t border-surface-dark-raised bg-surface-dark text-on-dark"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-180px] left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(254,197,2,0.22)_0%,rgba(254,197,2,0)_66%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-60px] left-1/2 size-[500px] -translate-x-1/2 rounded-full border border-brand-yellow/30"
      />
      <div className="site-shell relative flex min-h-[440px] flex-col items-center justify-center gap-7 py-16 text-center md:min-h-[480px]">
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
        <div className="flex flex-wrap items-center justify-center gap-4">
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
