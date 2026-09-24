"use client";

import { Fragment, startTransition, useActionState, useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { LoaderCircle } from "lucide-react";

import { removeProduct, type ProductActionState } from "@/lib/products/admin-actions";
import { cn } from "@/lib/utils";

import { ErrorLine } from "./product-row";
import { Sheet } from "./restock";
import { safeAction } from "./safe-action";
import { BUTTON_BASE, BUTTON_SECONDARY } from "./styles";
import { Toast } from "./toast";

const safeRemove = safeAction(removeProduct);

/** Which product the sheet is about. */
export interface DeletingProduct {
  id: string;
  name: string;
}

/** A message for the page's toast. */
export interface DeletedToast {
  message: string;
  at: number;
}

function DeleteForm({
  product,
  from,
  titleRef,
  busyRef,
  onDeleted,
}: {
  product: DeletingProduct;
  from: "list" | "editor";
  titleRef: RefObject<HTMLHeadingElement | null>;
  /** Set while deleting, so the sheet can't be closed mid-way. */
  busyRef: RefObject<boolean>;
  onDeleted?: (toast: DeletedToast) => void;
}) {
  const [state, remove, removing] = useActionState(async (previous: ProductActionState, form: FormData) => {
    const result = await safeRemove(previous, form);
    if (result.saved) onDeleted?.({ message: result.saved, at: result.at ?? Date.now() });
    return result;
  }, {});
  useEffect(() => {
    busyRef.current = removing;
  }, [busyRef, removing]);

  // Dispatched by hand, like Delete offer, so a failure keeps the sheet as it was.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (removing) return;
    const data = new FormData(event.currentTarget);
    startTransition(() => remove(data));
  }

  return (
    <form onSubmit={submit} className="flex flex-col">
      <input type="hidden" name="productId" value={product.id} />
      {from === "editor" && <input type="hidden" name="from" value="editor" />}
      <Dialog.Title ref={titleRef} tabIndex={-1} className="text-lg leading-6 font-semibold break-words focus:outline-none">
        Delete {product.name}?
      </Dialog.Title>
      <Dialog.Description className="mt-1 text-[13px] leading-[18px] text-ink-muted">
        It’s removed for good, with its photos. Orders that include it keep their details. To take it off the store for
        now, hide it instead.
      </Dialog.Description>
      <ErrorLine message={removing ? undefined : state.error} className="mt-4" />
      {/* aria-disabled, not disabled: a disabled button loses focus, and the
          sheet only hands focus back when it still has it as it closes. */}
      <button
        type="submit"
        aria-disabled={removing}
        className={cn(
          BUTTON_BASE,
          "mt-5 min-h-12 bg-danger text-on-dark hover:bg-danger/90 aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
        )}
      >
        {removing ? (
          <>
            <LoaderCircle className="animate-spin" strokeWidth={2} aria-hidden="true" />
            Deleting…
          </>
        ) : (
          "Delete product"
        )}
      </button>
      <Dialog.Close disabled={removing} className={cn(BUTTON_SECONDARY, "mt-2 min-h-12")}>
        Cancel
      </Dialog.Close>
    </form>
  );
}

/**
 * "Product deleted" once, after the editor sends the admin back to the list
 * with ?done=deleted. The URL then loses ?done=, so a reload or Back doesn't
 * say it again.
 */
export function ProductDeletedToast({ show, href }: { show: boolean; href: string }) {
  const router = useRouter();
  // Kept when ?done= goes; `at` 1 because it only ever shows once.
  const [message] = useState(() => (show ? "Product deleted" : undefined));

  useEffect(() => {
    if (show) router.replace(href, { scroll: false });
  }, [show, href, router]);

  return <Toast message={message} at={message ? 1 : undefined} />;
}

/**
 * "Delete {name}?", confirmed in a sheet. From the list the product goes and
 * `onDeleted` shows the toast; from the editor (`from="editor"`) the admin
 * goes back to the list, which says "Product deleted". The sheet stays
 * mounted so it slides in and out; a new `session` starts its form afresh.
 */
export function DeleteProductSheet({
  product,
  open,
  session,
  from = "list",
  onClose,
  onDeleted,
  finalFocus,
}: {
  product: DeletingProduct | null;
  open: boolean;
  session: number;
  from?: "list" | "editor";
  onClose: () => void;
  onDeleted?: (toast: DeletedToast) => void;
  finalFocus: () => HTMLElement | boolean;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const busyRef = useRef(false);
  return (
    <Sheet
      open={open}
      onClose={() => {
        if (!busyRef.current) onClose();
      }}
      // The question first, not the button that deletes.
      initialFocus={() => titleRef.current ?? true}
      finalFocus={finalFocus}
    >
      <Fragment key={session}>
        {product && (
          <DeleteForm product={product} from={from} titleRef={titleRef} busyRef={busyRef} onDeleted={onDeleted} />
        )}
      </Fragment>
    </Sheet>
  );
}
