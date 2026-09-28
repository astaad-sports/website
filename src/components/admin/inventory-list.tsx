"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";

import type { VariantStock } from "@/db/schema";
import { saveStock, saveStocks, type ProductActionState } from "@/lib/products/admin-actions";
import { availabilityForStock, type StockStatus } from "@/lib/products/model";
import { sameCounts, totalStock } from "@/lib/products/variants";
import { cn } from "@/lib/utils";

import { editorHref, ErrorLine, hasVariants, listStatus, ProductThumb, variantsOut, type ProductListItem } from "./product-row";
import { safeAction } from "./safe-action";
import { StockLabel } from "./stock-label";
import { BUTTON_PRIMARY } from "./styles";
import { Toast } from "./toast";
import { countFields, fieldCounts, StockFields, type CountFields } from "./variant-stock";

const safeSaveStock = safeAction(saveStock);
const safeSaveStocks = safeAction(saveStocks);

/** A product's counts being edited, and the saved counts they started from. */
interface Draft {
  fields: CountFields;
  base: VariantStock | null;
}

interface RowSaveState extends ProductActionState {
  productId?: string;
}

type Place = "list" | "table";

function fieldId(place: Place, itemId: string): string {
  return `inventory-${place}-${itemId}`;
}

/** Focus whichever of these is on screen (the phone list or the desktop table). */
function focusShown(ids: string[]) {
  for (const id of ids) {
    const element = document.getElementById(id);
    if (element && element.getClientRects().length > 0) {
      element.focus({ preventScroll: true });
      return;
    }
  }
}

/** The product as it will be once these counts are saved. */
function withCounts(item: ProductListItem, counts: VariantStock | null): ProductListItem {
  const stock = totalStock(counts);
  return { ...item, counts, stock, availability: availabilityForStock(item.availability, item.stock, stock) };
}

/** What the admin will show once these counts are saved. */
function statusFor(item: ProductListItem, counts: VariantStock | null): StockStatus {
  return listStatus(withCounts(item, counts));
}

/**
 * The status, plus "Stock not set" or the total it had before this edit, and
 * the sizes and hands that have run out.
 */
function StatusLine({ item, counts, changed }: { item: ProductListItem; counts: VariantStock | null; changed: boolean }) {
  const out = variantsOut(withCounts(item, counts));
  const note = "text-[13px] leading-[18px] text-ink-muted";
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
      <StockLabel status={statusFor(item, counts)} />
      {changed ? (
        <span className={cn(note, "tabular-nums")}>
          · was {item.stock ?? "not set"}
          {hasVariants(item) && item.stock !== null && " in all"}
        </span>
      ) : (
        item.stock === null && <span className={note}>· Stock not set</span>
      )}
      {out && <span className={note}>· None left: {out}</span>}
    </span>
  );
}

interface StockControl {
  fields: CountFields;
  onChange: (key: string, value: string) => void;
  changed: boolean;
  saving: boolean;
  error?: string;
  onSave: () => void;
}

/**
 * [ − ] n [ + ] (one for each size and hand of a product sold in several)
 * and, once a count changed, the Save button. Enter saves too.
 */
function StockForm({ item, place, control, children }: { item: ProductListItem; place: Place; control: StockControl; children?: ReactNode }) {
  const id = fieldId(place, item.id);
  const errorId = `${id}-error`;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (control.changed && !control.saving) control.onSave();
  }

  const stepper = (
    <StockFields
      id={id}
      item={item}
      subject={`stock for ${item.name}`}
      fields={control.fields}
      onChange={control.onChange}
      placeholder="–"
      invalid={Boolean(control.error)}
      describedBy={control.error ? errorId : undefined}
      className="w-full max-w-64"
    />
  );
  const save = control.changed && (
    <button
      type="submit"
      aria-disabled={control.saving || undefined}
      className={cn(BUTTON_PRIMARY, control.saving && "cursor-progress opacity-80")}
    >
      {control.saving ? "Saving…" : "Save"}
      <span className="sr-only"> stock for {item.name}</span>
    </button>
  );

  // A product sold in several sizes or hands has a column of steppers, with Save under it.
  const several = hasVariants(item);

  if (place === "table") {
    return (
      <form onSubmit={submit} className="flex flex-col gap-1.5 py-2">
        <span className={cn("flex gap-2", several ? "flex-col items-start" : "items-center")}>
          {stepper}
          {save}
        </span>
        <ErrorLine id={errorId} message={control.error} />
      </form>
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-2 py-2.5">
      {several ? (
        <>
          <span className="flex min-h-11 items-center gap-3">{children}</span>
          {stepper}
        </>
      ) : (
        <span className="flex min-h-11 items-center gap-3">
          {children}
          {stepper}
        </span>
      )}
      {save && <span className="flex justify-end">{save}</span>}
      <ErrorLine id={errorId} message={control.error} />
    </form>
  );
}

const TH = "h-10 bg-surface-sunken px-3 text-left text-xs leading-4 font-semibold tracking-[0.08em] text-ink-muted uppercase";
const TD = "h-16 border-b border-border px-3 text-sm leading-5";

/**
 * Every product's stock on one page, the ones needing attention first. Each
 * row has its own stepper (one for each size and hand of a product sold in
 * several) and a Save that appears once a count changes;
 * with several changes, "Save all changes" saves them together. Rows keep
 * the order they opened in, so a saved row never jumps away.
 */
export function InventoryList({ items, empty }: { items: ProductListItem[]; empty: ReactNode }) {
  const [order] = useState(() => items.map((item) => item.id));
  const position = (id: string) => {
    const index = order.indexOf(id);
    return index === -1 ? order.length : index;
  };
  const rows = [...items].sort((a, b) => position(a.id) - position(b.id));

  // A draft only counts while the saved counts are still the ones it started from.
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const fieldsOf = (item: ProductListItem) => {
    const draft = drafts[item.id];
    return draft && sameCounts(draft.base, item.counts) ? draft.fields : countFields(item);
  };
  const countsOf = (item: ProductListItem) => fieldCounts(item, fieldsOf(item));
  const isChanged = (item: ProductListItem) => !sameCounts(countsOf(item), item.counts);
  const changed = rows.filter(isChanged);

  const [sending, setSending] = useState<string | null>(null);
  const [rowState, saveRow, rowPending] = useActionState(async (previous: RowSaveState, form: FormData): Promise<RowSaveState> => {
    const productId = String(form.get("productId") ?? "");
    return { ...(await safeSaveStock(previous, form)), productId };
  }, {});
  const [allState, saveAll, allPending] = useActionState(safeSaveStocks, {});
  const savedTogether = useRef<string[]>([]);

  // A saved row loses its Save button, so focus goes to its stepper field.
  useEffect(() => {
    if (rowState.saved && rowState.productId) focusShown([fieldId("list", rowState.productId), fieldId("table", rowState.productId)]);
  }, [rowState]);
  useEffect(() => {
    const [first] = savedTogether.current;
    if (allState.saved && first) focusShown([fieldId("list", first), fieldId("table", first)]);
  }, [allState]);

  function change(item: ProductListItem, key: string, value: string) {
    const fields = { ...fieldsOf(item), [key]: value };
    setDrafts((current) => ({ ...current, [item.id]: { fields, base: item.counts } }));
  }

  function save(item: ProductListItem) {
    const form = new FormData();
    form.set("productId", item.id);
    form.set("stock", JSON.stringify({ id: item.id, counts: countsOf(item), from: item.counts }));
    setSending(item.id);
    startTransition(() => saveRow(form));
  }

  // The bar (and the Discard button) goes away, so focus goes to the first row that changed.
  function discard() {
    const [first] = changed;
    setDrafts({});
    if (first) focusShown([fieldId("list", first.id), fieldId("table", first.id)]);
  }

  function saveChanged() {
    if (allPending) return;
    savedTogether.current = changed.map((item) => item.id);
    const form = new FormData();
    form.set(
      "stocks",
      JSON.stringify(changed.map((item) => ({ id: item.id, counts: countsOf(item), from: item.counts })))
    );
    startTransition(() => saveAll(form));
  }

  const rowAt = rowState.at ?? 0;
  const allAt = allState.at ?? 0;
  const latest = rowAt > allAt ? rowState : allState;
  const errorFor = (item: ProductListItem) =>
    rowState.productId === item.id && rowAt > allAt ? (rowState.fieldErrors?.stock ?? rowState.error) : undefined;

  const controlFor = (item: ProductListItem): StockControl => ({
    fields: fieldsOf(item),
    onChange: (key, value) => change(item, key, value),
    changed: isChanged(item),
    saving: rowPending && sending === item.id,
    error: errorFor(item),
    onSave: () => save(item),
  });

  if (rows.length === 0) return empty;

  return (
    <>
      <ul aria-label="Stock by product" className="flex flex-col border-t border-border lg:hidden">
        {rows.map((item) => {
          const control = controlFor(item);
          return (
            <li key={item.id} className="border-b border-border">
              <StockForm item={item} place="list" control={control}>
                <Link href={editorHref(item)} className="flex min-w-0 flex-1 flex-col gap-1 rounded-sm">
                  <span className="truncate text-[15px] leading-[22px] font-semibold">{item.name}</span>
                  <StatusLine item={item} counts={fieldCounts(item, control.fields)} changed={control.changed} />
                </Link>
              </StockForm>
            </li>
          );
        })}
      </ul>

      <table className="hidden w-full border-collapse lg:table">
        <thead>
          <tr>
            <th scope="col" className={TH}>
              Product
            </th>
            <th scope="col" className={cn(TH, "w-72")}>
              Stock
            </th>
            <th scope="col" className={cn(TH, "w-60")}>
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => {
            const control = controlFor(item);
            return (
              <tr key={item.id} className="transition-colors hover:bg-surface-sunken/60">
                <td className={cn(TD, "max-w-0")}>
                  <Link href={editorHref(item)} className="flex min-w-0 items-center gap-3 py-2">
                    <ProductThumb src={item.image} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-semibold">{item.name}</span>
                      {item.sku && <span className="truncate text-[13px] leading-[18px] text-ink-muted">{item.sku}</span>}
                    </span>
                  </Link>
                </td>
                <td className={TD}>
                  <StockForm item={item} place="table" control={control} />
                </td>
                <td className={TD}>
                  <StatusLine item={item} counts={fieldCounts(item, control.fields)} changed={control.changed} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {changed.length > 1 && (
        <>
          <div aria-hidden="true" className="h-20 shrink-0 lg:hidden" />
          <div
            role="region"
            aria-label="Unsaved stock changes"
            className={cn(
              "fixed inset-x-0 bottom-16 z-20 flex flex-col gap-2 border-t border-border bg-surface-raised px-4 py-3",
              "lg:sticky lg:inset-x-auto lg:bottom-6 lg:self-end lg:rounded-sm lg:border-0 lg:bg-surface-sunken lg:py-1 lg:pr-1 lg:pl-4 lg:shadow-float"
            )}
          >
            <ErrorLine message={allState.error && allAt >= rowAt ? allState.error : undefined} className="lg:pt-2" />
            <div className="flex items-center gap-2">
              <span className="flex-1 text-sm leading-5 font-semibold whitespace-nowrap tabular-nums lg:mr-2">
                {changed.length} <span className="max-lg:sr-only">unsaved </span>changes
              </span>
              <button
                type="button"
                onClick={discard}
                className="inline-flex min-h-11 cursor-pointer items-center rounded-sm px-3 text-sm leading-5 font-semibold hover:bg-border/60"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={saveChanged}
                aria-disabled={allPending || undefined}
                className={cn(BUTTON_PRIMARY, allPending && "cursor-progress opacity-80")}
              >
                {allPending ? "Saving…" : "Save all changes"}
              </button>
            </div>
          </div>
        </>
      )}

      <Toast message={latest.saved} at={latest.at} />
    </>
  );
}
