"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, CircleAlert, Layers } from "lucide-react";

import { cn } from "@/lib/utils";

import { editorHref, isRestockable, type ProductListItem } from "./product-row";
import { RestockSheet, type StockSaved } from "./restock";
import { Toast } from "./toast";

/** A product Home flags: out of stock, or only a few left. */
export interface StockAttention {
  item: ProductListItem;
  kind: "out" | "low";
}

interface SheetState {
  item: ProductListItem;
  trigger: HTMLElement;
  open: boolean;
  /** The saved row may be gone, so focus goes to the heading instead. */
  saved: boolean;
  /** A new sheet starts fresh, even while the last one is still closing. */
  session: number;
}

const ROW = "flex min-h-16 w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-surface-sunken/60";

/**
 * "G.O.A.T · Out of stock → Manage" or "Black Edition · Only 2 left → Update
 * stock". Opens the Restock sheet; a product marked out of stock by hand
 * with stock left opens its editor instead, where it can be made available.
 */
function StockAttentionRow({ row, onOpen }: { row: StockAttention; onOpen: (trigger: HTMLElement) => void }) {
  const out = row.kind === "out";
  const Icon = out ? CircleAlert : Layers;
  const body = (
    <>
      <Icon className={cn("size-5 shrink-0", out ? "text-danger" : "text-ink-muted")} strokeWidth={1.5} aria-hidden="true" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] leading-[22px] font-semibold">{row.item.name}</span>
        <span className={cn("truncate text-[13px] leading-[18px] tabular-nums", out ? "text-danger" : "text-ink-muted")}>
          {out ? "Out of stock" : `Only ${row.item.stock} left`}
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-sm leading-5 font-semibold">
        {out ? "Manage" : "Update stock"}
        <ArrowRight className="size-4" strokeWidth={2} aria-hidden="true" />
      </span>
    </>
  );
  return (
    <li className="border-b border-border">
      {out && !isRestockable(row.item) ? (
        <Link href={editorHref(row.item)} className={ROW}>
          {body}
        </Link>
      ) : (
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={(event) => onOpen(event.currentTarget)}
          className={cn(ROW, "cursor-pointer")}
        >
          {body}
        </button>
      )}
    </li>
  );
}

/**
 * Home's "Needs attention" list. Order rows come from the page (`before` and
 * `after`); product rows open the Restock sheet right here. It stays mounted
 * when the last row is fixed, so the "Stock updated" toast still shows.
 * `headingId` takes focus when a saved row disappears.
 */
export function HomeAttention({
  count,
  before,
  stock,
  after,
  empty,
  headingId,
}: {
  count: number;
  before: ReactNode;
  stock: StockAttention[];
  after: ReactNode;
  empty: ReactNode;
  headingId: string;
}) {
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [saved, setSaved] = useState<StockSaved | null>(null);

  function openSheet(item: ProductListItem, trigger: HTMLElement) {
    setSheet((current) => ({ item, trigger, open: true, saved: false, session: (current?.session ?? 0) + 1 }));
  }

  function finalFocus(): HTMLElement | boolean {
    if (sheet && !sheet.saved && sheet.trigger.isConnected) return sheet.trigger;
    return document.getElementById(headingId) ?? true;
  }

  return (
    <>
      {count > 0 ? (
        <ul className="flex flex-col border-t border-border">
          {before}
          {stock.map((row) => (
            <StockAttentionRow
              key={row.item.id}
              row={row}
              onOpen={(trigger) => openSheet(row.item, trigger)}
            />
          ))}
          {after}
        </ul>
      ) : (
        empty
      )}
      <RestockSheet
        item={sheet?.item ?? null}
        open={Boolean(sheet?.open)}
        session={sheet?.session ?? 0}
        onClose={() => setSheet((current) => current && { ...current, open: false })}
        onSaved={(result) => {
          setSaved(result);
          setSheet((current) => current && { ...current, open: false, saved: true });
        }}
        finalFocus={finalFocus}
      />
      <Toast message={saved?.message} at={saved?.at} />
    </>
  );
}
