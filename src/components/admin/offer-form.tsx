"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Check, ChevronLeft, LoaderCircle, Search } from "lucide-react";

import type { OfferScope } from "@/db/schema";
import { saveOffer } from "@/lib/offers/admin-actions";
import { OFFER_NAME_MAX, SCOPE_OPTIONS, SUGGESTED_OFFER_NAMES, type OfferField } from "@/lib/offers/editor";
import {
  endOfDayInIndia,
  isDay,
  MAX_PERCENT_OFF,
  offerCovers,
  offerDates,
  startOfDayInIndia,
  type OfferStatus,
} from "@/lib/offers/model";
import { CATEGORY_SLUGS, categoryName } from "@/lib/products/model";
import { cn } from "@/lib/utils";

import { OfferLifecycle, type OfferToast } from "./offer-actions";
import { OfferStatusLabel } from "./offer-rows";
import { FieldError, TextField } from "./product-editor-fields";
import { ErrorLine } from "./product-row";
import { safeAction } from "./safe-action";
import { StockLabel } from "./stock-label";
import { BUTTON_BASE, BUTTON_PRIMARY, CHIP, CHIP_OFF, CHIP_ON, FIELD, FIELD_LABEL, SEARCH_FIELD } from "./styles";
import { Toast } from "./toast";

/** A saved offer as the form needs it: plain values, with its dates as India days. */
export interface OfferFormOffer {
  id: string;
  name: string;
  percentOff: number;
  /** "2026-10-12", what a date input holds. */
  startDate: string;
  endDate: string;
  scope: OfferScope;
  categories: string[];
  productIds: string[];
  code: string | null;
  status: OfferStatus;
  /** "Ends in 2 days", "Starts 30 Dec", "Ended 15 Aug". */
  note: string;
  /** Milliseconds; changes whenever the offer is saved or ended. */
  updatedAt: number;
}

/** A product in the Specific products checklist. */
export interface OfferProductOption {
  id: string;
  name: string;
  hidden: boolean;
}

const FORM_ID = "offer-form";
const UNSAVED = "You have unsaved changes. Leave without saving?";

const saveOrReport = safeAction(saveOffer);

/** The form's fields as typed. The discount stays text until the server parses it. */
interface Values {
  name: string;
  percentOff: string;
  startDate: string;
  endDate: string;
  scope: OfferScope;
  categories: string[];
  productIds: string[];
  code: string;
}

/** The error each value answers to, so changing it hides that error. */
const FIELD_OF: Record<keyof Values, OfferField> = {
  name: "name",
  percentOff: "percentOff",
  startDate: "dates",
  endDate: "dates",
  scope: "scope",
  categories: "scope",
  productIds: "scope",
  code: "code",
};

/** `chosen` in the order `order` lists them, so ticking one off and on again is not a change. */
function inOrder(order: readonly string[], chosen: readonly string[]): string[] {
  const picked = new Set(chosen);
  return order.filter((value) => picked.has(value));
}

function valuesFor(offer: OfferFormOffer | null, today: string, productIds: string[]): Values {
  if (!offer) {
    return { name: "", percentOff: "", startDate: today, endDate: "", scope: "store", categories: [], productIds: [], code: "" };
  }
  return {
    name: offer.name,
    percentOff: String(offer.percentOff),
    startDate: offer.startDate,
    endDate: offer.endDate,
    scope: offer.scope,
    categories: inOrder(CATEGORY_SLUGS, offer.categories),
    productIds: inOrder(productIds, offer.productIds),
    code: offer.code ?? "",
  };
}

/** "20% off Batting Pads · 12 Oct – 25 Oct", or what is still missing. */
function summary(values: Values, today: string): string {
  const percent = Number(values.percentOff);
  const percentOk = /^\d+$/.test(values.percentOff) && percent >= 1 && percent <= MAX_PERCENT_OFF;
  if (!values.name.trim() || !percentOk || !isDay(values.startDate) || !isDay(values.endDate)) {
    return "Fill in the name, discount and dates";
  }
  if (values.endDate < values.startDate) return "The end date can't be before the start date";
  if (values.scope === "categories" && values.categories.length === 0) return "Choose at least one category";
  if (values.scope === "products" && values.productIds.length === 0) return "Choose at least one product";
  const dates = offerDates(
    { startsAt: startOfDayInIndia(values.startDate), endsAt: endOfDayInIndia(values.endDate) },
    startOfDayInIndia(today)
  );
  return `${percent}% off ${offerCovers(values, categoryName)} · ${dates}`;
}

/**
 * Ask before a link, or closing the tab, throws away what the admin typed.
 * Links that stay on this page (the tabs beside the form) keep it open.
 */
function useLeaveGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    function confirmLeave(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href);
      if (url.origin === window.location.origin && url.pathname === window.location.pathname) return;
      if (!window.confirm(UNSAVED)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    window.addEventListener("beforeunload", warn);
    // Capture, so the question comes before the link's own navigation.
    document.addEventListener("click", confirmLeave, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", confirmLeave, true);
    };
  }, [dirty]);
}

/** A labelled number field with "%" inside on the right. */
function DiscountField({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="offer-percentOff" className={FIELD_LABEL}>
        Discount
      </label>
      <div className="relative">
        <input
          id="offer-percentOff"
          name="percentOff"
          inputMode="numeric"
          autoComplete="off"
          placeholder="20"
          maxLength={2}
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "offer-percentOff-error" : undefined}
          className={cn(FIELD, "pr-10 tabular-nums")}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-[13px] right-3 text-[15px] leading-[22px] font-semibold text-ink-muted"
        >
          %
        </span>
      </div>
      <FieldError id="offer-percentOff-error" message={error} />
    </div>
  );
}

const DATE_FIELD = cn(FIELD, "appearance-none tabular-nums [&::-webkit-date-and-time-value]:text-left");

/** Start and end date side by side, with one error for the pair. */
function DatesField({
  start,
  end,
  onStart,
  onEnd,
  error,
}: {
  start: string;
  end: string;
  onStart: (value: string) => void;
  onEnd: (value: string) => void;
  error?: string;
}) {
  const invalid = error ? true : undefined;
  const describedBy = error ? "offer-dates-error" : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="offer-startDate" className={FIELD_LABEL}>
            Start date
          </label>
          <input
            id="offer-startDate"
            type="date"
            name="startDate"
            value={start}
            onChange={(event) => onStart(event.target.value)}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            className={DATE_FIELD}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="offer-endDate" className={FIELD_LABEL}>
            End date
          </label>
          <input
            id="offer-endDate"
            type="date"
            name="endDate"
            value={end}
            min={isDay(start) ? start : undefined}
            onChange={(event) => onEnd(event.target.value)}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            className={DATE_FIELD}
          />
        </div>
      </div>
      <FieldError id="offer-dates-error" message={error} />
    </div>
  );
}

const CHOICE_FOCUS = "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus";

/** Categories as chips that tick on and off. */
function CategoryPicker({
  chosen,
  onChange,
  error,
}: {
  chosen: string[];
  onChange: (chosen: string[]) => void;
  error?: string;
}) {
  return (
    <div role="group" aria-label="Categories" className="flex flex-wrap gap-2">
      {CATEGORY_SLUGS.map((slug) => {
        const on = chosen.includes(slug);
        return (
          <label key={slug} className={cn(CHIP, "relative cursor-pointer px-4", on ? CHIP_ON : CHIP_OFF, CHOICE_FOCUS)}>
            <input
              type="checkbox"
              name="categories"
              value={slug}
              checked={on}
              onChange={(event) =>
                onChange(CATEGORY_SLUGS.filter((entry) => (entry === slug ? event.target.checked : chosen.includes(entry))))
              }
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "offer-scope-error" : undefined}
              className="sr-only"
            />
            {on && <Check className="size-4" strokeWidth={2} aria-hidden="true" />}
            {categoryName(slug)}
          </label>
        );
      })}
    </div>
  );
}

/** Every product as a checklist, hidden ones labelled, with a search to find one. */
function ProductPicker({
  products,
  chosen,
  onChange,
  error,
}: {
  products: OfferProductOption[];
  chosen: string[];
  onChange: (chosen: string[]) => void;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matches = (product: OfferProductOption) => !needle || product.name.toLowerCase().includes(needle);
  const none = products.every((product) => !matches(product));

  return (
    <div className="flex flex-col gap-2">
      <label className="relative block">
        <span className="sr-only">Search products</span>
        <Search className="pointer-events-none absolute top-3 left-3 size-5 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          // Enter here searches; it must not save the offer.
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          placeholder="Search products…"
          className={SEARCH_FIELD}
        />
      </label>
      <ul aria-label="Products" className="flex flex-col border-t border-border">
        {products.map((product) => {
          const on = chosen.includes(product.id);
          // Filtered rows stay in the form (hidden), so ticked products that don't match are still saved.
          return (
            <li key={product.id} hidden={!matches(product)} className="border-b border-border">
              <label className="flex min-h-12 cursor-pointer items-center gap-3 py-1">
                <span className="relative flex size-5 shrink-0">
                  <input
                    type="checkbox"
                    name="productIds"
                    value={product.id}
                    checked={on}
                    onChange={(event) =>
                      onChange(
                        products
                          .map((entry) => entry.id)
                          .filter((id) => (id === product.id ? event.target.checked : chosen.includes(id)))
                      )
                    }
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? "offer-scope-error" : undefined}
                    className="size-5 cursor-pointer appearance-none rounded-[4px] border-[1.5px] border-ink-subtle bg-surface-raised checked:border-foreground checked:bg-foreground aria-invalid:border-danger"
                  />
                  {on && (
                    <Check
                      className="pointer-events-none absolute top-[3px] left-[3px] size-3.5 text-surface-raised"
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] leading-[22px]">{product.name}</span>
                {product.hidden && <StockLabel status="hidden" className="shrink-0" />}
              </label>
            </li>
          );
        })}
      </ul>
      {none && <p className="text-[13px] leading-[18px] text-ink-muted">No products match that search.</p>}
    </div>
  );
}

const RADIO =
  "size-5 shrink-0 cursor-pointer appearance-none rounded-full border-[1.5px] border-ink-subtle bg-surface-raised checked:border-2 checked:border-foreground checked:bg-foreground checked:shadow-[inset_0_0_0_3px_var(--surface-raised)]";

/**
 * Apply to: Entire store, Category or Specific products as three radio rows.
 * The chosen one opens its picker (category chips, or the product checklist)
 * underneath it; the error for an empty pick sits there too (Entire store
 * can't be empty, so it has none).
 */
function ScopeField({
  values,
  products,
  onScope,
  onCategories,
  onProducts,
  error,
}: {
  values: Values;
  products: OfferProductOption[];
  onScope: (scope: OfferScope) => void;
  onCategories: (chosen: string[]) => void;
  onProducts: (chosen: string[]) => void;
  error?: string;
}) {
  const everything = `All ${products.length} ${products.length === 1 ? "product" : "products"}`;
  const scopeError = <FieldError id="offer-scope-error" message={error} />;

  return (
    <fieldset className="flex min-w-0 flex-col">
      <legend className={cn(FIELD_LABEL, "pb-1.5")}>Apply to</legend>
      <div className="flex flex-col gap-1">
        {SCOPE_OPTIONS.map((option) => {
          const checked = values.scope === option.value;
          return (
            <div key={option.value} className="flex flex-col">
              <label
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-3 rounded-sm px-3 py-2 transition-colors hover:bg-surface-sunken",
                  checked && "bg-surface-sunken"
                )}
              >
                <input
                  type="radio"
                  name="scope"
                  value={option.value}
                  checked={checked}
                  onChange={() => onScope(option.value)}
                  aria-describedby={`offer-scope-${option.value}-help`}
                  className={RADIO}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="text-[15px] leading-[22px] font-semibold">{option.label}</span>
                  <span id={`offer-scope-${option.value}-help`} className="text-[13px] leading-[18px] text-ink-muted tabular-nums">
                    {option.value === "store" ? everything : option.help}
                  </span>
                </span>
              </label>
              {checked && option.value === "categories" && (
                <div className="flex flex-col gap-2 pt-1 pb-2 pl-3">
                  <CategoryPicker chosen={values.categories} onChange={onCategories} error={error} />
                  {scopeError}
                </div>
              )}
              {checked && option.value === "products" && (
                <div className="flex flex-col gap-2 pt-1 pb-2 pl-3">
                  <ProductPicker products={products} chosen={values.productIds} onChange={onProducts} error={error} />
                  {scopeError}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

function SaveLabel({ saving, label }: { saving: boolean; label: string }) {
  if (!saving) return label;
  return (
    <>
      <LoaderCircle className="animate-spin" strokeWidth={2} aria-hidden="true" />
      Saving…
    </>
  );
}

/**
 * Create or edit an offer (CreateOffer board). One form for both: it posts
 * saveOffer's fields (see parseOfferForm), keeps what the admin typed when a
 * save fails and moves focus to the first field that needs attention.
 * Creating goes to the list with "Offer created"; saving stays with "Offer
 * saved". Editing adds End offer now and Delete offer. On phones Save sits in
 * a bar at the bottom of the screen; on desktop at the foot of the panel.
 */
export function OfferForm({
  offer = null,
  products,
  today,
  backHref,
}: {
  /** The saved offer, or null on Create offer. */
  offer?: OfferFormOffer | null;
  products: OfferProductOption[];
  /** Today in India, "2026-10-23": a new offer starts today. */
  today: string;
  /** The list to go back to. */
  backHref: string;
}) {
  const productIds = products.map((product) => product.id);
  const [state, save, saving] = useActionState(saveOrReport, {});

  // The saved offer the admin's edits start from, and the values last sent to save.
  const [base, setBase] = useState(offer);
  const [values, setValues] = useState(() => valuesFor(offer, today, productIds));
  const [sent, setSent] = useState<Values | null>(null);
  // Fields changed since the last save attempt: their old errors are hidden.
  const [edited, setEdited] = useState<ReadonlySet<OfferField>>(() => new Set());
  const [ended, setEnded] = useState<OfferToast | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const same = (a: Values, b: Values | null) => JSON.stringify(a) === JSON.stringify(b);
  const dirty = !same(values, valuesFor(base, today, productIds));

  // A newer saved offer (after a save, or End offer now) replaces the form's
  // values unless the admin has typed since; the server tidies what was sent.
  if (offer && base && offer.updatedAt !== base.updatedAt) {
    if (!dirty || same(values, sent)) {
      setValues(valuesFor(offer, today, productIds));
      setEdited(new Set());
    }
    setBase(offer);
  }

  useLeaveGuard(dirty);

  // After a failed save, go to the first field that needs attention (one a search hasn't hidden).
  useEffect(() => {
    if (!state.fieldErrors) return;
    const invalid = [...(formRef.current?.querySelectorAll<HTMLElement>('[aria-invalid="true"]') ?? [])];
    const field = invalid.find((element) => element.getClientRects().length > 0);
    field?.scrollIntoView({ behavior: "smooth", block: "center" });
    field?.focus({ preventScroll: true });
  }, [state]);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setEdited((current) => (current.has(FIELD_OF[key]) ? current : new Set(current).add(FIELD_OF[key])));
  }

  // React resets a form after its action runs, which would undo the admin's
  // typing after a failed save. Dispatching the action ourselves keeps it.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setEdited(new Set());
    setSent(values);
    startTransition(() => save(data));
  }

  const fieldErrors = saving ? {} : (state.fieldErrors ?? {});
  const errorFor = (field: OfferField) => (edited.has(field) ? undefined : fieldErrors[field]);
  const topError = saving ? undefined : state.error;

  const title = base ? values.name.trim() || base.name : "Create offer";
  const saveLabel = base ? "Save changes" : "Create offer";

  // One toast for the page: whichever message is newest.
  const toast = [state.saved && state.at ? { message: state.saved, at: state.at } : null, ended]
    .filter((entry): entry is OfferToast => entry !== null)
    .reduce<OfferToast | null>((latest, entry) => (!latest || entry.at > latest.at ? entry : latest), null);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-1 px-4 pt-1 lg:px-6 lg:pt-6">
        <Link
          href={backHref}
          className="-ml-1.5 inline-flex min-h-11 items-center gap-1 self-start rounded-sm pr-2 text-sm leading-5 font-semibold lg:hidden"
        >
          <ChevronLeft className="size-5" strokeWidth={1.5} aria-hidden="true" />
          Offers
        </Link>
        <h1 ref={titleRef} tabIndex={-1} className="type-heading-lg break-words focus:outline-none lg:type-heading-md">
          {title}
        </h1>
        {offer && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <OfferStatusLabel status={offer.status} />
            <span className="text-[13px] leading-[18px] text-ink-muted">{offer.note}</span>
          </p>
        )}
      </div>

      <form
        ref={formRef}
        id={FORM_ID}
        onSubmit={submit}
        noValidate
        className="flex flex-col gap-6 px-4 pt-6 pb-6 lg:gap-5 lg:px-6 lg:pt-5"
      >
        {base && <input type="hidden" name="id" value={base.id} />}

        <div className="flex flex-col gap-2">
          <TextField
            id="offer-name"
            name="name"
            label="Offer name"
            placeholder="Diwali Sale"
            autoComplete="off"
            maxLength={OFFER_NAME_MAX}
            value={values.name}
            onValueChange={(value) => set("name", value)}
            error={errorFor("name")}
          />
          <div role="group" aria-label="Suggested names" className="flex flex-wrap gap-2">
            {SUGGESTED_OFFER_NAMES.map((suggestion) => {
              const on = values.name.trim() === suggestion;
              return (
                <button
                  key={suggestion}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set("name", suggestion)}
                  className={cn(CHIP, "cursor-pointer px-4", on ? CHIP_ON : CHIP_OFF)}
                >
                  {suggestion}
                </button>
              );
            })}
          </div>
        </div>

        <DiscountField value={values.percentOff} onChange={(value) => set("percentOff", value)} error={errorFor("percentOff")} />

        <DatesField
          start={values.startDate}
          end={values.endDate}
          onStart={(value) => set("startDate", value)}
          onEnd={(value) => set("endDate", value)}
          error={errorFor("dates")}
        />

        <ScopeField
          values={values}
          products={products}
          onScope={(scope) => set("scope", scope)}
          onCategories={(chosen) => set("categories", chosen)}
          onProducts={(chosen) => set("productIds", chosen)}
          error={errorFor("scope")}
        />

        <TextField
          id="offer-code"
          name="code"
          label="Coupon code"
          optional
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={20}
          value={values.code}
          onValueChange={(value) => set("code", value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          help="Leave empty to apply the offer automatically."
          error={errorFor("code")}
        />
      </form>

      {offer && (
        <div className="px-4 lg:px-6">
          <OfferLifecycle
            offerId={offer.id}
            name={offer.name}
            active={offer.status === "active"}
            dirty={dirty}
            onEnding={() => {
              setValues(valuesFor(base, today, productIds));
              setEdited(new Set());
            }}
            onEnded={setEnded}
            fallbackFocus={() => titleRef.current}
          />
        </div>
      )}

      {/* Phones: the bar is fixed over the foot of the screen (the tab bar is hidden here), so leave room for it. */}
      <div aria-hidden="true" className={cn("shrink-0 lg:hidden", topError ? "h-36" : "h-28")} />
      <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-2 border-t border-border bg-surface-raised px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] lg:sticky lg:mt-auto lg:px-6 lg:pt-4 lg:pb-6">
        <p
          aria-live="polite"
          className="truncate text-[13px] leading-[18px] text-ink-muted tabular-nums lg:whitespace-normal"
        >
          {summary(values, today)}
        </p>
        <ErrorLine message={topError} />
        <div className="flex items-center gap-2">
          <button type="submit" form={FORM_ID} disabled={saving} className={cn(BUTTON_PRIMARY, "min-h-12 w-full lg:min-h-11 lg:w-auto lg:min-w-36")}>
            <SaveLabel saving={saving} label={saveLabel} />
          </button>
          <Link href={backHref} className={cn(BUTTON_BASE, "hidden px-3 hover:bg-surface-sunken lg:inline-flex")}>
            Cancel
          </Link>
        </div>
      </div>

      {/* Clear of the phone save bar. */}
      <Toast message={toast?.message} at={toast?.at} className="max-lg:bottom-36" />
    </div>
  );
}
