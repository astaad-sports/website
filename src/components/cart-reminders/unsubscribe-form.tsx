"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { stopCartReminders } from "@/lib/cart-reminders/actions";

/**
 * "Stop cart reminders": a button rather than the link itself, so a mail
 * scanner opening the link never unsubscribes anyone.
 */
export function UnsubscribeForm({ id }: { id: string }) {
  const [state, stop, pending] = useActionState(stopCartReminders, {});

  if (state.done) {
    return (
      <div role="status" className="flex flex-col gap-4">
        <p className="type-body-lg flex items-start gap-2">
          <CircleCheck className="mt-1 size-5 shrink-0 text-success" strokeWidth={1.75} aria-hidden="true" />
          Done. We won’t send you cart reminders again.
        </p>
        <p className="type-body text-ink-muted">Emails about orders you place still come as usual.</p>
        <Link href="/" className="type-body-sm inline-flex min-h-11 items-center self-start font-semibold underline underline-offset-4">
          Back to the shop
        </Link>
      </div>
    );
  }

  return (
    <form action={stop} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      {state.error && (
        <p role="alert" className="type-body-sm flex items-start gap-1.5 text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto sm:self-start">
        {pending ? (
          <>
            <LoaderCircle className="animate-spin" strokeWidth={2} aria-hidden="true" />
            Stopping…
          </>
        ) : (
          "Stop cart reminders"
        )}
      </Button>
    </form>
  );
}
