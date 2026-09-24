"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CircleAlert, LoaderCircle, LogOut } from "lucide-react";

import { signOut } from "@/lib/auth/actions";
import type { RazorpayStatus } from "@/lib/payments/razorpay";
import { saveSettings } from "@/lib/settings/admin-actions";
import { defaultCarrier, SETTINGS_LIMITS, type Settings, type SettingsField } from "@/lib/settings/model";
import { CARRIERS, type CarrierId } from "@/lib/shipping";
import { cn } from "@/lib/utils";

import { FieldHelp, SelectField, TextField } from "./product-editor-fields";
import { safeAction } from "./safe-action";
import { SETTINGS_SECTIONS, SettingsNav, type SettingsSectionId } from "./settings-nav";
import { RazorpaySettings } from "./settings-payment";
import { BUTTON_PRIMARY, FIELD, FIELD_LABEL, PAGE, SECTION_LABEL } from "./styles";
import { Toast } from "./toast";

const FORM_ID = "settings-form";
/** Sign out is its own form: forms can't nest, so its button points here from inside the settings form. */
const SIGN_OUT_FORM_ID = "sign-out-form";

const COURIER_OPTIONS = (Object.keys(CARRIERS) as CarrierId[]).map((id) => ({ value: id, label: CARRIERS[id].name }));

const saveOrReport = safeAction(saveSettings);

/** The form's fields as typed. The server checks and tidies them (see parseSettingsForm). */
interface Values {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  gstin: string;
  freeDelivery: boolean;
  /** Whole rupees. */
  deliveryFee: string;
  defaultCarrier: string;
  dispatchTime: string;
  adminName: string;
}

function valuesFor(settings: Settings, adminName: string): Values {
  return {
    storeName: settings.storeName,
    supportEmail: settings.supportEmail ?? "",
    supportPhone: settings.supportPhone ?? "",
    gstin: settings.gstin ?? "",
    freeDelivery: settings.freeDelivery,
    deliveryFee: settings.deliveryFeePaise > 0 ? String(settings.deliveryFeePaise / 100) : "",
    defaultCarrier: defaultCarrier(settings),
    dispatchTime: settings.dispatchTime ?? "",
    adminName,
  };
}

function SettingsSection({ id, children }: { id: SettingsSectionId; children: ReactNode }) {
  const title = SETTINGS_SECTIONS.find((section) => section.id === id)?.title;
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-4 border-t border-border pt-5 pb-6 lg:scroll-mt-24"
    >
      <h2 id={`${id}-title`} className={SECTION_LABEL}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * An on/off row: a real checkbox with role="switch", so it posts "on" with
 * the rest of the form. Black track and yellow knob when on.
 */
function Switch({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-3">
      <span className="text-[15px] leading-[22px] font-semibold">{label}</span>
      <input
        type="checkbox"
        role="switch"
        name={name}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-7 w-12 shrink-0 rounded-full bg-ink-subtle transition-colors peer-checked:bg-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus peer-checked:[&>span]:translate-x-5 peer-checked:[&>span]:bg-brand-yellow"
      >
        <span className="absolute top-[3px] left-[3px] size-[22px] rounded-full bg-surface-raised transition-transform" />
      </span>
    </label>
  );
}

/** A value shown for reference and copying, but changed elsewhere. */
function ReadOnlyField({ id, label, value, help }: { id: string; label: string; value: string; help: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        readOnly
        aria-describedby={`${id}-help`}
        className={cn(FIELD, "border-border bg-surface-sunken text-ink-muted")}
      />
      <FieldHelp id={`${id}-help`}>{help}</FieldHelp>
    </div>
  );
}

function ErrorLine({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-1.5 text-[13px] leading-[18px] text-danger">
      <CircleAlert className="mt-px size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      {message}
    </p>
  );
}

function SaveLabel({ saving }: { saving: boolean }) {
  if (!saving) return "Save changes";
  return (
    <>
      <LoaderCircle className="animate-spin" strokeWidth={2} aria-hidden="true" />
      Saving…
    </>
  );
}

/**
 * The Settings page: store details, shipping, payment status and the
 * admin's own account, saved together with one button. It keeps what the
 * admin typed when a save fails and moves focus to the first field that
 * needs attention.
 */
export function SettingsForm({
  settings,
  adminName,
  adminEmail,
  razorpay,
}: {
  /** As saved, or the defaults before the first save. */
  settings: Settings;
  adminName: string;
  adminEmail: string;
  razorpay: RazorpayStatus;
}) {
  const [state, save, saving] = useActionState(saveOrReport, {});
  const saved = valuesFor(settings, adminName);
  const savedKey = JSON.stringify(saved);
  const [baseKey, setBaseKey] = useState(savedKey);
  const [values, setValues] = useState(saved);
  // Fields changed since the last save attempt: their old errors are hidden,
  // and what was typed in them is kept when newer saved settings arrive.
  const [edited, setEdited] = useState<ReadonlySet<keyof Values>>(() => new Set());
  const formRef = useRef<HTMLFormElement>(null);

  // A save returns the settings as stored (tidied: an upper-case GSTIN, a
  // lower-case email). They replace the form's values, except in fields
  // typed in since the save was sent.
  if (savedKey !== baseKey) {
    const typedSince = Object.fromEntries([...edited].map((key) => [key, values[key]]));
    setBaseKey(savedKey);
    setValues({ ...saved, ...typedSince });
  }

  // After a failed save, go to the first field that needs attention.
  useEffect(() => {
    if (!state.fieldErrors) return;
    const field = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    field?.scrollIntoView({ behavior: "smooth", block: "center" });
    field?.focus({ preventScroll: true });
  }, [state]);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setEdited((current) => (current.has(key) ? current : new Set(current).add(key)));
  }

  // React resets a form after its action runs, which would undo the admin's
  // typing after a failed save. Dispatching the action ourselves keeps it.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setEdited(new Set());
    startTransition(() => save(data));
  }

  // While a save is on its way, the last result's errors are out of date.
  const fieldErrors = saving ? {} : (state.fieldErrors ?? {});
  const errorFor = (field: SettingsField) => (edited.has(field) ? undefined : fieldErrors[field]);
  const topError = saving ? undefined : state.error;

  return (
    <main className={cn(PAGE, "gap-0 pb-0 lg:gap-0 lg:pb-12")}>
      {/* On desktop the title and Save stay in view while the page scrolls. */}
      <div className="flex flex-col gap-2 pb-4 lg:sticky lg:top-0 lg:z-20 lg:-mx-10 lg:bg-surface lg:px-10 lg:pt-2 lg:pb-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="type-heading-lg">Settings</h1>
          <button type="submit" form={FORM_ID} disabled={saving} className={cn(BUTTON_PRIMARY, "hidden min-w-36 lg:inline-flex")}>
            <SaveLabel saving={saving} />
          </button>
        </div>
        <div className="hidden lg:flex lg:justify-end">
          <ErrorLine message={topError} />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start lg:gap-12">
        <SettingsNav />

        <form
          ref={formRef}
          id={FORM_ID}
          onSubmit={submit}
          noValidate
          className="flex min-w-0 flex-1 flex-col lg:max-w-[560px]"
        >
          <SettingsSection id="store">
            <TextField
              id="field-storeName"
              name="storeName"
              label="Store name"
              autoComplete="off"
              maxLength={SETTINGS_LIMITS.storeName}
              value={values.storeName}
              onValueChange={(value) => set("storeName", value)}
              help="Shown in the store's footer"
              error={errorFor("storeName")}
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <TextField
                id="field-supportEmail"
                name="supportEmail"
                label="Support email"
                optional
                type="email"
                inputMode="email"
                autoComplete="off"
                spellCheck={false}
                maxLength={SETTINGS_LIMITS.supportEmail}
                value={values.supportEmail}
                onValueChange={(value) => set("supportEmail", value)}
                help="Shown in the footer so customers can write to you"
                error={errorFor("supportEmail")}
              />
              <TextField
                id="field-supportPhone"
                name="supportPhone"
                label="Support phone"
                optional
                type="tel"
                inputMode="tel"
                autoComplete="off"
                value={values.supportPhone}
                onValueChange={(value) => set("supportPhone", value)}
                help="Shown in the footer so customers can call you"
                error={errorFor("supportPhone")}
              />
            </div>
            {/* No maxLength: a GSTIN pasted with spaces would be cut short before they are taken out. */}
            <TextField
              id="field-gstin"
              name="gstin"
              label="GSTIN"
              optional
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={values.gstin}
              onValueChange={(value) => set("gstin", value.toUpperCase().replace(/\s/g, ""))}
              help="Shown in the footer's legal line"
              error={errorFor("gstin")}
            />
          </SettingsSection>

          <SettingsSection id="shipping">
            <Switch
              name="freeDelivery"
              label="Free delivery across India"
              checked={values.freeDelivery}
              onChange={(on) => set("freeDelivery", on)}
            />
            {!values.freeDelivery && (
              <div className="grid gap-4 lg:grid-cols-2">
                <TextField
                  id="field-deliveryFee"
                  name="deliveryFee"
                  label="Delivery charge"
                  prefix="₹"
                  inputMode="numeric"
                  autoComplete="off"
                  value={values.deliveryFee}
                  onValueChange={(value) => set("deliveryFee", value)}
                  help="Charged once per order"
                  error={errorFor("deliveryFee")}
                />
              </div>
            )}
            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
              <SelectField
                id="field-defaultCarrier"
                name="defaultCarrier"
                label="Default courier"
                value={values.defaultCarrier}
                onValueChange={(value) => set("defaultCarrier", value)}
                options={COURIER_OPTIONS}
                help="The tracking form starts on this courier"
                error={errorFor("defaultCarrier")}
              />
              <TextField
                id="field-dispatchTime"
                name="dispatchTime"
                label="Dispatch time"
                optional
                autoComplete="off"
                placeholder="Ships in 2–3 days"
                maxLength={SETTINGS_LIMITS.dispatchTime}
                value={values.dispatchTime}
                onValueChange={(value) => set("dispatchTime", value)}
                help="Shown on the product page"
                error={errorFor("dispatchTime")}
              />
            </div>
          </SettingsSection>

          <SettingsSection id="payment">
            <RazorpaySettings status={razorpay} />
          </SettingsSection>

          <SettingsSection id="account">
            <div className="grid gap-4 lg:grid-cols-2">
              <TextField
                id="field-adminName"
                name="adminName"
                label="Name"
                autoComplete="name"
                maxLength={60}
                value={values.adminName}
                onValueChange={(value) => set("adminName", value)}
                error={errorFor("adminName")}
              />
              <ReadOnlyField id="field-adminEmail" label="Email" value={adminEmail} help="You sign in with this email" />
            </div>
            <dl className="flex flex-col gap-1.5">
              <dt className={FIELD_LABEL}>Role</dt>
              <dd className="text-[15px] leading-[22px]">Owner</dd>
            </dl>
            <button
              type="submit"
              form={SIGN_OUT_FORM_ID}
              className="-ml-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 self-start rounded-sm px-2 text-sm leading-5 font-semibold transition-colors hover:bg-surface-sunken"
            >
              <LogOut className="size-4" strokeWidth={1.5} aria-hidden="true" />
              Sign out
            </button>
          </SettingsSection>

          {/* Phones: Save stays in reach above the tab bar, and rests at the end of the page. */}
          <div className="sticky bottom-16 z-20 -mx-4 flex flex-col gap-2 border-t border-border bg-surface-raised px-4 py-3 lg:hidden">
            <ErrorLine message={topError} />
            <button type="submit" disabled={saving} className={cn(BUTTON_PRIMARY, "min-h-12 w-full")}>
              <SaveLabel saving={saving} />
            </button>
          </div>
        </form>
      </div>

      <form id={SIGN_OUT_FORM_ID} action={signOut} hidden />
      {/* Clear of the phone save bar, which sits on the tab bar. */}
      <Toast message={state.saved} at={state.at} className="max-lg:bottom-40" />
    </main>
  );
}
