"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, CircleAlert, Copy, ExternalLink, LoaderCircle } from "lucide-react";

import type { BatCustomization, Product, ProductAvailability } from "@/db/schema";
import { duplicate, saveProduct } from "@/lib/products/admin-actions";
import { parseCount, parseRupees, PRODUCT_LIMITS, type ProductField } from "@/lib/products/editor";
import {
  availabilityForSave,
  BAT_SUBCATEGORIES,
  CATEGORY_SLUGS,
  categoryName,
  customizationFor,
  FULL_CUSTOMIZATION,
  percentOff,
  productHref,
  stockStatus,
  type CategorySlug,
} from "@/lib/products/model";
import { cn } from "@/lib/utils";

import { AvailabilityChoice, availabilityNote } from "./availability-choice";
import { ProductCustomization } from "./product-customization";
import { EditorSection, FieldHelp, SelectField, StockField, TextAreaField, TextField } from "./product-editor-fields";
import { ProductPhotos, type EditorPhoto } from "./product-photos";
import { safeAction } from "./safe-action";
import { StockLabel } from "./stock-label";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, PAGE } from "./styles";
import { Toast } from "./toast";

/** A saved product as the editor needs it. `updatedAt` is in milliseconds, for the save's change check. */
export type EditorProduct = Pick<
  Product,
  | "id"
  | "slug"
  | "kind"
  | "category"
  | "subcategory"
  | "name"
  | "line"
  | "tagline"
  | "note"
  | "grade"
  | "shortDescription"
  | "description"
  | "pricePaise"
  | "mrpPaise"
  | "sku"
  | "stock"
  | "lowStockThreshold"
  | "availability"
  | "customization"
> & { updatedAt: number; photos: EditorPhoto[] };

/** Why the editor opened: a product was just created, or just duplicated. */
export type EditorNotice = "created" | "duplicated";

const NOTICE: Record<EditorNotice, string> = {
  created: "Product saved",
  duplicated: "Copy created. It's hidden until you make it available.",
};

const FORM_ID = "product-form";

const saveOrReport = safeAction(saveProduct);
const duplicateOrReport = safeAction(duplicate);

interface ToastEntry {
  message: string;
  at: number;
}

/** The form's fields as typed. Money and counts stay text until the server parses them. */
interface Values {
  name: string;
  category: string;
  subcategory: string;
  price: string;
  mrp: string;
  stock: string;
  lowStockThreshold: string;
  sku: string;
  /** The admin's choice; what is saved can differ with the stock (see availabilityForSave). */
  availability: ProductAvailability;
  grade: string;
  tagline: string;
  line: string;
  shortDescription: string;
  description: string;
  customization: BatCustomization;
}

const rupeeFormat = new Intl.NumberFormat("en-IN");

function rupees(paise: number | null): string {
  return paise === null ? "" : rupeeFormat.format(Math.round(paise / 100));
}

function valuesFor(product: EditorProduct | null, category: CategorySlug | null): Values {
  if (!product) {
    return {
      name: "",
      category: category ?? "",
      subcategory: "english-willow",
      price: "",
      mrp: "",
      stock: "",
      lowStockThreshold: "3",
      sku: "",
      availability: "available",
      grade: "",
      tagline: "",
      line: "",
      shortDescription: "",
      description: "",
      // New English willow bats offer every build option.
      customization: FULL_CUSTOMIZATION,
    };
  }
  const customization = customizationFor(product.kind, product.subcategory, product.customization);
  return {
    name: product.name,
    category: product.category,
    subcategory: product.subcategory ?? "english-willow",
    price: rupees(product.pricePaise),
    mrp: rupees(product.mrpPaise),
    stock: product.stock === null ? "" : String(product.stock),
    lowStockThreshold: String(product.lowStockThreshold),
    sku: product.sku ?? "",
    availability: product.availability,
    grade: product.grade ?? "",
    tagline: product.tagline ?? "",
    line: product.line ?? "",
    shortDescription: (product.kind === "bat" ? product.shortDescription : product.note) ?? "",
    description: product.description ?? "",
    // Turning customization on starts from every option rather than none.
    customization: customization.enabled ? customization : { ...FULL_CUSTOMIZATION, enabled: false },
  };
}

/** A whole number from a field, or null when it is empty or not a whole number. */
function countOrNull(value: string): number | null {
  const count = parseCount(value);
  return count === null || Number.isNaN(count) ? null : count;
}

function PriceHelp({ price, mrp }: { price: string; mrp: string }) {
  const priceRupees = parseRupees(price);
  const mrpRupees = parseRupees(mrp);
  const valid = (amount: number | null): amount is number => amount !== null && !Number.isNaN(amount);
  let content: ReactNode = "Add an MRP above the price to show a discount.";
  let danger = false;
  if (valid(priceRupees) && valid(mrpRupees)) {
    const off = percentOff(priceRupees, mrpRupees);
    if (mrpRupees < priceRupees) {
      content = "The MRP can't be lower than the price.";
      danger = true;
    } else if (off > 0) {
      content = (
        <>
          Customers see{" "}
          <span className="rounded-xs bg-brand-yellow px-1.5 font-semibold text-on-yellow tabular-nums">{off}% off</span>
        </>
      );
    } else {
      content = "Customers pay the MRP. No discount shows.";
    }
  }
  return (
    <p id="price-help" aria-live="polite" className={cn("text-[13px] leading-[18px]", danger ? "text-danger" : "text-ink-muted")}>
      {content}
    </p>
  );
}

function thresholdHelp(value: string): string {
  const threshold = countOrNull(value);
  if (threshold === null) return "A whole number, for example 3.";
  if (threshold === 0) return "No low stock warning";
  return `Low stock below ${threshold} ${threshold === 1 ? "unit" : "units"}`;
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

function SaveLabel({ saving, label }: { saving: boolean; label: string }) {
  if (!saving) return label;
  return (
    <>
      <LoaderCircle className="animate-spin" strokeWidth={2} aria-hidden="true" />
      Saving…
    </>
  );
}

const UNSAVED = "You have unsaved changes. Leave without saving?";

/**
 * Add or edit a product. One form for both pages: it posts saveProduct's
 * fields (see parseProductForm), keeps what the admin typed when a save
 * fails, and moves focus to the first field that needs attention. Photos are
 * saved as they are added, so they only appear once the product exists.
 */
export function ProductEditor({
  product = null,
  initialCategory = null,
  notice = null,
}: {
  /** The saved product, or null on Add product. */
  product?: EditorProduct | null;
  /** Add product only: the category to start in. */
  initialCategory?: CategorySlug | null;
  notice?: EditorNotice | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, save, saving] = useActionState(saveOrReport, {});
  const [duplicateState, duplicateAction, duplicating] = useActionState(duplicateOrReport, {});

  // What the admin's edits start from. A newer saved product replaces it after
  // the admin's own save, or when nothing has been typed; otherwise the edits
  // stay, and saving reports that the product changed.
  const [base, setBase] = useState({ product, adoptedAt: 0 });
  const [values, setValues] = useState(() => valuesFor(product, initialCategory));
  // Fields changed since the last save attempt: their old errors are hidden,
  // and what was typed in them while the save was on its way is kept.
  const [edited, setEdited] = useState<ReadonlySet<keyof Values>>(() => new Set());
  // Shown once; `at` 1 so any later message wins.
  const [flash] = useState<ToastEntry | null>(() => (notice ? { message: NOTICE[notice], at: 1 } : null));
  const [photoToast, setPhotoToast] = useState<ToastEntry | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const dirty = JSON.stringify(values) !== JSON.stringify(valuesFor(base.product, initialCategory));
  const savedNotAdopted = Boolean(state.saved && state.at && state.at !== base.adoptedAt);
  if (product && base.product && product.updatedAt !== base.product.updatedAt && (!dirty || savedNotAdopted)) {
    const typedWhileSaving = savedNotAdopted ? Object.fromEntries([...edited].map((key) => [key, values[key]])) : {};
    setBase({ product, adoptedAt: savedNotAdopted ? (state.at ?? 0) : base.adoptedAt });
    setValues({ ...valuesFor(product, initialCategory), ...typedWhileSaving });
    setEdited(new Set());
  }
  const saved = base.product;

  useEffect(() => {
    if (notice) router.replace(pathname, { scroll: false });
  }, [notice, pathname, router]);

  // After a failed save, go to the first field that needs attention.
  useEffect(() => {
    if (!state.fieldErrors) return;
    const invalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    // A group (Availability) is marked as a whole: focus its chosen option.
    const field = invalid?.matches("input, select, textarea")
      ? invalid
      : invalid?.querySelector<HTMLElement>("input:checked, input:not(:disabled)");
    field?.scrollIntoView({ behavior: "smooth", block: "center" });
    field?.focus({ preventScroll: true });
  }, [state]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setEdited((current) => (current.has(key) ? current : new Set(current).add(key)));
  }

  /** "7699" reads as "7,699" once the admin leaves the field. */
  function tidyRupees(key: "price" | "mrp") {
    const amount = parseRupees(values[key]);
    if (amount === null || Number.isNaN(amount)) return;
    const tidy = rupeeFormat.format(amount);
    if (tidy !== values[key]) setValues((current) => ({ ...current, [key]: tidy }));
  }

  // React resets a form after its action runs, which would undo the admin's
  // typing after a failed save. Dispatching the action ourselves keeps it.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setEdited(new Set());
    startTransition(() => save(data));
  }

  // While a save or duplicate is on its way, the last result's errors are out of date.
  const fieldErrors = saving ? {} : (state.fieldErrors ?? {});
  const errorFor = (field: ProductField) => (edited.has(field) ? undefined : fieldErrors[field]);
  const topError =
    saving || duplicating ? undefined : ((duplicateState.at ?? 0) > (state.at ?? 0) ? duplicateState : state).error;

  const kind = values.category === "bats" ? "bat" : values.category ? "gear" : null;
  const nextStock = countOrNull(values.stock);
  // Picking an option, even the saved one, is a choice the restock rule must not undo.
  const availabilityChosen = edited.has("availability");
  const shownAvailability = availabilityForSave(
    values.availability,
    saved?.availability ?? null,
    saved?.stock ?? null,
    nextStock,
    availabilityChosen
  );
  const liveStatus = stockStatus({
    availability: shownAvailability,
    stock: nextStock,
    lowStockThreshold: countOrNull(values.lowStockThreshold) ?? saved?.lowStockThreshold ?? 3,
  });

  // A bat stays a bat and gear stays gear, so an existing product only moves within its kind.
  const categoryOptions = CATEGORY_SLUGS.filter((slug) => !saved || (slug === "bats") === (saved.kind === "bat")).map(
    (slug) => ({ value: slug, label: categoryName(slug) })
  );
  const categoryHelp = saved ? (saved.kind === "bat" ? "Bats can't be moved to a gear category." : "Gear can't be moved to Bats.") : undefined;

  const saveLabel = saved ? "Save changes" : "Save product";
  const title = saved ? values.name.trim() || saved.name : "Add product";
  const storeHref = product && product.availability !== "hidden" && product.pricePaise > 0 ? productHref(product) : null;

  // One toast for the page: whichever message is newest.
  const toast = [flash, state.saved && state.at ? { message: state.saved, at: state.at } : null, photoToast]
    .filter((entry): entry is ToastEntry => entry !== null)
    .reduce<ToastEntry | null>((latest, entry) => (!latest || entry.at > latest.at ? entry : latest), null);

  return (
    <main className={cn(PAGE, "gap-0 pt-1 lg:gap-0 lg:pt-6")}>
      <Link
        href="/admin/products"
        onNavigate={(event) => {
          if (dirty && !window.confirm(UNSAVED)) event.preventDefault();
        }}
        className="-ml-1.5 inline-flex min-h-11 items-center gap-1 self-start rounded-sm pr-2 text-sm leading-5 font-semibold"
      >
        <ChevronLeft className="size-5" strokeWidth={1.5} aria-hidden="true" />
        Products
      </Link>

      {/* On desktop the title and Save stay in view while the form scrolls. */}
      <div className="flex flex-col gap-2 pb-5 lg:sticky lg:top-0 lg:z-20 lg:-mx-10 lg:bg-surface lg:px-10 lg:pt-2 lg:pb-4">
        <div className="flex max-w-[1048px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex min-w-0 flex-col gap-1 lg:flex-row lg:items-center lg:gap-3">
            <h1 className="type-heading-lg min-w-0 break-words lg:truncate">{title}</h1>
            {saved && <StockLabel status={liveStatus} className="self-start lg:self-auto" />}
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:flex-nowrap">
            {storeHref && (
              <a href={storeHref} target="_blank" rel="noopener noreferrer" className={BUTTON_SECONDARY}>
                <ExternalLink strokeWidth={1.5} aria-hidden="true" />
                View on store
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
            {saved && (
              <form
                action={duplicateAction}
                onSubmit={(event) => {
                  if (dirty && !window.confirm("You have unsaved changes. The copy is made from the last saved version. Duplicate anyway?")) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="productId" value={saved.id} />
                <button type="submit" disabled={duplicating} className={BUTTON_SECONDARY}>
                  <Copy strokeWidth={1.5} aria-hidden="true" />
                  {duplicating ? "Duplicating…" : "Duplicate"}
                </button>
              </form>
            )}
            <button type="submit" form={FORM_ID} disabled={saving} className={cn(BUTTON_PRIMARY, "hidden min-w-36 lg:inline-flex")}>
              <SaveLabel saving={saving} label={saveLabel} />
            </button>
          </div>
        </div>
        <div className="hidden max-w-[1048px] lg:flex lg:justify-end">
          <ErrorLine message={topError} />
        </div>
      </div>

      <form
        ref={formRef}
        id={FORM_ID}
        onSubmit={submit}
        className="flex max-w-[1048px] flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[auto_1fr] lg:gap-x-12"
      >
        {saved && (
          <>
            <input type="hidden" name="id" value={saved.id} />
            <input type="hidden" name="updatedAt" value={saved.updatedAt} />
          </>
        )}

        <div className="flex min-w-0 flex-col lg:col-start-1 lg:row-start-1">
          <EditorSection id="basic-title" title="Basic information">
            <TextField
              id="field-name"
              name="name"
              label="Product name"
              value={values.name}
              onValueChange={(value) => set("name", value)}
              maxLength={PRODUCT_LIMITS.name}
              autoComplete="off"
              error={errorFor("name")}
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <SelectField
                id="field-category"
                name="category"
                label="Category"
                value={values.category}
                onValueChange={(value) => set("category", value)}
                options={categoryOptions}
                placeholder={saved ? undefined : "Choose a category"}
                help={categoryHelp}
                error={errorFor("category")}
              />
              {kind === "bat" && (
                <SelectField
                  id="field-subcategory"
                  name="subcategory"
                  label="Willow type"
                  value={values.subcategory}
                  onValueChange={(value) => set("subcategory", value)}
                  options={BAT_SUBCATEGORIES.map((entry) => ({ value: entry.slug, label: entry.name }))}
                  error={errorFor("subcategory")}
                />
              )}
            </div>
          </EditorSection>

          <EditorSection id="pricing-title" title="Pricing">
            <div className="flex flex-col gap-1.5">
              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                <TextField
                  id="field-mrp"
                  name="mrp"
                  label="MRP"
                  optional
                  prefix="₹"
                  inputMode="numeric"
                  autoComplete="off"
                  value={values.mrp}
                  onValueChange={(value) => set("mrp", value)}
                  onBlur={() => tidyRupees("mrp")}
                  aria-describedby="price-help"
                  error={errorFor("mrp")}
                />
                <TextField
                  id="field-price"
                  name="price"
                  label="Price"
                  prefix="₹"
                  inputMode="numeric"
                  autoComplete="off"
                  value={values.price}
                  onValueChange={(value) => set("price", value)}
                  onBlur={() => tidyRupees("price")}
                  aria-describedby="price-help"
                  error={errorFor("price")}
                />
              </div>
              <PriceHelp price={values.price} mrp={values.mrp} />
            </div>
          </EditorSection>
        </div>

        <div className="flex min-w-0 flex-col lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <EditorSection id="inventory-title" title="Inventory">
            <StockField
              id="field-stock"
              label="Stock quantity"
              value={values.stock}
              onValueChange={(value) => set("stock", value)}
              help="Leave empty if you haven't counted it. It stays on sale until it's counted."
              error={errorFor("stock")}
            />
            <TextField
              id="field-lowStockThreshold"
              name="lowStockThreshold"
              label="Low stock threshold"
              inputMode="numeric"
              autoComplete="off"
              value={values.lowStockThreshold}
              onValueChange={(value) => set("lowStockThreshold", value)}
              help={thresholdHelp(values.lowStockThreshold)}
              error={errorFor("lowStockThreshold")}
            />
            <TextField
              id="field-sku"
              name="sku"
              label="SKU"
              optional
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={PRODUCT_LIMITS.sku}
              value={values.sku}
              onValueChange={(value) => set("sku", value.toUpperCase())}
              error={errorFor("sku")}
            />
          </EditorSection>

          <EditorSection id="availability-title" title="Availability">
            {availabilityChosen && <input type="hidden" name="availabilityChosen" value="1" />}
            <AvailabilityChoice
              labelledBy="availability-title"
              value={shownAvailability}
              onChange={(value) => set("availability", value)}
              noStock={nextStock === 0}
              note={availabilityNote(values.availability, shownAvailability)}
              error={errorFor("availability")}
            />
          </EditorSection>

          <EditorSection id="media-title" title="Media">
            {product ? (
              <ProductPhotos
                productId={product.id}
                photos={product.photos}
                onSaved={(message) => setPhotoToast({ message, at: Date.now() })}
              />
            ) : (
              <FieldHelp>You can add photos once the product is saved.</FieldHelp>
            )}
          </EditorSection>
        </div>

        <div className="flex min-w-0 flex-col lg:col-start-1 lg:row-start-2 lg:self-start">
          <EditorSection id="details-title" title="Product details">
            {kind === "bat" && (
              <div className="grid gap-4 lg:grid-cols-2">
                <TextField
                  id="field-grade"
                  name="grade"
                  label="Grade"
                  optional
                  maxLength={PRODUCT_LIMITS.grade}
                  value={values.grade}
                  onValueChange={(value) => set("grade", value)}
                  help="For example Grade 4 English Willow."
                  error={errorFor("grade")}
                />
                <TextField
                  id="field-tagline"
                  name="tagline"
                  label="Tagline"
                  optional
                  maxLength={PRODUCT_LIMITS.tagline}
                  value={values.tagline}
                  onValueChange={(value) => set("tagline", value)}
                  help="A short line beside the name."
                  error={errorFor("tagline")}
                />
              </div>
            )}
            {kind === "gear" && (
              <TextField
                id="field-line"
                name="line"
                label="Range"
                optional
                maxLength={PRODUCT_LIMITS.line}
                value={values.line}
                onValueChange={(value) => set("line", value)}
                help="For example Elite."
                error={errorFor("line")}
              />
            )}
            <TextAreaField
              id="field-shortDescription"
              name="shortDescription"
              label="Short description"
              optional
              rows={3}
              maxLength={PRODUCT_LIMITS.shortDescription}
              value={values.shortDescription}
              onValueChange={(value) => set("shortDescription", value)}
              help={
                kind === "bat"
                  ? "The willow grade note on the product page."
                  : kind === "gear"
                    ? "Shown after the range, for example Pro sheepskin palm."
                    : undefined
              }
              error={errorFor("shortDescription")}
            />
            {kind === "bat" && (
              <TextAreaField
                id="field-description"
                name="description"
                label="Product details"
                optional
                rows={4}
                maxLength={PRODUCT_LIMITS.description}
                value={values.description}
                onValueChange={(value) => set("description", value)}
                help="The Product details text on the product page."
                error={errorFor("description")}
              />
            )}
          </EditorSection>

          {kind === "bat" && values.subcategory === "english-willow" && (
            <ProductCustomization
              value={values.customization}
              onChange={(value) => set("customization", value)}
              error={errorFor("customization")}
            />
          )}
        </div>

        {/* Phones: Save sits in a bar above the home indicator (the tab bar is hidden here). */}
        <div aria-hidden="true" className={cn("shrink-0 lg:hidden", topError ? "h-32" : "h-20")} />
        <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-2 border-t border-border bg-surface-raised px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] lg:hidden">
          <ErrorLine message={topError} />
          <button type="submit" disabled={saving} className={cn(BUTTON_PRIMARY, "min-h-12 w-full")}>
            <SaveLabel saving={saving} label={saveLabel} />
          </button>
        </div>
      </form>

      <Toast message={toast?.message} at={toast?.at} />
    </main>
  );
}
