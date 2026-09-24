"use client";

import { startTransition, useActionState, useRef, useState, type FormEvent } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { CircleStop, LoaderCircle, Trash2 } from "lucide-react";

import { endOffer, removeOffer, type OfferActionState } from "@/lib/offers/admin-actions";
import { cn } from "@/lib/utils";

import { ErrorLine } from "./product-row";
import { Sheet } from "./restock";
import { safeAction } from "./safe-action";
import { BUTTON_BASE, BUTTON_PRIMARY, BUTTON_SECONDARY } from "./styles";

const safeEnd = safeAction(endOffer);
const safeRemove = safeAction(removeOffer);

/** A message for the page's toast. */
export interface OfferToast {
  message: string;
  at: number;
}

type Confirming = "end" | "delete" | null;

function Pending({ label }: { label: string }) {
  return (
    <>
      <LoaderCircle className="animate-spin" strokeWidth={2} aria-hidden="true" />
      {label}
    </>
  );
}

/**
 * End offer now (only while it runs) and Delete offer, each confirmed in a
 * sheet first. Ending stays on the page with "Offer ended"; deleting goes
 * back to the list, which says "Offer deleted". `onEnding` runs as the admin
 * confirms, so unsaved edits (which the sheet warns about) give way to the
 * ended offer. `fallbackFocus` takes focus when End offer now disappears.
 */
export function OfferLifecycle({
  offerId,
  name,
  active,
  dirty,
  onEnding,
  onEnded,
  fallbackFocus,
}: {
  offerId: string;
  name: string;
  active: boolean;
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
    } else {
      startTransition(() => remove(data));
    }
  }

  const busy = ending || removing;
  const result = shown === "end" ? endState : removeState;
  const error = busy || (result.at ?? 0) < openedAt ? undefined : result.error;

  return (
    <section aria-label="Offer actions" className="flex flex-wrap items-center gap-2 border-t border-border pt-5 pb-6">
      {active && (
        <button type="button" onClick={(event) => open("end", event.currentTarget)} className={BUTTON_SECONDARY}>
          <CircleStop strokeWidth={1.5} aria-hidden="true" />
          End offer now
        </button>
      )}
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
          <Dialog.Title ref={titleRef} tabIndex={-1} className="text-lg leading-6 font-semibold break-words focus:outline-none">
            {shown === "end" ? `End ${name} now?` : `Delete ${name}?`}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-[13px] leading-[18px] text-ink-muted">
            {shown === "end"
              ? "It stops right away and prices go back to normal. It moves to Expired."
              : "It's removed for good. Orders placed with it keep their discount."}
            {shown === "end" && discards && " Your unsaved changes are discarded."}
          </Dialog.Description>
          <ErrorLine message={error} className="mt-4" />
          {shown === "end" ? (
            <button type="submit" disabled={busy} className={cn(BUTTON_PRIMARY, "mt-5 min-h-12")}>
              {ending ? <Pending label="Ending…" /> : "End offer"}
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
