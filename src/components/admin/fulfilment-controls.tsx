"use client";

import { useActionState, useOptimistic, useState, type FormEvent } from "react";
import { Check, CircleAlert, Truck } from "lucide-react";

import { changeStatus, type AdminActionState } from "@/lib/orders/admin-actions";
import {
  ADMIN_STATUS_LABEL,
  FULFILMENT_STEPS,
  isFulfilmentStatus,
  needsTracking,
  nextStep,
  stepIndex,
  type FulfilmentStatus,
} from "@/lib/orders/fulfilment";
import { cn } from "@/lib/utils";

import { BUTTON_PRIMARY } from "./styles";
import { Toast } from "./toast";

/** The tracking ID field; status buttons send the admin here when an order needs one first. */
export const TRACKING_FIELD_ID = "tracking-id";

const NEEDS_TRACKING = "Add the tracking ID first. Saving it marks the order as shipped.";

function focusTrackingField() {
  const field = document.getElementById(TRACKING_FIELD_ID);
  field?.scrollIntoView({ behavior: "smooth", block: "center" });
  field?.focus({ preventScroll: true });
}

/** Which step the submit button asked for, from the form's submitter. */
function requestedStep(event: FormEvent<HTMLFormElement>): FulfilmentStatus | null {
  const submitter = (event.nativeEvent as SubmitEvent).submitter;
  const value = submitter instanceof HTMLButtonElement ? submitter.value : null;
  return isFulfilmentStatus(value) ? value : null;
}

function ErrorMessage({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-1.5 text-[13px] leading-[18px] text-danger">
      <CircleAlert className="mt-px size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      {message}
    </p>
  );
}

/**
 * Pending → Confirmed → Packed → Shipped → Delivered as five buttons. One tap
 * moves the order to that step, forwards or back; the change shows at once.
 */
export function StatusStepper({
  orderId,
  status,
  hasTracking,
}: {
  orderId: string;
  status: FulfilmentStatus;
  hasTracking: boolean;
}) {
  const [shown, showStatus] = useOptimistic(status);
  const [localError, setLocalError] = useState<string | null>(null);
  const [state, action, pending] = useActionState(async (previous: AdminActionState, form: FormData) => {
    const to = form.get("to");
    if (isFulfilmentStatus(to)) showStatus(to);
    return changeStatus(previous, form);
  }, {});

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const to = requestedStep(event);
    if (to && needsTracking(to) && !hasTracking) {
      event.preventDefault();
      setLocalError(NEEDS_TRACKING);
      focusTrackingField();
      return;
    }
    setLocalError(null);
  }

  const current = stepIndex(shown);

  return (
    <form action={action} onSubmit={onSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="from" value={status} />
      <ol className="relative grid grid-cols-5">
        <span aria-hidden="true" className="absolute top-[17px] right-[10%] left-[10%] h-0.5 bg-border" />
        <span
          aria-hidden="true"
          className="absolute top-[17px] left-[10%] h-0.5 bg-foreground transition-[width]"
          style={{ width: `${current * 20}%` }}
        />
        {FULFILMENT_STEPS.map((step, index) => {
          const done = index < current;
          const here = index === current;
          return (
            <li key={step} className="relative flex justify-center">
              <button
                type="submit"
                name="to"
                value={step}
                disabled={pending}
                aria-current={here ? "step" : undefined}
                className={cn(
                  "flex min-h-[58px] w-full min-w-0 cursor-pointer flex-col items-center gap-2 rounded-sm px-0 py-2 disabled:cursor-progress",
                  done || here ? "text-foreground" : "text-ink-muted"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full",
                    done && "border-2 border-foreground bg-foreground text-surface-raised",
                    here && "border-2 border-foreground bg-brand-yellow",
                    !done && !here && "border-[1.5px] border-ink-subtle bg-surface-raised"
                  )}
                >
                  {done && <Check className="size-3" strokeWidth={3} />}
                </span>
                <span className={cn("text-[11px] leading-[14px] whitespace-nowrap", here ? "font-semibold" : "font-medium")}>
                  {ADMIN_STATUS_LABEL[step]}
                  <span className="sr-only">{here ? ", current step" : done ? ", done" : ""}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="text-[13px] leading-[18px] text-ink-muted">Select a step to change the status.</p>
      <ErrorMessage message={(hasTracking ? null : localError) ?? state.error} />
      <Toast message={state.saved} at={state.at} />
    </form>
  );
}

/**
 * The one button that moves the order on. On phones it sits in a bar fixed to
 * the bottom of the screen; on desktop it sits under the tracking form.
 * Shipping needs a tracking ID, so until there is one it points to the field.
 */
export function NextStepButton({
  orderId,
  status,
  hasTracking,
  placement,
}: {
  orderId: string;
  status: FulfilmentStatus;
  hasTracking: boolean;
  placement: "bar" | "inline";
}) {
  const [state, action, pending] = useActionState(changeStatus, {});
  const next = nextStep(status);
  const pointsToTracking = next !== null && needsTracking(next.target) && !hasTracking;

  // One form and one button whatever the state, so keyboard focus stays put when the status changes.
  const control = (
    <form action={action}>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="from" value={status} />
      {next && <input type="hidden" name="to" value={next.target} />}
      <button
        type={next && !pointsToTracking ? "submit" : "button"}
        onClick={pointsToTracking ? focusTrackingField : undefined}
        disabled={!next || pending}
        className={cn(
          BUTTON_PRIMARY,
          "min-h-12 w-full",
          !next && "bg-surface-sunken text-ink-muted disabled:cursor-default disabled:opacity-100"
        )}
      >
        {!next ? (
          <>
            <Check aria-hidden="true" />
            Delivered
          </>
        ) : pointsToTracking ? (
          <>
            <Truck aria-hidden="true" />
            Add tracking ID
          </>
        ) : pending ? (
          "Saving…"
        ) : (
          next.label
        )}
      </button>
    </form>
  );

  const body = (
    <>
      <ErrorMessage message={state.error} />
      {control}
      <Toast message={state.saved} at={state.at} />
    </>
  );

  if (placement === "inline") {
    return <div className="hidden flex-col gap-2 lg:flex">{body}</div>;
  }
  return (
    <>
      <div aria-hidden="true" className="h-20 shrink-0 lg:hidden" />
      <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-2 border-t border-border bg-surface-raised px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] lg:hidden">
        {body}
      </div>
    </>
  );
}

