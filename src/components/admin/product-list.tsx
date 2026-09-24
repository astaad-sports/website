"use client";

import { Fragment, startTransition, useActionState, useOptimistic, useState, type ReactNode } from "react";
import Link from "next/link";
import { EllipsisVertical, Plus } from "lucide-react";

import type { ProductAvailability } from "@/db/schema";
import { changeAvailability, duplicate, type ProductActionState } from "@/lib/products/admin-actions";
import { stockStatus } from "@/lib/products/model";
import { cn } from "@/lib/utils";

import { ProductActionsSheet, ProductMenu, type ProductMenuHandlers } from "./product-menu";
import {
  editorHref,
  ErrorLine,
  isRestockable,
  menuTriggerId,
  ProductPrice,
  ProductThumb,
  stockText,
  stockTone,
  type ProductListItem,
} from "./product-row";
import { RestockForm, type StockSaved } from "./restock";
import { safeAction } from "./safe-action";
import { StockLabel } from "./stock-label";
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from "./styles";
import { Toast } from "./toast";

const safeDuplicate = safeAction(duplicate);
const safeChangeAvailability = safeAction(changeAvailability);

/** A row action's result, and which product it was for. */
interface RowActionState extends ProductActionState {
  productId?: string;
}

/** The phone sheet: which product, which view, and where focus goes back to. */
interface SheetState {
  item: ProductListItem;
  view: "menu" | "stock";
  open: boolean;
  trigger: HTMLElement | null;
  /** A saved count may remove the Restock button, so focus goes to the row menu instead. */
  saved: boolean;
  /** A new sheet starts fresh, even while the last one is still closing. */
  session: number;
}

/** The desktop panel under a row. */
interface PanelState {
  id: string;
  trigger: HTMLElement | null;
  /** Opening it again starts over and takes focus again. */
  session: number;
}

const AVAILABILITIES: ProductAvailability[] = ["available", "out_of_stock", "hidden"];

function isAvailability(value: unknown): value is ProductAvailability {
  return AVAILABILITIES.includes(value as ProductAvailability);
}

function rowForm(item: ProductListItem, fields: Record<string, string>): FormData {
  const form = new FormData();
  form.set("productId", item.id);
  for (const [name, value] of Object.entries(fields)) form.set(name, value);
  return form;
}

/** One product on phones: photo, name, status, price and stock; Restock sits on rows that ran out. */
function ProductListRow({
  item,
  error,
  onOpenMenu,
  onRestock,
}: {
  item: ProductListItem;
  error?: string;
  onOpenMenu: (trigger: HTMLElement) => void;
  onRestock: (trigger: HTMLElement) => void;
}) {
  return (
    <li className="flex flex-col gap-3 border-b border-border py-3">
      <div className="flex items-center gap-1">
        <Link
          href={editorHref(item)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-sm transition-colors hover:bg-surface-sunken/60"
        >
          <ProductThumb src={item.image} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-[15px] leading-[22px] font-semibold">{item.name}</span>
              <StockLabel status={stockStatus(item)} className="shrink-0" />
            </span>
            <span className="truncate text-[13px] leading-[18px] text-ink-muted">{item.detail}</span>
            <span className="mt-0.5 flex flex-wrap items-center justify-between gap-x-2">
              <ProductPrice pricePaise={item.pricePaise} mrpPaise={item.mrpPaise} className="text-[15px] leading-[22px]" />
              <span className={cn("text-[13px] leading-[18px] whitespace-nowrap tabular-nums", stockTone(item))}>
                {stockText(item.stock)}
              </span>
            </span>
          </span>
        </Link>
        <button
          type="button"
          id={menuTriggerId(item.id, "list")}
          aria-label={`More actions for ${item.name}`}
          aria-haspopup="dialog"
          onClick={(event) => onOpenMenu(event.currentTarget)}
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm text-ink-muted transition-colors hover:bg-surface-sunken"
        >
          <EllipsisVertical className="size-5" strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
      {isRestockable(item) && (
        <div className="flex gap-2 pl-15">
          <button type="button" aria-haspopup="dialog" onClick={(event) => onRestock(event.currentTarget)} className={BUTTON_PRIMARY}>
            <Plus strokeWidth={2} aria-hidden="true" />
            Restock<span className="sr-only"> {item.name}</span>
          </button>
          <Link href={editorHref(item)} className={BUTTON_SECONDARY}>
            Edit product<span className="sr-only">, {item.name}</span>
          </Link>
        </div>
      )}
      <ErrorLine message={error} className="pl-15" />
    </li>
  );
}

const TH = "h-10 bg-surface-sunken px-3 text-left text-xs leading-4 font-semibold tracking-[0.08em] text-ink-muted uppercase";
const TD = "h-16 border-b border-border px-3 text-sm leading-5";

/**
 * The product list as a plain table on desktop, with Restock opening a panel
 * under its row. The product column keeps room for a name; on a narrow
 * desktop the table scrolls sideways rather than squeezing it out.
 */
function ProductTable({
  items,
  label,
  errorFor,
  panel,
  onTogglePanel,
  onOpenPanel,
  onClosePanel,
  onStockSaved,
  handlersFor,
  className,
}: {
  items: ProductListItem[];
  label: string;
  errorFor: (id: string) => string | undefined;
  panel: PanelState | null;
  onTogglePanel: (item: ProductListItem, trigger: HTMLElement) => void;
  onOpenPanel: (item: ProductListItem) => void;
  onClosePanel: (saved: boolean) => void;
  onStockSaved: (saved: StockSaved) => void;
  handlersFor: (item: ProductListItem) => ProductMenuHandlers;
  className?: string;
}) {
  return (
    <div className={cn("-mx-1 overflow-x-auto px-1 pb-1", className)}>
      <table aria-label={label} className="w-full border-collapse">
        <thead>
          <tr>
            <th scope="col" className={TH}>
              Product
            </th>
            <th scope="col" className={cn(TH, "w-44")}>
              Price
            </th>
            <th scope="col" className={cn(TH, "w-23")}>
              Stock
            </th>
            <th scope="col" className={cn(TH, "w-36")}>
              Availability
            </th>
            <th scope="col" className={cn(TH, "w-px")}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const panelOpen = panel?.id === item.id;
            const panelId = `restock-panel-${item.id}`;
            const error = errorFor(item.id);
            return (
              <Fragment key={item.id}>
                <tr className={cn("transition-colors hover:bg-surface-sunken/60", (panelOpen || error) && "[&>td]:border-transparent")}>
                  <td className={cn(TD, "max-w-0 min-w-48")}>
                    <Link href={editorHref(item)} className="flex min-w-0 items-center gap-3 py-2">
                      <ProductThumb src={item.image} />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-semibold">{item.name}</span>
                        <span className="truncate text-[13px] leading-[18px] text-ink-muted">{item.detail}</span>
                      </span>
                    </Link>
                  </td>
                  <td className={TD}>
                    {/* The MRP and discount wrap under the price, leaving the name room. */}
                    <ProductPrice pricePaise={item.pricePaise} mrpPaise={item.mrpPaise} className="flex-wrap gap-y-0.5" />
                  </td>
                  <td className={cn(TD, "tabular-nums", stockTone(item))}>{item.stock ?? "Not set"}</td>
                  <td className={TD}>
                    <StockLabel status={stockStatus(item)} />
                  </td>
                  <td className={cn(TD, "pr-0")}>
                    <div className="flex items-center justify-end gap-2">
                      {isRestockable(item) && (
                        <>
                          <button
                            type="button"
                            aria-expanded={panelOpen}
                            aria-controls={panelOpen ? panelId : undefined}
                            onClick={(event) => onTogglePanel(item, event.currentTarget)}
                            className={BUTTON_PRIMARY}
                          >
                            <Plus strokeWidth={2} aria-hidden="true" />
                            Restock<span className="sr-only"> {item.name}</span>
                          </button>
                          <Link href={editorHref(item)} className={BUTTON_SECONDARY}>
                            Edit product<span className="sr-only">, {item.name}</span>
                          </Link>
                        </>
                      )}
                      <ProductMenu item={item} onUpdateStock={() => onOpenPanel(item)} {...handlersFor(item)} />
                    </div>
                  </td>
                </tr>
                {error && (
                  <tr>
                    <td colSpan={5} className={cn("border-b border-border px-3 pb-3", panelOpen && "border-transparent")}>
                      <ErrorLine message={error} />
                    </td>
                  </tr>
                )}
                {panelOpen && (
                  <tr>
                    <td colSpan={5} id={panelId} className="border-b border-border pb-3">
                      <RestockForm
                        key={panel.session}
                        item={item}
                        layout="inline"
                        autoFocus
                        onCancel={() => onClosePanel(false)}
                        onSaved={onStockSaved}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The admin's product rows: a list on phones, a table on desktop. Every row
 * opens the editor and has a menu (a sheet on phones, a dropdown on desktop)
 * to update stock, change availability or duplicate. Rows that ran out show
 * Restock right there. Availability changes show at once; a failed one puts
 * the row back with the reason under it. One toast confirms every change,
 * and stays mounted when a change empties a filtered list (`empty` shows then).
 */
export function ProductList({ items, label, empty }: { items: ProductListItem[]; label: string; empty: ReactNode }) {
  const [shown, showAvailability] = useOptimistic(
    items,
    (current, change: { id: string; availability: ProductAvailability }) =>
      current.map((item) => (item.id === change.id ? { ...item, availability: change.availability } : item))
  );

  const [rowState, runRowAction] = useActionState(async (previous: RowActionState, form: FormData): Promise<RowActionState> => {
    const productId = String(form.get("productId") ?? "");
    if (form.get("intent") === "duplicate") return { ...(await safeDuplicate(previous, form)), productId };
    const availability = form.get("availability");
    if (isAvailability(availability)) showAvailability({ id: productId, availability });
    return { ...(await safeChangeAvailability(previous, form)), productId };
  }, {});

  const [stockSaved, setStockSaved] = useState<StockSaved | null>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [panel, setPanel] = useState<PanelState | null>(null);

  // The newest result wins the toast (a failed one shows none, so an older
  // success never comes back), and a later stock save clears an old row error.
  const stockAt = stockSaved?.at ?? 0;
  const rowAt = rowState.at ?? 0;
  const toast = rowAt > stockAt ? (rowState.saved ? { message: rowState.saved, at: rowAt } : null) : stockSaved;
  const errorFor = (id: string) => (rowState.error && rowState.productId === id && rowAt > stockAt ? rowState.error : undefined);

  function handlersFor(item: ProductListItem): ProductMenuHandlers {
    return {
      onAvailability: (availability) => startTransition(() => runRowAction(rowForm(item, { availability }))),
      onDuplicate: () => startTransition(() => runRowAction(rowForm(item, { intent: "duplicate" }))),
    };
  }

  function openSheet(item: ProductListItem, view: SheetState["view"], trigger: HTMLElement) {
    setSheet((current) => ({ item, view, open: true, trigger, saved: false, session: (current?.session ?? 0) + 1 }));
  }

  function closeSheet(saved = false) {
    setSheet((current) => current && { ...current, open: false, saved });
  }

  function sheetFinalFocus(): HTMLElement | boolean {
    if (!sheet) return true;
    if (!sheet.saved && sheet.trigger?.isConnected) return sheet.trigger;
    return document.getElementById(menuTriggerId(sheet.item.id, "list")) ?? true;
  }

  function togglePanel(item: ProductListItem, trigger: HTMLElement) {
    setPanel((current) => (current?.id === item.id ? null : { id: item.id, trigger, session: (current?.session ?? 0) + 1 }));
  }

  // From the row menu, whose trigger gets focus back when the panel closes.
  function openPanel(item: ProductListItem) {
    const trigger = document.getElementById(menuTriggerId(item.id, "table"));
    setPanel((current) => ({ id: item.id, trigger, session: (current?.session ?? 0) + 1 }));
  }

  // Focus goes back to what opened the panel, or to the row menu if a save removed that button.
  function closePanel(saved: boolean) {
    if (!panel) return;
    const target = !saved && panel.trigger?.isConnected ? panel.trigger : document.getElementById(menuTriggerId(panel.id, "table"));
    setPanel(null);
    target?.focus();
  }

  function onStockSaved(saved: StockSaved) {
    setStockSaved(saved);
    closeSheet(true);
    closePanel(true);
  }

  const sheetItem = sheet ? (shown.find((item) => item.id === sheet.item.id) ?? sheet.item) : null;

  return (
    <>
      {shown.length === 0 ? (
        empty
      ) : (
        <>
          <ul aria-label={label} className="flex flex-col border-t border-border lg:hidden">
            {shown.map((item) => (
              <ProductListRow
                key={item.id}
                item={item}
                error={errorFor(item.id)}
                onOpenMenu={(trigger) => openSheet(item, "menu", trigger)}
                onRestock={(trigger) => openSheet(item, "stock", trigger)}
              />
            ))}
          </ul>

          <ProductTable
            items={shown}
            label={label}
            errorFor={errorFor}
            panel={panel}
            onTogglePanel={togglePanel}
            onOpenPanel={openPanel}
            onClosePanel={closePanel}
            onStockSaved={onStockSaved}
            handlersFor={handlersFor}
            className="hidden lg:block"
          />
        </>
      )}

      <ProductActionsSheet
        item={sheetItem}
        open={Boolean(sheet?.open)}
        session={sheet?.session ?? 0}
        view={sheet?.view ?? "menu"}
        onShowStock={() => setSheet((current) => current && { ...current, view: "stock" })}
        onClose={() => closeSheet()}
        finalFocus={sheetFinalFocus}
        onStockSaved={onStockSaved}
        onAvailability={(availability) => {
          if (!sheetItem) return;
          closeSheet();
          handlersFor(sheetItem).onAvailability(availability);
        }}
        onDuplicate={() => {
          if (!sheetItem) return;
          closeSheet();
          handlersFor(sheetItem).onDuplicate();
        }}
      />

      <Toast message={toast?.message} at={toast?.at} />
    </>
  );
}
