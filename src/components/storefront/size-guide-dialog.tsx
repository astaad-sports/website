"use client";

import type { ReactElement } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Eyebrow } from "./eyebrow";
import { SizeGuideTable } from "./size-guide-table";

/** The English Willow size guide in a modal; pass the opening button as `trigger`. */
export function SizeGuideDialog({ trigger }: { trigger: ReactElement }) {
  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100vh-2rem)] flex-col gap-6 overflow-y-auto rounded-xs bg-surface-raised p-6 text-foreground shadow-[0_32px_80px_rgba(0,0,0,0.5)] ring-0 sm:max-w-[800px] md:p-10"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <Eyebrow>English Willow</Eyebrow>
            <DialogTitle className="text-[32px] leading-10 font-bold tracking-[-0.02em]">
              Size guide
            </DialogTitle>
            <DialogDescription className="text-sm leading-5 text-ink-muted">
              Stand tall with your arms by your side. The bat&apos;s handle should reach your
              wrist.
            </DialogDescription>
          </div>
          <DialogClose
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close size guide"
                className="size-11 shrink-0 rounded-full bg-surface-sunken"
              />
            }
          >
            <X className="size-5" strokeWidth={2} aria-hidden="true" />
          </DialogClose>
        </div>
        <SizeGuideTable boxed />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-[13px] leading-[18px] text-ink-muted">
            Between two sizes? Choose the smaller one for control.
          </span>
          <DialogClose
            render={
              <Button
                size="sm"
                className="h-11 rounded-xs px-6 text-[13px] font-bold tracking-[0.1em] uppercase"
              />
            }
          >
            Done
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
