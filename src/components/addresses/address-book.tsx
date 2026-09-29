"use client";

import { startTransition, useActionState, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { LoaderCircle, MapPin, Plus } from "lucide-react";

import { BUTTON_PRIMARY, BUTTON_SECONDARY, FIELD, FIELD_LABEL, SECTION_LABEL } from "@/components/admin/styles";
import { Toast } from "@/components/admin/toast";
import { buttonVariants } from "@/components/ui/button";
import {
  ADDRESS_LABEL_MAX,
  addressLines,
  MAX_SAVED_ADDRESSES,
  SUGGESTED_LABELS,
  type AddressFieldErrors,
  type AddressFormField,
  type SavedAddress,
} from "@/lib/addresses/model";
import type { AddressActionState } from "@/lib/addresses/save";
import { ADDRESS_FIELDS, INDIAN_STATES, type ShippingAddress } from "@/lib/checkout";
import { mobileAsTyped } from "@/lib/account/model";
import { formatMobile } from "@/lib/format";
import { cn } from "@/lib/utils";

type AddressAction = (previous: AddressActionState, form: FormData) => Promise<AddressActionState>;

export interface AddressBookActions {
  save: AddressAction;
  remove: AddressAction;
  makeDefault: AddressAction;
}

/**
 * The book on the customer's account page (`store`: a white card, the
 * storefront's buttons and fields) or on a customer's page in the admin
 * (`admin`: hairlines, the admin's buttons and fields, a toast for what was done).
 */
type Skin = "store" | "admin";

const STORE_FIELD =
  "h-11 w-full min-w-0 rounded-md border border-input bg-surface-raised px-4 text-[15px] leading-[22px] text-foreground transition-colors placeholder:text-ink-muted aria-invalid:border-danger";

const SKINS = {
  store: {
    section: "@container flex flex-col rounded-md border border-border bg-surface-raised shadow-card",
    header: "flex min-h-[60px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-6 py-2",
    title: "type-heading-sm",
    body: "flex flex-col gap-4 p-6",
    list: "grid gap-4 @[640px]:grid-cols-2",
    item: "flex h-full flex-col gap-3 rounded-md border border-border p-4",
    field: STORE_FIELD,
    fieldLabel: "text-sm leading-none font-medium",
    // Through cn, as Button does: a variant's border has to win over the base's transparent one.
    primary: cn(buttonVariants()),
    secondary: cn(buttonVariants({ variant: "outline" })),
    add: cn(buttonVariants({ variant: "outline", size: "sm" })),
    text: "type-body",
    small: "type-body-sm",
  },
  admin: {
    section: "@container flex flex-col border-t border-border pt-5",
    header: "flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2 pb-3",
    title: SECTION_LABEL,
    body: "flex flex-col gap-4",
    list: "grid gap-x-10 border-t border-border @[640px]:grid-cols-2",
    item: "flex h-full flex-col gap-2 border-b border-border py-4",
    field: FIELD,
    fieldLabel: FIELD_LABEL,
    primary: BUTTON_PRIMARY,
    secondary: BUTTON_SECONDARY,
    add: cn(BUTTON_SECONDARY, "min-h-10"),
    text: "text-[15px] leading-[22px]",
    small: "text-[13px] leading-[18px]",
  },
} as const;

/** A quiet text button under an address: Edit, Delete, Make default. */
const LINK_BUTTON =
  "inline-flex min-h-11 cursor-pointer items-center text-sm leading-5 font-semibold underline underline-offset-4 transition-colors hover:text-ink-muted disabled:cursor-not-allowed disabled:opacity-60";

type Values = Record<AddressFormField, string> & { isDefault: boolean };

function valuesFor(address: SavedAddress | null, starting: Partial<ShippingAddress>): Values {
  const from = address ?? starting;
  return {
    label: address?.label ?? "",
    name: from.name ?? "",
    phone: from.phone ? mobileAsTyped(from.phone) : "",
    line1: from.line1 ?? "",
    line2: from.line2 ?? "",
    city: from.city ?? "",
    state: from.state ?? "",
    pincode: from.pincode ?? "",
    isDefault: address?.isDefault ?? false,
  };
}

function FieldError({ id, message, skin }: { id: string; message?: string; skin: Skin }) {
  if (!message) return null;
  return (
    <p id={id} className={cn(SKINS[skin].small, "text-danger")}>
      {message}
    </p>
  );
}

/**
 * The address form, for a new address or one being changed. It holds what is
 * typed, so a save that is turned down leaves it in place.
 */
function AddressForm({
  skin,
  address,
  starting,
  offerDefault,
  whose,
  action,
  pending,
  state,
  onCancel,
}: {
  skin: Skin;
  address: SavedAddress | null;
  starting: Partial<ShippingAddress>;
  /** Whether the default can be chosen here: not for the first address or the default itself, which hold it anyway. */
  offerDefault: boolean;
  whose: string;
  action: (form: FormData) => void;
  pending: boolean;
  state: AddressActionState;
  onCancel: () => void;
}) {
  const id = useId();
  const look = SKINS[skin];
  const [values, setValues] = useState(() => valuesFor(address, starting));
  // An error goes once its field is changed; the rest stay until the next save.
  const [changed, setChanged] = useState<{ since: AddressActionState; fields: AddressFormField[] }>({ since: state, fields: [] });
  const touched = changed.since === state ? changed.fields : [];
  const shown: AddressFieldErrors = pending ? {} : (state.fieldErrors ?? {});
  const errorOf = (field: AddressFormField) => (touched.includes(field) ? undefined : shown[field]);

  function set(field: AddressFormField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setChanged({ since: state, fields: [...touched, field] });
  }

  const errorId = (field: AddressFormField) => `${id}-${field}-error`;

  // Sent by hand: a form with an `action` is reset once the action answers,
  // which puts the state list back on its first state whatever was chosen.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(() => action(form));
  }

  return (
    <form onSubmit={submit} noValidate aria-busy={pending} aria-labelledby={`${id}-form`} className="flex flex-col gap-5">
      <h3 id={`${id}-form`} className={cn(look.text, "font-semibold")}>
        {address ? "Change this address" : "Add an address"}
      </h3>
      {address && <input type="hidden" name="id" value={address.id} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <label htmlFor={`${id}-label`} className={look.fieldLabel}>
            Name this address <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <input
            id={`${id}-label`}
            name="label"
            list={`${id}-labels`}
            maxLength={ADDRESS_LABEL_MAX}
            placeholder="Home, Work, Academy"
            autoComplete="off"
            value={values.label}
            onChange={(event) => set("label", event.target.value)}
            aria-invalid={errorOf("label") ? true : undefined}
            aria-describedby={errorOf("label") ? errorId("label") : undefined}
            className={look.field}
          />
          <datalist id={`${id}-labels`}>
            {SUGGESTED_LABELS.map((label) => (
              <option key={label} value={label} />
            ))}
          </datalist>
          <FieldError id={errorId("label")} message={errorOf("label")} skin={skin} />
        </div>
        {ADDRESS_FIELDS.map((field) => (
          <div key={field.name} className={cn("flex flex-col gap-2", field.span && "sm:col-span-2")}>
            <label htmlFor={`${id}-${field.name}`} className={look.fieldLabel}>
              {field.label}
              {field.optional && <span className="font-normal text-ink-muted"> (optional)</span>}
            </label>
            <input
              id={`${id}-${field.name}`}
              name={field.name}
              type={field.type ?? "text"}
              inputMode={field.inputMode}
              maxLength={field.maxLength}
              autoComplete={field.autoComplete}
              value={values[field.name]}
              onChange={(event) => set(field.name, event.target.value)}
              required={!field.optional}
              aria-invalid={errorOf(field.name) ? true : undefined}
              aria-describedby={errorOf(field.name) ? errorId(field.name) : undefined}
              className={look.field}
            />
            <FieldError id={errorId(field.name)} message={errorOf(field.name)} skin={skin} />
          </div>
        ))}
        <div className="flex flex-col gap-2 sm:col-span-2">
          <label htmlFor={`${id}-state`} className={look.fieldLabel}>
            State
          </label>
          <select
            id={`${id}-state`}
            name="state"
            autoComplete="address-level1"
            value={values.state}
            onChange={(event) => set("state", event.target.value)}
            required
            aria-invalid={errorOf("state") ? true : undefined}
            aria-describedby={errorOf("state") ? errorId("state") : undefined}
            className={look.field}
          >
            <option value="" disabled>
              Choose a state
            </option>
            {INDIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          <FieldError id={errorId("state")} message={errorOf("state")} skin={skin} />
        </div>
      </div>

      {offerDefault && (
        <label className={cn(look.text, "flex min-h-11 cursor-pointer items-center gap-3 self-start")}>
          <input
            type="checkbox"
            name="isDefault"
            checked={values.isDefault}
            onChange={(event) => setValues((current) => ({ ...current, isDefault: event.target.checked }))}
            className="size-5 shrink-0 accent-foreground"
          />
          Make this {whose} default address
        </label>
      )}

      {!pending && state.error && state.fieldErrors && (
        <p role="alert" className={cn(look.small, "text-danger")}>
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className={look.primary}>
          {pending ? (
            <>
              <LoaderCircle className="animate-spin" strokeWidth={2} aria-hidden="true" />
              Saving…
            </>
          ) : address ? (
            "Save address"
          ) : (
            "Add address"
          )}
        </button>
        <button type="button" disabled={pending} onClick={onCancel} className={look.secondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/** One saved address, with what can be done to it. Delete asks first. */
function AddressItem({
  skin,
  address,
  busy,
  onEdit,
  remove,
  makeDefault,
}: {
  skin: Skin;
  address: SavedAddress;
  /** Something in the book is being saved, so the buttons wait. */
  busy: boolean;
  onEdit: () => void;
  remove: (form: FormData) => void;
  makeDefault: (form: FormData) => void;
}) {
  const look = SKINS[skin];
  const [asking, setAsking] = useState(false);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const wasAsking = useRef(false);
  const named = address.label ?? address.name;

  // Keeping the address hands the keyboard back to Delete.
  useEffect(() => {
    if (wasAsking.current && !asking) deleteRef.current?.focus();
    wasAsking.current = asking;
  }, [asking]);

  return (
    <li className={look.item}>
      {(address.label || address.isDefault) && (
        <p className="flex flex-wrap items-center gap-2">
          {address.label && (
            <span className="text-xs leading-4 font-semibold tracking-[0.12em] text-ink-muted uppercase">{address.label}</span>
          )}
          {address.isDefault && (
            <span className="rounded-full bg-surface-dark px-2 text-[11px] leading-5 font-semibold text-on-dark">Default</span>
          )}
        </p>
      )}
      <address className={cn(look.text, "flex flex-col not-italic")}>
        <span className="font-semibold">{address.name}</span>
        {addressLines(address).map((line) => (
          <span key={line}>{line}</span>
        ))}
        <span className="text-ink-muted tabular-nums">{formatMobile(address.phone)}</span>
      </address>

      {asking ? (
        <form action={remove} className="mt-auto flex flex-col gap-1">
          <input type="hidden" name="id" value={address.id} />
          <p className={cn(look.small, "font-semibold")}>Delete this address? Orders sent to it keep it.</p>
          <div className="flex flex-wrap gap-x-5">
            <button type="submit" disabled={busy} className={cn(LINK_BUTTON, "text-danger hover:text-danger")} autoFocus>
              Delete<span className="sr-only"> {named}</span>
            </button>
            <button type="button" disabled={busy} onClick={() => setAsking(false)} className={LINK_BUTTON}>
              Keep it
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-auto flex flex-wrap gap-x-5">
          <button type="button" disabled={busy} onClick={onEdit} className={LINK_BUTTON}>
            Edit<span className="sr-only"> {named}</span>
          </button>
          <button ref={deleteRef} type="button" disabled={busy} onClick={() => setAsking(true)} className={LINK_BUTTON}>
            Delete<span className="sr-only"> {named}</span>
          </button>
          {!address.isDefault && (
            <form action={makeDefault}>
              <input type="hidden" name="id" value={address.id} />
              <button type="submit" disabled={busy} className={LINK_BUTTON}>
                Make default<span className="sr-only">: {named}</span>
              </button>
            </form>
          )}
        </div>
      )}
    </li>
  );
}

/** The newest of the three actions' results: the one whose message is on show. */
function newest(states: AddressActionState[]): AddressActionState {
  return states.reduce((latest, state) => ((state.at ?? 0) > (latest.at ?? 0) ? state : latest), {});
}

/**
 * Saved addresses: the list, with the default first, and a form to add or
 * change one. `actions` decide whose book it is: the customer's own on the
 * account page, a customer's on their page in the admin.
 */
export function AddressBook({
  skin,
  addresses,
  actions,
  starting = {},
  empty,
}: {
  skin: Skin;
  addresses: SavedAddress[];
  actions: AddressBookActions;
  /** What a new address starts with: the name and mobile number on the account. */
  starting?: Partial<ShippingAddress>;
  /** What an empty book says. */
  empty: string;
}) {
  const id = useId();
  const look = SKINS[skin];
  const [saveState, save, saving] = useActionState(actions.save, {});
  const [removeState, remove, removing] = useActionState(actions.remove, {});
  const [defaultState, makeDefault, changingDefault] = useActionState(actions.makeDefault, {});
  // The form, and the save result on show when it opened: a later result
  // that says "saved" closes it by itself.
  const [form, setForm] = useState<{ id: string | null; openedAt: AddressActionState } | null>(null);
  // Opening the form clears the message of what was done before.
  const [seenAt, setSeenAt] = useState(0);
  const formOpen = form !== null && (saveState === form.openedAt || !saveState.saved);
  const editing = formOpen && form.id ? (addresses.find((address) => address.id === form.id) ?? null) : null;
  const addRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // Closing the form, saved or cancelled, hands the keyboard back to Add address.
  useEffect(() => {
    if (wasOpen.current && !formOpen) addRef.current?.focus();
    wasOpen.current = formOpen;
  }, [formOpen]);

  const busy = saving || removing || changingDefault;
  const result = busy ? {} : newest([saveState, removeState, defaultState]);
  const latest = (result.at ?? 0) > seenAt ? result : {};

  function open(addressId: string | null) {
    setForm({ id: addressId, openedAt: saveState });
    setSeenAt(result.at ?? 0);
  }
  const full = addresses.length >= MAX_SAVED_ADDRESSES;
  const whose = skin === "store" ? "my" : "their";

  return (
    <section aria-labelledby={`${id}-title`} className={look.section}>
      <div className={look.header}>
        <h2 id={`${id}-title`} className={look.title}>
          Saved addresses
        </h2>
        {!formOpen && !full && (
          <button
            ref={addRef}
            type="button"
            disabled={busy}
            onClick={() => open(null)}
            className={look.add}
          >
            <Plus strokeWidth={2} aria-hidden="true" />
            Add address
          </button>
        )}
      </div>

      <div className={look.body}>
        {formOpen ? (
          <AddressForm
            // A form of its own for each address, and for a new one.
            key={form.id ?? "new"}
            skin={skin}
            address={editing}
            starting={starting}
            offerDefault={addresses.length > 0 && !editing?.isDefault}
            whose={whose}
            action={save}
            pending={saving}
            state={saveState === form.openedAt ? {} : saveState}
            onCancel={() => setForm(null)}
          />
        ) : addresses.length === 0 ? (
          <p className={cn(look.text, "flex items-start gap-3 text-ink-muted")}>
            <MapPin className="mt-0.5 size-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            {empty}
          </p>
        ) : (
          <>
            <ul className={look.list}>
              {addresses.map((address) => (
                <AddressItem
                  key={address.id}
                  skin={skin}
                  address={address}
                  busy={busy}
                  onEdit={() => open(address.id)}
                  remove={remove}
                  makeDefault={makeDefault}
                />
              ))}
            </ul>
            {full && (
              <p className={cn(look.small, "text-ink-muted")}>
                That is {MAX_SAVED_ADDRESSES} addresses, as many as an account holds. Delete one to add another.
              </p>
            )}
          </>
        )}

        {/* The form shows its own field errors; anything else that went wrong shows here. */}
        {latest.error && !(formOpen && latest.fieldErrors) && (
          <p role="alert" className={cn(look.small, "text-danger")}>
            {latest.error}
          </p>
        )}
        {skin === "store" && (
          <p role="status" className={cn(look.small, "font-semibold text-success empty:hidden")}>
            {!formOpen && latest.saved ? `${latest.saved}.` : null}
          </p>
        )}
      </div>
      {skin === "admin" && <Toast message={latest.saved} at={latest.at} />}
    </section>
  );
}
