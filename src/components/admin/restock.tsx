"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Dialog } from "@base-ui/react/dialog";

import { formatPaise } from "@/lib/format";
import { saveStock, type ProductActionState } from "@/lib/products/admin-actions";
import { cn } from "@/lib/utils";

import { ErrorLine, hasVariants, isRestockable, listStatus, ProductThumb, type ProductListItem } from "./product-row";
import { safeAction } from "./safe-action";
import { StockLabel } from "./stock-label";
import { BUTTON_PRIMARY, FIELD_LABEL } from "./styles";
import { countFields, fieldCounts, fieldsChanged, StockFields, type CountFields } from "./variant-stock";

const safeSaveStock = safeAction(saveStock);

/** A stock count that was saved, for the page's toast. */
export interface StockSaved {
  message: string;
  at: number;
}

type StockItem = Pick<ProductListItem, "id" | "name" | "stock" | "variants" | "counts" | "lowStockThreshold" | "availability">;

/** "Restock G.O.A.T" when the count ran out; "Update stock" when correcting one. */
export function stockFormTitle(item: StockItem): string {
  return isRestockable(item) ? `Restock ${item.name}` : `Update stock for ${item.name}`;
}

/**
 * A restock starts at 10, as in the design; a correction starts at the
 * current count. A product sold in several sizes or hands starts at its
 * current counts, since a restock rarely brings the same number of each.
 */
function initialCounts(item: StockItem): CountFields {
  if (hasVariants(item) || (item.stock !== null && item.stock > 0)) return countFields(item);
  return { [item.variants[0].key]: isRestockable(item) ? "10" : "" };
}

/** What saving will do to the product, beyond the count. */
function stockHelp(item: StockItem): string {
  if (item.availability === "hidden") return "It stays hidden until you make it available.";
  if (isRestockable(item)) return "Stock above 0 makes it available again.";
  if (item.availability === "out_of_stock") return "It stays out of stock until you make it available.";
  if (hasVariants(item)) return "A size at 0 can't be bought. With every one at 0 it is marked as out of stock.";
  return "0 marks it as out of stock.";
}

function currentText(item: StockItem): string {
  return `Current stock: ${item.stock ?? "not set"}${hasVariants(item) && item.stock !== null ? " in all" : ""}`;
}

/**
 * New stock for one product (each size and hand, when it is sold in
 * several), from the Restock sheet on phones or the panel under a row on
 * desktop. On success it calls `onSaved`, and the caller
 * closes it and shows the toast. The sheet layout leaves the title to the
 * sheet; the inline layout draws its own and closes on Escape.
 */
export function RestockForm({
  item,
  layout,
  onCancel,
  onSaved,
  autoFocus,
  inputRef,
}: {
  item: StockItem;
  layout: "sheet" | "inline";
  onCancel: () => void;
  onSaved: (saved: StockSaved) => void;
  /** Focus the field once shown (the desktop panel; the sheet moves focus itself). */
  autoFocus?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const fieldId = useId();
  const helpId = `${fieldId}-help`;
  const errorId = `${fieldId}-error`;
  const ownRef = useRef<HTMLInputElement>(null);
  const fieldRef = inputRef ?? ownRef;

  const [fields, setFields] = useState(() => initialCounts(item));
  // The counts last sent, so their error goes away once the admin changes one.
  const [sent, setSent] = useState<CountFields | null>(null);
  const [state, action, pending] = useActionState(async (previous: ProductActionState, form: FormData) => {
    const result = await safeSaveStock(previous, form);
    const { saved, at } = result;
    if (saved) startTransition(() => onSaved({ message: saved, at: at ?? Date.now() }));
    return result;
  }, {});

  useEffect(() => {
    if (autoFocus) fieldRef.current?.focus();
  }, [autoFocus, fieldRef]);

  const fieldError = fields === sent ? state.fieldErrors?.stock : undefined;
  const counts = fieldCounts(item, fields);
  // Nothing to save: no count was entered, or none differs from what is saved.
  const nothingToSave = counts === null || !fieldsChanged(item, fields);

  // Dispatched by hand so React does not reset the form after a failed save.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (nothingToSave || pending) return;
    setSent(fields);
    const data = new FormData();
    data.set("stock", JSON.stringify({ id: item.id, counts, from: item.counts }));
    startTransition(() => action(data));
  }

  function closeOnEscape(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    onCancel();
  }

  const several = hasVariants(item);
  const stepper = (
    <StockFields
      id={fieldId}
      item={item}
      subject="new stock"
      fields={fields}
      onChange={(key, value) => setFields((current) => ({ ...current, [key]: value }))}
      hasVisibleLabel
      // A column of large steppers would fill the sheet.
      size={layout === "sheet" && !several ? "lg" : "md"}
      surface={layout === "sheet" ? "sunken" : "raised"}
      invalid={Boolean(fieldError)}
      describedBy={fieldError ? `${errorId} ${helpId}` : helpId}
      inputRef={fieldRef}
      className={layout === "sheet" ? "w-full" : "min-w-56"}
    />
  );
  // One field has a label beside it; several have their own, under a heading.
  const fieldLabel = several ? (
    <span className={FIELD_LABEL}>New stock</span>
  ) : (
    <label htmlFor={fieldId} className={FIELD_LABEL}>
      New stock
    </label>
  );
  const saveButton = (
    <button
      type="submit"
      disabled={nothingToSave}
      aria-disabled={pending || undefined}
      className={cn(BUTTON_PRIMARY, layout === "sheet" && "min-h-12 w-full", pending && "cursor-progress opacity-80")}
    >
      {pending ? "Saving…" : "Save stock"}
    </button>
  );
  const cancelButton = (
    <button
      type="button"
      onClick={onCancel}
      className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-sm px-3 text-sm leading-5 font-semibold hover:bg-border/60"
    >
      Cancel
    </button>
  );

  if (layout === "inline") {
    return (
      <form onSubmit={submit} onKeyDown={closeOnEscape} className="flex flex-col gap-2 rounded-sm bg-surface-sunken px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="flex min-w-42 flex-col">
            <h2 className="text-[15px] leading-[22px] font-semibold">{stockFormTitle(item)}</h2>
            <span className="text-[13px] leading-[18px] text-ink-muted tabular-nums">{currentText(item)}</span>
          </div>
          <div className={cn("flex gap-3", several ? "flex-col" : "items-center")}>
            {fieldLabel}
            {stepper}
          </div>
          <p id={helpId} className="min-w-40 flex-1 text-[13px] leading-[18px] text-ink-muted">
            {stockHelp(item)}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {cancelButton}
            {saveButton}
          </div>
        </div>
        <ErrorLine id={errorId} message={fieldError} />
        <ErrorLine message={state.error} />
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col">
      <div className="flex min-h-12 items-center justify-between gap-3 border-y border-border">
        <span className="text-[15px] leading-[22px] font-semibold tabular-nums">{currentText(item)}</span>
        <StockLabel status={listStatus(item)} />
      </div>
      <div className={cn("flex flex-col gap-2 pt-5", !several && "items-start")}>
        {fieldLabel}
        {stepper}
        <ErrorLine id={errorId} message={fieldError} />
        <p id={helpId} className="text-[13px] leading-[18px] text-ink-muted">
          {stockHelp(item)}
        </p>
      </div>
      <ErrorLine message={state.error} className="mt-4" />
      <div className="mt-5 flex flex-col gap-1">
        {saveButton}
        {cancelButton}
      </div>
    </form>
  );
}

type FocusTarget = boolean | HTMLElement | null | void;

/**
 * A bottom sheet on phones and a small centred dialog on desktop. Focus stays
 * inside while it is open; Escape, the backdrop and Cancel close it, and
 * `finalFocus` says where focus goes afterwards (the button that opened it).
 */
export function Sheet({
  open,
  onClose,
  initialFocus,
  finalFocus,
  children,
}: {
  open: boolean;
  onClose: () => void;
  initialFocus?: () => FocusTarget;
  finalFocus: () => FocusTarget;
  children: ReactNode;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-surface-dark/40 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup
          initialFocus={initialFocus ?? true}
          finalFocus={finalFocus}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[calc(100dvh-2rem)] flex-col overflow-y-auto rounded-t-lg bg-surface-raised px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] text-foreground shadow-float outline-none",
            "transition-[translate,opacity] duration-200 motion-reduce:transition-none max-lg:data-ending-style:translate-y-full max-lg:data-starting-style:translate-y-full",
            "lg:inset-x-auto lg:top-1/2 lg:bottom-auto lg:left-1/2 lg:w-105 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-sm lg:p-6 lg:data-ending-style:opacity-0 lg:data-starting-style:opacity-0"
          )}
        >
          <span aria-hidden="true" className="mb-3 h-1 w-9 shrink-0 self-center rounded-full bg-ink-subtle/40 lg:hidden" />
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Where the Restock sheet puts focus: the field, or on a touch screen the
 * title, so the number pad does not cover the sheet.
 */
export function stockSheetFocus(title: HTMLElement | null, field: HTMLElement | null): FocusTarget {
  return (window.matchMedia("(pointer: coarse)").matches ? title : field) ?? true;
}

/** The Restock sheet's contents: title, which product, then the form. */
export function StockSheetBody({
  item,
  titleRef,
  fieldRef,
  onCancel,
  onSaved,
}: {
  item: StockItem & Pick<ProductListItem, "detail" | "image" | "pricePaise">;
  titleRef: RefObject<HTMLHeadingElement | null>;
  fieldRef: RefObject<HTMLInputElement | null>;
  onCancel: () => void;
  onSaved: (saved: StockSaved) => void;
}) {
  return (
    <>
      <Dialog.Title ref={titleRef} tabIndex={-1} className="mb-3 text-lg leading-6 font-semibold focus:outline-none">
        {stockFormTitle(item)}
      </Dialog.Title>
      <div className="flex items-center gap-3 pb-3">
        <ProductThumb src={item.image} />
        <span className="min-w-0 text-[15px] leading-[22px] tabular-nums">
          {item.detail} · {formatPaise(item.pricePaise)}
        </span>
      </div>
      <RestockForm item={item} layout="sheet" inputRef={fieldRef} onCancel={onCancel} onSaved={onSaved} />
    </>
  );
}

/**
 * Restock one product from anywhere (Home uses it): the sheet opens on the
 * product, and closes with a toast once the count is saved. It stays mounted
 * so it slides in and out; a new `session` starts the form afresh.
 */
export function RestockSheet({
  item,
  open,
  session,
  onClose,
  onSaved,
  finalFocus,
}: {
  item: ProductListItem | null;
  open: boolean;
  session: number;
  onClose: () => void;
  onSaved: (saved: StockSaved) => void;
  finalFocus: () => FocusTarget;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      initialFocus={() => stockSheetFocus(titleRef.current, fieldRef.current)}
      finalFocus={finalFocus}
    >
      {item && (
        <StockSheetBody key={session} item={item} titleRef={titleRef} fieldRef={fieldRef} onCancel={onClose} onSaved={onSaved} />
      )}
    </Sheet>
  );
}
