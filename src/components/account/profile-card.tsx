"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile, type ProfileState } from "@/lib/account/actions";
import { mobileAsTyped, PROFILE_LIMITS, type ProfileFieldErrors } from "@/lib/account/model";
import { formatMobile } from "@/lib/format";

export interface ProfileDetails {
  name: string | null;
  phone: string | null;
  email: string | null;
  emailVerified: boolean;
  /** "September 2026" */
  memberSince: string;
}

const ROW = "flex flex-col gap-1 border-b border-border px-6 py-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-6";
const TERM = "type-body-sm text-ink-muted sm:w-32 sm:shrink-0";

/** The name and number fields. They hold what is typed, so a save that is turned down leaves it in place. */
function ProfileFields({
  id,
  name: savedName,
  phone: savedPhone,
  fieldErrors,
}: {
  id: string;
  name: string | null;
  phone: string | null;
  fieldErrors: ProfileFieldErrors;
}) {
  const [name, setName] = useState(savedName ?? "");
  const [phone, setPhone] = useState(savedPhone ? mobileAsTyped(savedPhone) : "");
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-name`}>Full name</Label>
        <Input
          id={`${id}-name`}
          name="name"
          autoComplete="name"
          maxLength={PROFILE_LIMITS.name}
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          autoFocus
          aria-invalid={fieldErrors.name ? true : undefined}
          aria-describedby={fieldErrors.name ? `${id}-name-error` : undefined}
        />
        {fieldErrors.name && (
          <p id={`${id}-name-error`} className="type-body-sm text-danger">
            {fieldErrors.name}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-phone`}>
          Mobile number
          <span className="font-normal text-ink-muted">(optional)</span>
        </Label>
        <Input
          id={`${id}-phone`}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="98765 43210"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          aria-invalid={fieldErrors.phone ? true : undefined}
          aria-describedby={fieldErrors.phone ? `${id}-phone-error` : `${id}-phone-help`}
        />
        {fieldErrors.phone ? (
          <p id={`${id}-phone-error`} className="type-body-sm text-danger">
            {fieldErrors.phone}
          </p>
        ) : (
          <p id={`${id}-phone-help`} className="type-body-sm text-ink-muted">
            Checkout starts with this name and number.
          </p>
        )}
      </div>
    </>
  );
}

/**
 * "Your details": name, email, mobile number and when the customer joined.
 * Edit swaps the name and number for fields; the email belongs to the
 * sign-in, so it only shows.
 */
export function ProfileCard({ details }: { details: ProfileDetails }) {
  const id = useId();
  const [state, save, pending] = useActionState<ProfileState, FormData>(updateProfile, {});
  // The result on show when Edit was last pressed. The form stays open until
  // a later result says the details were saved, so a save closes it by itself.
  const [openedAt, setOpenedAt] = useState<ProfileState | null>(null);
  const [open, setOpen] = useState(false);
  const editing = open && (state === openedAt || !state.saved);
  const editRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);

  // Closing the form, saved or cancelled, hands the keyboard back to Edit.
  useEffect(() => {
    if (wasEditing.current && !editing) editRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  const fieldErrors = pending ? {} : (state.fieldErrors ?? {});
  const error = pending ? undefined : state.error;
  // The page refreshes after a save; until it lands, show what was saved.
  const name = state.saved?.name ?? details.name;
  const phone = state.saved ? state.saved.phone : details.phone;
  // "Details saved" goes once Edit is pressed again.
  const justSaved = Boolean(state.saved) && state !== openedAt;

  function edit() {
    setOpenedAt(state);
    setOpen(true);
  }

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="flex flex-col rounded-md border border-border bg-surface-raised shadow-card"
    >
      <div className="flex min-h-[60px] items-center justify-between gap-4 border-b border-border px-6 py-2">
        <h2 id={`${id}-title`} className="type-heading-sm">
          Your details
        </h2>
        {!editing && (
          <Button ref={editRef} type="button" variant="link" size="sm" className="px-0" onClick={edit}>
            Edit<span className="sr-only"> your details</span>
          </Button>
        )}
      </div>

      {editing ? (
        <form action={save} noValidate className="flex flex-col gap-5 px-6 py-5" aria-busy={pending}>
          <ProfileFields id={id} name={name} phone={phone} fieldErrors={fieldErrors} />
          {error && (
            <p role="alert" className="type-body-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <LoaderCircle className="animate-spin" strokeWidth={2} aria-hidden="true" />
                  Saving…
                </>
              ) : (
                "Save details"
              )}
            </Button>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <dl className="flex flex-col">
          <div className={ROW}>
            <dt className={TERM}>Name</dt>
            <dd className="type-body">{name ?? <span className="text-ink-muted">Not added</span>}</dd>
          </div>
          <div className={ROW}>
            <dt className={TERM}>Email</dt>
            <dd className="type-body flex flex-wrap items-center gap-x-3 break-all">
              {details.email ?? <span className="text-ink-muted">Not added</span>}
              {details.email && (
                <span
                  className={`type-body-sm font-semibold ${details.emailVerified ? "text-success" : "text-ink-muted"}`}
                >
                  {details.emailVerified ? "Verified" : "Not verified"}
                </span>
              )}
            </dd>
          </div>
          <div className={ROW}>
            <dt className={TERM}>Mobile</dt>
            <dd className="type-body tabular-nums">
              {phone ? formatMobile(phone) : <span className="text-ink-muted">Not added</span>}
            </dd>
          </div>
          <div className={ROW}>
            <dt className={TERM}>Member since</dt>
            <dd className="type-body">{details.memberSince}</dd>
          </div>
        </dl>
      )}
      {justSaved && (
        <p role="status" className="border-t border-border px-6 py-3 type-body-sm font-semibold text-success">
          Details saved.
        </p>
      )}
    </section>
  );
}
