"use client";

import { startTransition, useActionState, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Dialog } from "@base-ui/react/dialog";
import { CircleStop, Copy, LoaderCircle, Pause, Play, Trash2 } from "lucide-react";

import { endOffer, pauseOffer, removeOffer, type OfferActionState } from "@/lib/offers/admin-actions";
import { cn } from "@/lib/utils";

import { ErrorLine } from "./product-row";
import { Sheet } from "./restock";
import { safeAction } from "./safe-action";
import { BUTTON_BASE, BUTTON_PRIMARY, BUTTON_SECONDARY } from "./styles";

const safeEnd = safeAction(endOffer);
const safeRemove = safeAction(removeOffer);
const safePause = safeAction(pauseOffer);

/** A message for the page's toast. */
export interface OfferToast {
  message: string;
  at: number;
}

type Confirming = "end" | "pause" | "resume" | "delete" | null;

const SHEET: Record<Exclude<Confirming, null>, { title: (name: string) => string; detail: string }> = {
  end: {
    title: (name) => `End ${name} now?`,
    detail: "It stops right away and prices go back to normal. It moves to Expired.",
  },
  pause: {
    title: (name) => `Pause ${name}?`,
    detail:
      "Prices go back to normal, its code stops working and it leaves the offer bar, until you resume it. Its dates stay as they are.",
  },
  resume: {
    title: (name) => `Resume ${name}?`,
    detail: "It takes money off again, and shows on the site if it's set to, from now until its end date.",
  },
  delete: {
    title: (name) => `Delete ${name}?`,
    detail: "It's removed for good. Orders placed with it keep their discount.",
  },
};

function Pending({ label }: { label: string }) {
  return (
    <>
      <LoaderCircle className="animate-spin" strokeWidth={2} aria-hidden="true" />
      {label}
    </>
  );
}

/**
 * Pause or Resume (until the offer ends), End offer now (only while it runs),
 * Run again and Delete offer. All but Run again are confirmed in a sheet
 * first. Pausing, resuming and ending stay on the page with a toast
 * (`onEnded`); deleting goes back to the list, which says "Offer deleted".
 * Run again opens Create offer filled in from this one. `onEnding` runs as
 * the admin confirms ending, so unsaved edits (which the sheet warns about)
 * give way to the ended offer. `fallbackFocus` takes focus when the button
 * that opened the sheet disappears.
 */
export function OfferLifecycle({
  offerId,
  name,
  active,
  paused,
  ended,
  dirty,
  onEnding,
  onEnded,
  fallbackFocus,
}: {
  offerId: string;
  name: string;
  /** Within its dates (paused or not). */
  active: boolean;
  paused: boolean;
  /** Past its end date. */
  ended: boolean;
  dirty: boolean;
  onEnding: () => void;
  onEnded: (toast: OfferToast) => void;
  fallbackFocus: () => HTMLElement | null;
}) {
  const [confirming, setConfirming] = useState<Confirming>(null);
  // What the sheet shows while it slides out, so its text does not change mid-close.
  const [shown, setShown] = useState<Exclude<Confirming, null>>("end");
  // Errors from before the sheet last opened are old news.
  const [openedAt, setOpenedAt] = useState(0);
  // Whether ending throws away edits, as it was when the sheet opened.
  const [discards, setDiscards] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const [endState, end, ending] = useActionState(async (previous: OfferActionState, form: FormData) => {
    const result = await safeEnd(previous, form);
    const { saved, at } = result;
    if (saved) {
      // End offer now goes away with the offer's end, so focus goes to `fallbackFocus`.
      trigger.current = null;
      startTransition(() => {
        setConfirming(null);
        onEnded({ message: saved, at: at ?? Date.now() });
      });
    }
    return result;
  }, {});
  const [removeState, remove, removing] = useActionState(safeRemove, {});
  const [pauseState, pause, pausing] = useActionState(async (previous: OfferActionState, form: FormData) => {
    const result = await safePause(previous, form);
    const { saved, at } = result;
    if (saved) {
      // Pause and Resume swap places, so focus goes to `fallbackFocus`.
      trigger.current = null;
      startTransition(() => {
        setConfirming(null);
        onEnded({ message: saved, at: at ?? Date.now() });
      });
    }
    return result;
  }, {});

  function open(kind: Exclude<Confirming, null>, button: HTMLElement) {
    trigger.current = button;
    setShown(kind);
    setOpenedAt(Date.now());
    setDiscards(dirty);
    setConfirming(kind);
  }

  // Dispatched by hand, like the offer form, so a failure keeps the sheet as it was.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (shown === "end") {
      onEnding();
      startTransition(() => end(data));
    } else if (shown === "pause" || shown === "resume") {
      startTransition(() => pause(data));
    } else {
      startTransition(() => remove(data));
    }
  }

  const busy = ending || removing || pausing;
  const result = shown === "end" ? endState : shown === "delete" ? removeState : pauseState;
  const error = busy || (result.at ?? 0) < openedAt ? undefined : result.error;

  return (
    <section aria-label="Offer actions" className="flex flex-wrap items-center gap-2 border-t border-border pt-5 pb-6">
      {!ended && (
        <button
          type="button"
          onClick={(event) => open(paused ? "resume" : "pause", event.currentTarget)}
          className={BUTTON_SECONDARY}
        >
          {paused ? <Play strokeWidth={1.5} aria-hidden="true" /> : <Pause strokeWidth={1.5} aria-hidden="true" />}
          {paused ? "Resume offer" : "Pause offer"}
        </button>
      )}
      {active && (
        <button type="button" onClick={(event) => open("end", event.currentTarget)} className={BUTTON_SECONDARY}>
          <CircleStop strokeWidth={1.5} aria-hidden="true" />
          End offer now
        </button>
      )}
      <Link href={`/admin/offers/new?from=${offerId}`} className={BUTTON_SECONDARY}>
        <Copy strokeWidth={1.5} aria-hidden="true" />
        Run again
      </Link>
      <button
        type="button"
        onClick={(event) => open("delete", event.currentTarget)}
        className={cn(BUTTON_BASE, "px-3 text-danger hover:bg-surface-sunken")}
      >
        <Trash2 strokeWidth={1.5} aria-hidden="true" />
        Delete offer
      </button>

      <Sheet
        open={confirming !== null}
        onClose={() => {
          if (!busy) setConfirming(null);
        }}
        // The question first, not the button that ends or deletes.
        initialFocus={() => titleRef.current ?? true}
        finalFocus={() => (trigger.current?.isConnected ? trigger.current : (fallbackFocus() ?? true))}
      >
        <form onSubmit={submit} className="flex flex-col">
          <input type="hidden" name="offerId" value={offerId} />
          {(shown === "pause" || shown === "resume") && (
            <input type="hidden" name="paused" value={shown === "pause" ? "true" : "false"} />
          )}
          <Dialog.Title ref={titleRef} tabIndex={-1} className="text-lg leading-6 font-semibold break-words focus:outline-none">
            {SHEET[shown].title(name)}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-[13px] leading-[18px] text-ink-muted">
            {SHEET[shown].detail}
            {shown === "end" && discards && " Your unsaved changes are discarded."}
          </Dialog.Description>
          <ErrorLine message={error} className="mt-4" />
          {shown === "end" ? (
            <button type="submit" disabled={busy} className={cn(BUTTON_PRIMARY, "mt-5 min-h-12")}>
              {ending ? <Pending label="Ending…" /> : "End offer"}
            </button>
          ) : shown === "pause" || shown === "resume" ? (
            <button type="submit" disabled={busy} className={cn(BUTTON_PRIMARY, "mt-5 min-h-12")}>
              {pausing ? (
                <Pending label={shown === "pause" ? "Pausing…" : "Resuming…"} />
              ) : shown === "pause" ? (
                "Pause offer"
              ) : (
                "Resume offer"
              )}
            </button>
          ) : (
            <button
              type="submit"
              disabled={busy}
              className={cn(BUTTON_BASE, "mt-5 min-h-12 bg-danger text-on-dark hover:bg-danger/90")}
            >
              {removing ? <Pending label="Deleting…" /> : "Delete offer"}
            </button>
          )}
          <Dialog.Close disabled={busy} className={cn(BUTTON_SECONDARY, "mt-2 min-h-12")}>
            Cancel
          </Dialog.Close>
        </form>
      </Sheet>
    </section>
  );
}
