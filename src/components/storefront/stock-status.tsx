import { stockNote, type StoreGear } from "@/lib/products/model";
import { cn } from "@/lib/utils";

/**
 * The stock line above a product page's price: "In Stock", "Only 2 left" when
 * a counted product is running low, or "Out of stock". The words carry the
 * meaning; the dot's colour repeats it, as on the admin's stock labels.
 */
export function StockStatus({ product }: { product: Pick<StoreGear, "stockStatus" | "stockLeft"> }) {
  const note = stockNote(product);
  const [label, text, dot] =
    product.stockStatus === "out"
      ? ["Out of stock", "text-danger", "bg-danger"]
      : note
        ? [note, "text-foreground", "bg-brand-yellow-hover"]
        : ["In Stock", "text-success", "bg-success"];
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold", text)}>
      <span aria-hidden="true" className={cn("block size-2 rounded-full", dot)} />
      {label}
    </span>
  );
}
