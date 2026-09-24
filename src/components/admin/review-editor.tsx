"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ChevronLeft, ImagePlus, LoaderCircle, Mail, Phone, RefreshCw, Star, Trash2 } from "lucide-react";

import { PHOTO_ACCEPT, useReviewPhoto, type ChosenPhoto } from "@/components/reviews/use-review-photo";
import type { ReviewStatus } from "@/db/schema";
import { formatMobile, mobileHref } from "@/lib/format";
import { saveReview } from "@/lib/reviews/admin-actions";
import { RATING_WORDS, ratingLabel, REVIEW_LIMITS, type ReviewField } from "@/lib/reviews/model";
import { cn } from "@/lib/utils";

import { EditorSection, FieldError, FieldHelp, SelectField, TextAreaField, TextField } from "./product-editor-fields";
import { ErrorLine } from "./product-row";
import { ReviewDelete, ReviewStatusActions, type ReviewToast } from "./review-actions";
import { PrivateLabel, ReviewStatusLabel, reviewsHref } from "./review-rows";
import { safeAction } from "./safe-action";
import { BUTTON_BASE, BUTTON_PRIMARY, BUTTON_SECONDARY, FIELD_LABEL } from "./styles";
import { Toast } from "./toast";

/** A saved review as the editor needs it: plain values, dates already worded. */
export interface ReviewEditorReview {
  id: string;
  status: ReviewStatus;
  source: "customer" | "admin";
  isPrivate: boolean;
  rating: number | null;
  body: string;
  name: string;
  place: string;
  productId: string;
  photoUrl: string | null;
  photoAlt: string;
  /** The customer's email or mobile, only for customers' reviews. */
  contact: string | null;
  /** "24 Sep", when it came in. */
  sentOn: string;
  /** "24 Sep", when first published. */
  publishedOn: string | null;
  /** Milliseconds; changes whenever it is saved, published or hidden. */
  updatedAt: number;
}

/** A product the review can name; hidden ones are labelled. */
export interface ReviewEditorProduct {
  id: string;
  name: string;
  hidden: boolean;
}

const FORM_ID = "review-form";
const UNSAVED = "You have unsaved changes. Leave without saving?";

const saveOrReport = safeAction(saveReview);

/** The form's fields as typed. The rating stays text ("" for none), as the radio posts it. */
interface Values {
  rating: string;
  body: string;
  name: string;
  place: string;
  productId: string;
  photoAlt: string;
}

function valuesFor(review: ReviewEditorReview | null): Values {
  if (!review) return { rating: "", body: "", name: "", place: "", productId: "", photoAlt: "" };
  return {
    rating: review.rating ? String(review.rating) : "",
    body: review.body,
    name: review.name,
    place: review.place,
    productId: review.productId,
    photoAlt: review.photoAlt,
  };
}

/** Ask before a link, or closing the tab, throws away what the admin typed. */
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

const CHOICE_FOCUS = "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus";

/** No stars, or one to five, as radio buttons. */
function RatingField({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: string }) {
  const [hover, setHover] = useState(0);
  const shown = hover || Number(value);
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5" aria-describedby={error ? "review-rating-error" : undefined}>
      <legend className={cn(FIELD_LABEL, "pb-1.5")}>Rating</legend>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <label
          className={cn(
            "inline-flex min-h-11 cursor-pointer items-center rounded-full px-3.5 text-sm leading-5 font-semibold transition-colors",
            value === "" ? "bg-brand-yellow text-on-yellow" : "bg-surface-sunken hover:bg-border",
            CHOICE_FOCUS
          )}
        >
          <input
            type="radio"
            name="rating"
            value=""
            checked={value === ""}
            onChange={() => onChange("")}
            className="sr-only"
          />
          No stars
        </label>
        <div className="flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((stars) => (
            <label
              key={stars}
              onMouseEnter={() => setHover(stars)}
              className={cn("flex size-11 cursor-pointer items-center justify-center rounded-full", CHOICE_FOCUS)}
            >
              <input
                type="radio"
                name="rating"
                value={stars}
                checked={value === String(stars)}
                onChange={() => onChange(String(stars))}
                data-invalid={error ? true : undefined}
                className="sr-only"
              />
              <Star
                aria-hidden="true"
                strokeWidth={1.5}
                className={cn("size-7", stars <= shown ? "fill-rating stroke-brand-yellow-hover" : "fill-transparent stroke-ink-subtle")}
              />
              <span className="sr-only">{ratingLabel(stars)}</span>
            </label>
          ))}
        </div>
        {shown > 0 && (
          <span aria-hidden="true" className="text-sm leading-5 font-semibold">
            {RATING_WORDS[shown]}
          </span>
        )}
      </div>
      <FieldError id="review-rating-error" message={error} />
    </fieldset>
  );
}

/**
 * The review's photo: the saved one or a new one chosen here (sent with Save),
 * with Replace and Remove, or a button to add one.
 */
function PhotoField({
  current,
  chosen,
  preparing,
  error,
  onChoose,
  onRemove,
}: {
  /** The saved photo, unless the admin removed it. */
  current: string | null;
  chosen: ChosenPhoto | null;
  preparing: boolean;
  error?: string | null;
  onChoose: (file: File | undefined) => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const shown = chosen?.url ?? current;

  return (
    <div className="flex flex-col gap-2">
      {shown ? (
        <div className="flex flex-col gap-3">
          {/* The saved photo or a local preview; either way shown as it is. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shown} alt="The review's photo" className="max-h-96 w-full rounded-sm bg-surface-sunken object-contain" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => input.current?.click()} disabled={preparing} className={BUTTON_SECONDARY}>
              {preparing ? <LoaderCircle className="animate-spin" strokeWidth={2} aria-hidden="true" /> : <RefreshCw strokeWidth={1.5} aria-hidden="true" />}
              Replace photo
            </button>
            <button
              type="button"
              onClick={() => {
                onRemove();
                requestAnimationFrame(() => addButton.current?.focus());
              }}
              className={cn(BUTTON_BASE, "px-3 text-danger hover:bg-surface-sunken")}
            >
              <Trash2 strokeWidth={1.5} aria-hidden="true" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          ref={addButton}
          type="button"
          disabled={preparing}
          onClick={() => input.current?.click()}
          aria-describedby="review-photo-help"
          className="flex min-h-32 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-sm border-[1.5px] border-dashed border-ink-subtle bg-surface-sunken px-4 text-center transition-colors hover:bg-border disabled:cursor-wait"
        >
          {preparing ? (
            <LoaderCircle className="size-6 animate-spin" strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <ImagePlus className="size-6" strokeWidth={1.5} aria-hidden="true" />
          )}
          <span className="text-[15px] leading-[22px] font-semibold">{preparing ? "Getting the photo ready…" : "Add photo"}</span>
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept={PHOTO_ACCEPT}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={(event) => {
          onChoose(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {error ? (
        <FieldError id="review-photo-error" message={error} />
      ) : (
        <FieldHelp id="review-photo-help">JPG, PNG or WebP. It is made smaller before it uploads.</FieldHelp>
      )}
    </div>
  );
}

/** How to reach the customer, as a link. */
function ContactLink({ contact }: { contact: string }) {
  const email = contact.includes("@");
  const Icon = email ? Mail : Phone;
  return (
    <a
      href={email ? `mailto:${contact}` : mobileHref(contact)}
      className="inline-flex min-h-11 items-center gap-2 self-start text-[15px] leading-[22px] font-semibold break-all underline underline-offset-4"
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
      {email ? contact : formatMobile(contact)}
    </a>
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
 * Add or edit a review. One form for both: stars, words, name, team, the
 * product, and the photo with its description. Adding publishes it and
 * goes to the list with "Review added"; saving stays with "Review saved".
 * An existing review also shows its status with Publish or Hide, who sent it
 * (with their contact, only for the admin), and Delete review. The words of a
 * customer's review are theirs: fix a typo, never what they meant.
 */
export function ReviewEditor({ review = null, products }: { review?: ReviewEditorReview | null; products: ReviewEditorProduct[] }) {
  const [state, save, saving] = useActionState(saveOrReport, {});
  const [base, setBase] = useState(review);
  const [values, setValues] = useState(() => valuesFor(review));
  const [removed, setRemoved] = useState(false);
  const photo = useReviewPhoto();
  // What was last sent, so a save's result doesn't undo typing done since.
  const [sent, setSent] = useState<{ values: Values; photo: ChosenPhoto | null; removed: boolean } | null>(null);
  const [edited, setEdited] = useState<ReadonlySet<ReviewField>>(() => new Set());
  const [statusToast, setStatusToast] = useState<ReviewToast | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const same = (a: Values, b: Values | undefined) => JSON.stringify(a) === JSON.stringify(b);
  const dirty = !same(values, valuesFor(base)) || photo.photo !== null || removed;

  // A newer saved review (after Save, Publish or Hide) replaces the form
  // unless the admin has changed something since it was sent.
  if (review && base && review.updatedAt !== base.updatedAt) {
    const unchangedSinceSent = sent && same(values, sent.values) && photo.photo === sent.photo && removed === sent.removed;
    if (!dirty || unchangedSinceSent) {
      setValues(valuesFor(review));
      setEdited(new Set());
      setRemoved(false);
      photo.clear();
    }
    setBase(review);
  }

  useLeaveGuard(dirty);

  // After a failed save, go to the first field that needs attention.
  useEffect(() => {
    if (!state.fieldErrors) return;
    const field = document.querySelector<HTMLElement>('main [aria-invalid="true"], main [data-invalid]');
    field?.scrollIntoView({ behavior: "smooth", block: "center" });
    field?.focus({ preventScroll: true });
  }, [state]);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    const field: ReviewField = key;
    setEdited((current) => (current.has(field) ? current : new Set(current).add(field)));
  }

  // Dispatched by hand: React would otherwise reset the form after a failed save, and the photo is added here.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (photo.photo) data.set("photo", photo.photo.file);
    if (removed) data.set("removePhoto", "1");
    setEdited(new Set());
    setSent({ values, photo: photo.photo, removed });
    startTransition(() => save(data));
  }

  const fieldErrors = saving ? {} : (state.fieldErrors ?? {});
  const errorFor = (field: ReviewField) => (edited.has(field) ? undefined : fieldErrors[field]);
  const topError = saving ? undefined : state.error;

  const listHref = reviewsHref(base?.status ?? "published");
  const title = base ? (values.name.trim() || base.name ? `Review from ${values.name.trim() || base.name}` : "Review") : "Add review";
  const saveLabel = base ? "Save changes" : "Add review";
  const currentPhoto = removed ? null : (base?.photoUrl ?? null);

  const productOptions = [
    { value: "", label: "Not said" },
    ...products.map((product) => ({ value: product.id, label: product.hidden ? `${product.name} (hidden)` : product.name })),
  ];

  // One toast for the page: whichever message is newest.
  const toast = [state.saved && state.at ? { message: state.saved, at: state.at } : null, statusToast]
    .filter((entry): entry is ReviewToast => entry !== null)
    .reduce<ReviewToast | null>((latest, entry) => (!latest || entry.at > latest.at ? entry : latest), null);

  return (
    <main className="flex flex-col px-4 pt-1 pb-8 lg:px-10 lg:pt-6 lg:pb-12">
      <Link
        href={listHref}
        className="-ml-1.5 inline-flex min-h-11 items-center gap-1 self-start rounded-sm pr-2 text-sm leading-5 font-semibold"
      >
        <ChevronLeft className="size-5" strokeWidth={1.5} aria-hidden="true" />
        Reviews
      </Link>

      {/* On desktop the title and Save stay in view while the form scrolls. */}
      <div className="flex flex-col gap-2 pb-5 lg:sticky lg:top-0 lg:z-20 lg:-mx-10 lg:bg-surface lg:px-10 lg:pt-2 lg:pb-4">
        <div className="flex max-w-[1048px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex min-w-0 flex-col gap-1 lg:flex-row lg:items-center lg:gap-3">
            <h1 ref={titleRef} tabIndex={-1} className="type-heading-lg min-w-0 break-words focus:outline-none lg:truncate">
              {title}
            </h1>
            {base && (
              <span className="flex items-center gap-2">
                <ReviewStatusLabel status={base.status} />
                {base.isPrivate && <PrivateLabel />}
              </span>
            )}
          </div>
          <button type="submit" form={FORM_ID} disabled={saving || photo.preparing} className={cn(BUTTON_PRIMARY, "hidden min-w-36 lg:inline-flex")}>
            <SaveLabel saving={saving} label={saveLabel} />
          </button>
        </div>
        <div className="hidden max-w-[1048px] lg:flex lg:justify-end">
          <ErrorLine message={topError} />
        </div>
      </div>

      {/* Phones: one column, status first. Desktop: the review on the left; status, photo and sender on the right. */}
      <div className="flex max-w-[1048px] flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-x-12">
        <div className="contents lg:flex lg:min-w-0 lg:flex-col">
          <form ref={formRef} id={FORM_ID} onSubmit={submit} noValidate className="order-2 flex flex-col">
            {base && <input type="hidden" name="id" value={base.id} />}
            <EditorSection id="review-words-title" title="Review">
              <RatingField value={values.rating} onChange={(value) => set("rating", value)} error={errorFor("rating")} />
              <TextAreaField
                id="review-body"
                name="body"
                label="What they said"
                optional
                rows={6}
                maxLength={REVIEW_LIMITS.body}
                value={values.body}
                onValueChange={(value) => set("body", value)}
                help={base?.source === "customer" ? "The customer's own words. Fix a typo, but keep what they meant." : undefined}
                error={errorFor("body")}
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <TextField
                  id="review-name"
                  name="name"
                  label="Name"
                  optional
                  placeholder="Rohit S."
                  autoComplete="off"
                  maxLength={REVIEW_LIMITS.name}
                  value={values.name}
                  onValueChange={(value) => set("name", value)}
                  error={errorFor("name")}
                />
                <TextField
                  id="review-place"
                  name="place"
                  label="Team or city"
                  optional
                  autoComplete="off"
                  maxLength={REVIEW_LIMITS.place}
                  value={values.place}
                  onValueChange={(value) => set("place", value)}
                  error={errorFor("place")}
                />
              </div>
              <SelectField
                id="review-product"
                name="productId"
                label="Product"
                value={values.productId}
                onValueChange={(value) => set("productId", value)}
                options={productOptions}
                help="Shown as “Bought the …” with a link to it."
                error={errorFor("productId")}
              />
            </EditorSection>
          </form>
          {base && (
            <div className="order-5">
              <ReviewDelete reviewId={base.id} fallbackFocus={() => titleRef.current} />
            </div>
          )}
        </div>

        <div className="contents lg:flex lg:min-w-0 lg:flex-col">
          {base && (
            <section aria-labelledby="review-status-title" className="order-1 flex flex-col gap-3 border-t border-border pt-5 pb-6">
              <h2 id="review-status-title" className="text-xs leading-4 font-semibold tracking-[0.12em] text-ink-muted uppercase">
                On the site
              </h2>
              <ReviewStatusActions
                reviewId={base.id}
                status={base.status}
                isPrivate={base.isPrivate}
                publishedOn={base.publishedOn}
                dirty={dirty}
                onDone={setStatusToast}
              />
            </section>
          )}

          <div className="order-3">
            <EditorSection id="review-photo-title" title="Photo">
              <PhotoField
                current={currentPhoto}
                chosen={photo.photo}
                preparing={photo.preparing}
                error={photo.error ?? errorFor("photo")}
                onChoose={(file) => {
                  setEdited((current) => new Set(current).add("photo"));
                  void photo.choose(file);
                }}
                onRemove={() => {
                  if (photo.photo) photo.clear();
                  else setRemoved(true);
                }}
              />
              {(currentPhoto || photo.photo) && (
                <TextField
                  id="review-photoAlt"
                  name="photoAlt"
                  form={FORM_ID}
                  label="What the photo shows"
                  optional
                  placeholder="A batter in whites holding an Astaad bat"
                  autoComplete="off"
                  maxLength={REVIEW_LIMITS.photoAlt}
                  value={values.photoAlt}
                  onValueChange={(value) => set("photoAlt", value)}
                  help="Read out to people using screen readers."
                  error={errorFor("photoAlt")}
                />
              )}
            </EditorSection>
          </div>

          {base?.source === "customer" && (
            <div className="order-4">
              <EditorSection id="review-sender-title" title="From the customer">
                <p className="text-[15px] leading-[22px]">
                  Sent from the website on {base.sentOn}.{" "}
                  {base.isPrivate
                    ? "They asked for it to stay private."
                    : "They agreed to it being shown on the site with their name and photo."}
                </p>
                {base.contact ? (
                  <div className="flex flex-col gap-0.5">
                    <span className={FIELD_LABEL}>Contact</span>
                    <ContactLink contact={base.contact} />
                    <FieldHelp>Only you see this.</FieldHelp>
                  </div>
                ) : (
                  <p className="text-[13px] leading-[18px] text-ink-muted">They didn&apos;t leave an email or mobile number.</p>
                )}
              </EditorSection>
            </div>
          )}
        </div>
      </div>

      {/* Phones: Save sits in a bar above the home indicator (the tab bar is hidden here). */}
      <div aria-hidden="true" className={cn("shrink-0 lg:hidden", topError ? "h-32" : "h-20")} />
      <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-2 border-t border-border bg-surface-raised px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] lg:hidden">
        <ErrorLine message={topError} />
        <button type="submit" form={FORM_ID} disabled={saving || photo.preparing} className={cn(BUTTON_PRIMARY, "min-h-12 w-full")}>
          <SaveLabel saving={saving} label={saveLabel} />
        </button>
      </div>

      <Toast message={toast?.message} at={toast?.at} className="max-lg:bottom-36" />
    </main>
  );
}
