"use client";

import { Fragment, useRef, type ReactNode } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { CircleAlert, Copy, Ellipsis, Eye, EyeOff, Layers, Pencil, Trash2, type LucideIcon } from "lucide-react";

import type { ProductAvailability } from "@/db/schema";
import { STOCK_STATUS_LABEL, stockStatus, type StockStatus } from "@/lib/products/model";
import { cn } from "@/lib/utils";

import { editorHref, isRestockable, menuTriggerId, ProductThumb, stockText, type ProductListItem } from "./product-row";
import { Sheet, StockSheetBody, stockSheetFocus, type StockSaved } from "./restock";
import { BUTTON_SECONDARY } from "./styles";

/** Only the actions that would change something for this product. */
export function menuChoices(item: ProductListItem) {
  const status = stockStatus(item);
  // A draft with no price stays off the store until it is priced in the editor.
  const priced = item.pricePaise > 0;
  return {
    stockLabel: isRestockable(item) ? "Restock" : "Update stock",
    markOut: priced && (status === "in" || status === "low"),
    hide: item.availability !== "hidden",
    // A counted product with no stock can't go on sale; restocking it does that.
    makeAvailable: priced && item.availability !== "available" && (item.stock === null || item.stock > 0),
  };
}

const STATUS_LINE: Record<StockStatus, string> = { ...STOCK_STATUS_LABEL, hidden: "Hidden from the store" };

/** What the row menu can do, handed down from the list. */
export interface ProductMenuHandlers {
  onAvailability: (availability: ProductAvailability) => void;
  onDuplicate: () => void;
  /** Opens "Delete {name}?"; nothing is deleted until the admin confirms. */
  onDelete: () => void;
}

function SheetAction({
  icon: Icon,
  iconClass,
  title,
  detail,
  onClick,
  href,
}: {
  icon: LucideIcon;
  iconClass?: string;
  title: string;
  detail: string;
  onClick?: () => void;
  href?: string;
}) {
  const body: ReactNode = (
    <>
      <Icon className={cn("size-5 shrink-0", iconClass)} strokeWidth={1.5} aria-hidden="true" />
      <span className="flex flex-col">
        <span className="text-[15px] leading-[22px] font-semibold">{title}</span>
        <span className="text-[13px] leading-[18px] text-ink-muted">{detail}</span>
      </span>
    </>
  );
  const className =
    "flex min-h-15 w-full cursor-pointer items-center gap-3 py-2 text-left text-foreground transition-colors hover:bg-surface-sunken/60";
  return (
    <li className="border-b border-border">
      {href ? (
        <Link href={href} className={className}>
          {body}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={className}>
          {body}
        </button>
      )}
    </li>
  );
}

/**
 * The row menu on phones, as a bottom sheet: the product, then Update stock,
 * the availability changes that apply, Duplicate and Edit product. Update
 * stock (or the row's Restock button) swaps in the Restock form. The sheet
 * stays mounted so it slides in and out; a new `session` starts its
 * contents afresh.
 */
export function ProductActionsSheet({
  item,
  open,
  session,
  view,
  onShowStock,
  onClose,
  finalFocus,
  onStockSaved,
  onAvailability,
  onDuplicate,
  onDelete,
}: ProductMenuHandlers & {
  item: ProductListItem | null;
  open: boolean;
  session: number;
  view: "menu" | "stock";
  onShowStock: () => void;
  onClose: () => void;
  finalFocus: () => HTMLElement | boolean;
  onStockSaved: (saved: StockSaved) => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);

  // Swapping views keeps the sheet open, so focus moves to the new title by hand.
  function showStock() {
    flushSync(onShowStock);
    titleRef.current?.focus();
  }

  let body: ReactNode = null;
  if (item && view === "stock") {
    body = <StockSheetBody item={item} titleRef={titleRef} fieldRef={fieldRef} onCancel={onClose} onSaved={onStockSaved} />;
  } else if (item) {
    const choices = menuChoices(item);
    body = (
      <>
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <ProductThumb src={item.image} />
          <span className="flex min-w-0 flex-1 flex-col">
            <Dialog.Title className="truncate text-lg leading-6 font-semibold">{item.name}</Dialog.Title>
            <Dialog.Description className="text-[13px] leading-[18px] text-ink-muted tabular-nums">
              {stockText(item.stock)} · {STATUS_LINE[stockStatus(item)]}
            </Dialog.Description>
          </span>
        </div>
        <ul className="flex flex-col">
          <SheetAction icon={Layers} title={choices.stockLabel} detail="Change how many you have" onClick={showStock} />
          {choices.markOut && (
            <SheetAction
              icon={CircleAlert}
              iconClass="text-danger"
              title="Mark as out of stock"
              detail="Stays on the store, can’t be bought"
              onClick={() => onAvailability("out_of_stock")}
            />
          )}
          {choices.hide && (
            <SheetAction icon={EyeOff} title="Hide product" detail="Not shown on the store" onClick={() => onAvailability("hidden")} />
          )}
          {choices.makeAvailable && (
            <SheetAction
              icon={Eye}
              iconClass="text-success"
              title="Make product available"
              detail="Back on the store and on sale"
              onClick={() => onAvailability("available")}
            />
          )}
          <SheetAction icon={Copy} title="Duplicate" detail="Copy it as a hidden draft" onClick={onDuplicate} />
          <SheetAction icon={Pencil} title="Edit product" detail="Details, price, photos" href={editorHref(item)} />
          <SheetAction
            icon={Trash2}
            iconClass="text-danger"
            title="Delete product"
            detail="Removed for good, with its photos"
            onClick={onDelete}
          />
        </ul>
        <Dialog.Close className={cn(BUTTON_SECONDARY, "mt-3 min-h-12 w-full")}>Cancel</Dialog.Close>
      </>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      initialFocus={() => (view === "stock" ? stockSheetFocus(titleRef.current, fieldRef.current) : true)}
      finalFocus={finalFocus}
    >
      <Fragment key={session}>{body}</Fragment>
    </Sheet>
  );
}

const MENU_ITEM =
  "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xs px-2.5 text-sm leading-5 font-medium whitespace-nowrap text-foreground outline-none select-none data-highlighted:bg-surface-sunken";

function MenuIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return <Icon className={cn("size-4 shrink-0", className)} strokeWidth={1.5} aria-hidden="true" />;
}

/**
 * The row menu on desktop, as a dropdown ("More actions for Run Machine").
 * Arrow keys move through it and Escape closes it. Update stock opens the
 * panel under the row, which takes focus instead of the trigger.
 */
export function ProductMenu({
  item,
  onUpdateStock,
  onAvailability,
  onDuplicate,
  onDelete,
}: ProductMenuHandlers & { item: ProductListItem; onUpdateStock: () => void }) {
  const choices = menuChoices(item);
  const opensPanel = useRef(false);

  return (
    <Menu.Root>
      <Menu.Trigger
        id={menuTriggerId(item.id, "table")}
        aria-label={`More actions for ${item.name}`}
        className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm text-ink-muted transition-colors hover:bg-surface-sunken data-popup-open:bg-surface-sunken"
      >
        <Ellipsis className="size-5" strokeWidth={1.5} aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={4} className="z-40 outline-none">
          <Menu.Popup
            finalFocus={() => {
              const panelTakesFocus = opensPanel.current;
              opensPanel.current = false;
              return !panelTakesFocus;
            }}
            className="flex w-60 flex-col rounded-sm bg-surface-raised p-1 shadow-float outline-none"
          >
            <Menu.Item
              className={MENU_ITEM}
              onClick={() => {
                opensPanel.current = true;
                onUpdateStock();
              }}
            >
              <MenuIcon icon={Layers} />
              {choices.stockLabel}
            </Menu.Item>
            {choices.markOut && (
              <Menu.Item className={MENU_ITEM} onClick={() => onAvailability("out_of_stock")}>
                <MenuIcon icon={CircleAlert} className="text-danger" />
                Mark as out of stock
              </Menu.Item>
            )}
            {choices.hide && (
              <Menu.Item className={MENU_ITEM} onClick={() => onAvailability("hidden")}>
                <MenuIcon icon={EyeOff} />
                Hide product
              </Menu.Item>
            )}
            {choices.makeAvailable && (
              <Menu.Item className={MENU_ITEM} onClick={() => onAvailability("available")}>
                <MenuIcon icon={Eye} className="text-success" />
                Make product available
              </Menu.Item>
            )}
            <Menu.Item className={MENU_ITEM} onClick={onDuplicate}>
              <MenuIcon icon={Copy} />
              Duplicate
            </Menu.Item>
            <Menu.LinkItem className={MENU_ITEM} closeOnClick render={<Link href={editorHref(item)} />}>
              <MenuIcon icon={Pencil} />
              Edit product
            </Menu.LinkItem>
            <Menu.Separator className="my-1 h-px bg-border" />
            <Menu.Item
              className={cn(MENU_ITEM, "text-danger")}
              onClick={() => {
                // The confirmation sheet takes focus, not the trigger.
                opensPanel.current = true;
                onDelete();
              }}
            >
              <MenuIcon icon={Trash2} />
              Delete product
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
