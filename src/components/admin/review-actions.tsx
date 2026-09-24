"use client";

import { startTransition, useActionState, useRef, useState, type FormEvent } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Eye, EyeOff, LoaderCircle, Trash2 } from "lucide-react";

import type { ReviewStatus } from "@/db/schema";
import { changeReviewStatus, removeReview, type ReviewActionState } from "@/lib/reviews/admin-actions";
import { cn } from "@/lib/utils";

import { ErrorLine } from "./product-row";
import { Sheet } from "./restock";
import { safeAction } from "./safe-action";
import { BUTTON_BASE, BUTTON_PRIMARY, BUTTON_SECONDARY } from "./styles";

const safeChange = safeAction(changeReviewStatus);
const safeRemove = safeAction(removeReview);

/** A message for the editor's toast. */
export interface ReviewToast {
  message: string;
  at: number;
}

function Pending({ label }: { label: string }) {
  return (
    <>
      <LoaderCircle className="animate-spin" strokeWidth={2} aria-hidden="true" />
      {label}
    </>
  );
}

/** What the status block says under the status word. */
function statusNote(status: ReviewStatus, isPrivate: boolean, publishedOn: string | null): string {
  if (isPrivate) {
    return status === "new"
      ? "Private feedback: the customer asked for it to stay with you, so it can't go on the site."
      : "Private feedback you've read. It can't go on the site.";
  }
  if (status === "new") return "Not on the site until you publish it.";
  if (status === "published") return publishedOn ? `On the site since ${publishedOn}.` : "On the site.";
  return "Not on the site. Publish it to show it again.";
}

/**
 * Publish, Hide or (for private feedback) Mark as read. Each posts at once and
 * reports through `onDone` for the editor's toast. Unsaved edits aren't
 * part of it, so the admin is asked first when there are any.
 */
export function ReviewStatusActions({
  reviewId,
  status,
  isPrivate,
  publishedOn,
  dirty,
  onDone,
}: {
  reviewId: string;
  status: ReviewStatus;
  isPrivate: boolean;
  /** "24 Sep", when it was first published. */
  publishedOn: string | null;
  dirty: boolean;
  onDone: (toast: ReviewToast) => void;
}) {
  const [target, setTarget] = useState<"published" | "hidden" | null>(null);
  const [state, change, changing] = useActionState(async (previous: ReviewActionState, form: FormData) => {
    const result = await safeChange(previous, form);
    const { saved, at } = result;
    if (saved) onDone({ message: saved, at: at ?? Date.now() });
    return result;
  }, {});

  function submit(event: FormEvent<HTMLFormElement>, next: "published" | "hidden") {
    event.preventDefault();
    if (dirty && !window.confirm("You have unsaved changes. Save them first to include them. Go on without them?")) return;
    const data = new FormData(event.currentTarget);
    setTarget(next);
    startTransition(() => change(data));
  }

  const canPublish = !isPrivate && status !== "published";
  const canHide = status !== "hidden";
  const hideLabel = isPrivate ? "Mark as read" : status === "published" ? "Hide from site" : "Hide";

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] leading-[18px] text-ink-muted">{statusNote(status, isPrivate, publishedOn)}</p>
      {(canPublish || canHide) && (
        <div className="flex flex-wrap gap-2">
          {canPublish && (
            <form onSubmit={(event) => submit(event, "published")}>
              <input type="hidden" name="reviewId" value={reviewId} />
              <input type="hidden" name="status" value="published" />
              <button type="submit" disabled={changing} className={status === "new" ? BUTTON_PRIMARY : BUTTON_SECONDARY}>
                {changing && target === "published" ? (
                  <Pending label="Publishing…" />
                ) : (
                  <>
                    <Eye strokeWidth={1.5} aria-hidden="true" />
                    Publish
                  </>
                )}
              </button>
            </form>
          )}
          {canHide && (
            <form onSubmit={(event) => submit(event, "hidden")}>
              <input type="hidden" name="reviewId" value={reviewId} />
              <input type="hidden" name="status" value="hidden" />
              <button type="submit" disabled={changing} className={isPrivate ? BUTTON_PRIMARY : BUTTON_SECONDARY}>
                {changing && target === "hidden" ? (
                  <Pending label="Saving…" />
                ) : (
                  <>
                    {!isPrivate && <EyeOff strokeWidth={1.5} aria-hidden="true" />}
                    {hideLabel}
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}
      <ErrorLine message={changing ? undefined : state.error} />
    </div>
  );
}

/**
 * Delete review, confirmed in a sheet first. It goes back to the list, which
 * says "Review deleted". `fallbackFocus` takes focus if the button is gone.
 */
export function ReviewDelete({ reviewId, fallbackFocus }: { reviewId: string; fallbackFocus: () => HTMLElement | null }) {
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [state, remove, removing] = useActionState(safeRemove, {});

  // Dispatched by hand, so a failure keeps the sheet as it was.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => remove(data));
  }

  const error = removing || (state.at ?? 0) < openedAt ? undefined : state.error;

  return (
    <section aria-label="Delete review" className="flex border-t border-border pt-5 pb-6">
      <button
        ref={trigger}
        type="button"
        onClick={() => {
          setOpenedAt(Date.now());
          setOpen(true);
        }}
        className={cn(BUTTON_BASE, "-ml-3 px-3 text-danger hover:bg-surface-sunken")}
      >
        <Trash2 strokeWidth={1.5} aria-hidden="true" />
        Delete review
      </button>

      <Sheet
        open={open}
        onClose={() => {
          if (!removing) setOpen(false);
        }}
        initialFocus={() => titleRef.current ?? true}
        finalFocus={() => (trigger.current?.isConnected ? trigger.current : (fallbackFocus() ?? true))}
      >
        <form onSubmit={submit} className="flex flex-col">
          <input type="hidden" name="reviewId" value={reviewId} />
          <Dialog.Title ref={titleRef} tabIndex={-1} className="text-lg leading-6 font-semibold focus:outline-none">
            Delete this review?
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-[13px] leading-[18px] text-ink-muted">
            It&apos;s removed for good, with its photo. To take it off the site but keep it, hide it instead.
          </Dialog.Description>
          <ErrorLine message={error} className="mt-4" />
          <button
            type="submit"
            disabled={removing}
            className={cn(BUTTON_BASE, "mt-5 min-h-12 bg-danger text-on-dark hover:bg-danger/90")}
          >
            {removing ? <Pending label="Deleting…" /> : "Delete review"}
          </button>
          <Dialog.Close disabled={removing} className={cn(BUTTON_SECONDARY, "mt-2 min-h-12")}>
            Cancel
          </Dialog.Close>
        </form>
      </Sheet>
    </section>
  );
}
