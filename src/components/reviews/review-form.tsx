"use client";

import { startTransition, useActionState, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, CircleCheck, ImagePlus, LoaderCircle, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitReview, type ReviewFormState } from "@/lib/reviews/actions";
import { RATING_WORDS, ratingLabel, REVIEW_LIMITS, type ReviewField } from "@/lib/reviews/model";
import { cn } from "@/lib/utils";

import { PHOTO_ACCEPT, useReviewPhoto } from "./use-review-photo";

/** A product the customer can say they bought, under its group ("English Willow Bats"). */
export interface ReviewProductOption {
  id: string;
  name: string;
  group: string;
}

/** A failure to reach the server (no signal) keeps the form and says so, instead of the error page. */
async function send(previous: ReviewFormState, form: FormData): Promise<ReviewFormState> {
  try {
    return await submitReview(previous, form);
  } catch {
    return { error: "Something went wrong. Check your connection and try again." };
  }
}

const LABEL = "text-sm leading-5 font-semibold";
const HELP = "type-body-sm text-ink-muted";
const ERROR = "type-body-sm text-danger";

/** A field's label, the field, then its error or help, linked with aria-describedby. */
function Field({
  id,
  label,
  optional,
  help,
  error,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  help?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={LABEL}>
        {label}
        {optional && <span className="font-normal text-ink-muted"> (optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className={ERROR}>
          {error}
        </p>
      ) : help ? (
        <p id={`${id}-help`} className={HELP}>
          {help}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, error: string | undefined, help: boolean) {
  return error ? `${id}-error` : help ? `${id}-help` : undefined;
}

/** Five stars as radio buttons. Hovering previews a rating; the word beside says what it means. */
function StarPicker({
  id,
  value,
  onChange,
  error,
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
  error?: string;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className={cn(LABEL, "pb-2")}>Your rating</legend>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="-ml-1.5 flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((stars) => (
            <label
              key={stars}
              onMouseEnter={() => setHover(stars)}
              className="flex size-11 cursor-pointer items-center justify-center rounded-full has-focus-visible:outline-2 has-focus-visible:outline-offset-0 has-focus-visible:outline-focus"
            >
              <input
                type="radio"
                name="rating"
                value={stars}
                checked={value === stars}
                onChange={() => onChange(stars)}
                data-invalid={error ? true : undefined}
                className="sr-only"
              />
              <Star
                aria-hidden="true"
                strokeWidth={1.5}
                className={cn(
                  "size-8 transition-colors",
                  stars <= shown ? "fill-rating stroke-brand-yellow-hover" : "fill-transparent stroke-ink-subtle"
                )}
              />
              <span className="sr-only">{ratingLabel(stars)}</span>
            </label>
          ))}
        </div>
        <span aria-hidden="true" className="type-body min-w-20 font-semibold">
          {RATING_WORDS[shown]}
        </span>
      </div>
      {error && (
        <p id={`${id}-error`} className={ERROR}>
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** One photo: a large button to add it, then a preview with Change and Remove. */
function PhotoPicker({
  id,
  photo,
  error,
  preparing,
  onChoose,
  onRemove,
}: {
  id: string;
  photo: { url: string } | null;
  error?: string | null;
  preparing: boolean;
  onChoose: (file: File | undefined) => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const help = "You with your bat or gear. JPG, PNG or WebP.";

  return (
    <div className="flex flex-col gap-2">
      <span id={`${id}-label`} className={LABEL}>
        Add a photo <span className="font-normal text-ink-muted">(optional)</span>
      </span>
      {photo ? (
        <div className="flex items-center gap-4">
          {/* A local preview (an object URL), so next/image has nothing to optimise. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt="Your photo" className="size-24 shrink-0 rounded-md bg-surface-dark object-cover" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => input.current?.click()}>
              Change photo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onRemove();
                // The Remove button goes; keep keyboard users in place.
                requestAnimationFrame(() => addButton.current?.focus());
              }}
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          ref={addButton}
          type="button"
          disabled={preparing}
          onClick={() => input.current?.click()}
          aria-labelledby={`${id}-label`}
          aria-describedby={error ? `${id}-error` : `${id}-help`}
          className="flex min-h-28 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-[1.5px] border-dashed border-ink-subtle bg-surface-sunken px-4 py-5 text-center transition-colors hover:bg-border disabled:cursor-wait"
        >
          {preparing ? (
            <LoaderCircle className="size-6 animate-spin" strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <ImagePlus className="size-6" strokeWidth={1.5} aria-hidden="true" />
          )}
          <span className="type-body font-semibold">{preparing ? "Getting your photo ready…" : "Choose a photo"}</span>
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
          // Choosing the same file again should still work.
          event.target.value = "";
        }}
      />
      {error ? (
        <p id={`${id}-error`} className={ERROR}>
          {error}
        </p>
      ) : (
        <p id={`${id}-help`} className={HELP}>
          {help}
        </p>
      )}
    </div>
  );
}

/** Products grouped as the store lists them, in a native select. */
function ProductSelect({
  id,
  products,
  value,
  onChange,
  error,
}: {
  id: string;
  products: ReviewProductOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const groups = [...new Set(products.map((product) => product.group))];
  return (
    <div className="relative">
      <select
        id={id}
        name="productId"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, false)}
        className={cn(
          "h-11 w-full cursor-pointer appearance-none rounded-md border border-input bg-surface-raised pr-10 pl-4 text-[15px] leading-[22px] aria-invalid:border-danger",
          !value && "text-ink-muted"
        )}
      >
        <option value="">Choose a product</option>
        {groups.map((group) => (
          <optgroup key={group} label={group}>
            {products
              .filter((product) => product.group === group)
              .map((product) => (
                <option key={product.id} value={product.id} className="text-foreground">
                  {product.name}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-3 right-3 size-5 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
    </div>
  );
}

/** What shows once the review is in. It takes focus, so screen readers hear it. */
function Sent({ name, isPrivate }: { name: string; isPrivate: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const first = name.split(" ")[0];
  return (
    <div className="flex flex-col items-start gap-4 rounded-md border border-border bg-surface-raised p-6 shadow-card md:p-8">
      <CircleCheck className="size-10 text-success" strokeWidth={1.5} aria-hidden="true" />
      <div className="flex flex-col gap-2">
        <h2 ref={heading} tabIndex={-1} className="type-heading-lg outline-none">
          Thanks, {first}!
        </h2>
        <p className="type-body text-ink-muted">
          {isPrivate
            ? "Your feedback went straight to the Astaad team. If you left an email or mobile number, we may get back to you."
            : "We read every review, and yours will be on the site once we've checked it."}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button render={<Link href="/reviews" />} nativeButton={false} variant="secondary">
          Read reviews
        </Button>
        <Button render={<Link href="/" />} nativeButton={false} variant="ghost">
          Back to the shop
        </Button>
      </div>
    </div>
  );
}

interface Values {
  rating: number;
  body: string;
  productId: string;
  name: string;
  place: string;
  contact: string;
  isPrivate: boolean;
}

const EMPTY: Values = { rating: 0, body: "", productId: "", name: "", place: "", contact: "", isPrivate: false };

/**
 * The customer's review: stars, their words, what they bought, a photo, their
 * name and team, a way to reach them (only the store sees it), and "Keep this
 * private" for feedback that isn't for the site. Keeps what was typed when
 * sending fails and moves focus to the first field that needs attention.
 */
export function ReviewForm({ products }: { products: ReviewProductOption[] }) {
  const id = useId();
  const [state, sendReview, pending] = useActionState(send, {});
  const [values, setValues] = useState<Values>(EMPTY);
  // Fields changed since the last send: their old errors are hidden.
  const [edited, setEdited] = useState<ReadonlySet<ReviewField>>(() => new Set());
  const photo = useReviewPhoto();
  const formRef = useRef<HTMLFormElement>(null);

  // After a failed send, go to the first field that needs attention.
  useEffect(() => {
    if (!state.fieldErrors) return;
    const field = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid]');
    field?.scrollIntoView({ behavior: "smooth", block: "center" });
    field?.focus({ preventScroll: true });
  }, [state]);

  if (state.sent && !pending) return <Sent {...state.sent} />;

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    const field = key === "isPrivate" ? null : (key as ReviewField);
    if (field) setEdited((current) => (current.has(field) ? current : new Set(current).add(field)));
  }

  // Dispatched by hand: React would otherwise clear the form after a failed send, and the photo is added here.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (photo.photo) data.set("photo", photo.photo.file);
    setEdited(new Set());
    startTransition(() => sendReview(data));
  }

  const fieldErrors = pending ? {} : (state.fieldErrors ?? {});
  const errorFor = (field: ReviewField) => (edited.has(field) ? undefined : fieldErrors[field]);
  const field = (name: string) => `${id}-${name}`;

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      noValidate
      className="relative flex flex-col gap-6 rounded-md border border-border bg-surface-raised p-6 shadow-card md:p-8"
    >
      <StarPicker id={field("rating")} value={values.rating} onChange={(value) => set("rating", value)} error={errorFor("rating")} />

      <Field
        id={field("body")}
        label="Your review"
        help={`${values.body.trim().length} / ${REVIEW_LIMITS.body}`}
        error={errorFor("body")}
      >
        <textarea
          id={field("body")}
          name="body"
          rows={5}
          maxLength={REVIEW_LIMITS.body}
          placeholder="How does it pick up? How is the ping off the middle?"
          value={values.body}
          onChange={(event) => set("body", event.target.value)}
          aria-invalid={errorFor("body") ? true : undefined}
          aria-describedby={describedBy(field("body"), errorFor("body"), true)}
          className="min-h-32 w-full resize-y rounded-md border border-input bg-surface-raised px-4 py-3 text-[15px] leading-[22px] placeholder:text-ink-muted aria-invalid:border-danger"
        />
      </Field>

      <Field id={field("product")} label="What did you buy?" optional error={errorFor("productId")}>
        <ProductSelect
          id={field("product")}
          products={products}
          value={values.productId}
          onChange={(value) => set("productId", value)}
          error={errorFor("productId")}
        />
      </Field>

      <PhotoPicker
        id={field("photo")}
        photo={photo.photo}
        error={photo.error ?? errorFor("photo")}
        preparing={photo.preparing}
        onChoose={(file) => {
          setEdited((current) => new Set(current).add("photo"));
          void photo.choose(file);
        }}
        onRemove={photo.clear}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id={field("name")} label="Your name" help="Shown with your review" error={errorFor("name")}>
          <Input
            id={field("name")}
            name="name"
            autoComplete="name"
            maxLength={REVIEW_LIMITS.name}
            placeholder="Rohit S."
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
            aria-invalid={errorFor("name") ? true : undefined}
            aria-describedby={describedBy(field("name"), errorFor("name"), true)}
          />
        </Field>
        <Field id={field("place")} label="Team or city" optional error={errorFor("place")}>
          <Input
            id={field("place")}
            name="place"
            maxLength={REVIEW_LIMITS.place}
            placeholder="Mumbai"
            value={values.place}
            onChange={(event) => set("place", event.target.value)}
            aria-invalid={errorFor("place") ? true : undefined}
            aria-describedby={describedBy(field("place"), errorFor("place"), false)}
          />
        </Field>
      </div>

      <Field
        id={field("contact")}
        label="Email or mobile number"
        optional
        help="Only the Astaad team sees this, in case we need to reply."
        error={errorFor("contact")}
      >
        <Input
          id={field("contact")}
          name="contact"
          autoComplete="email"
          maxLength={REVIEW_LIMITS.contact}
          value={values.contact}
          onChange={(event) => set("contact", event.target.value)}
          aria-invalid={errorFor("contact") ? true : undefined}
          aria-describedby={describedBy(field("contact"), errorFor("contact"), true)}
        />
      </Field>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="private"
          checked={values.isPrivate}
          onChange={(event) => set("isPrivate", event.target.checked)}
          className="mt-0.5 size-5 shrink-0 cursor-pointer accent-surface-dark"
        />
        <span className="flex flex-col gap-0.5">
          <span className="type-body font-semibold">Keep this private</span>
          <span className={HELP}>
            Only the Astaad team reads it. Leave this unticked and we can show your review, name and photo on our site.
          </span>
        </span>
      </label>

      {/* People never see this; a bot that fills it in is ignored. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {!pending && state.error && (
        <p role="alert" className={ERROR}>
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending || photo.preparing} className="w-full sm:w-auto sm:self-start">
        {pending ? (
          <>
            <LoaderCircle className="animate-spin" strokeWidth={2} aria-hidden="true" />
            Sending…
          </>
        ) : values.isPrivate ? (
          "Send feedback"
        ) : (
          "Send review"
        )}
      </Button>
    </form>
  );
}
