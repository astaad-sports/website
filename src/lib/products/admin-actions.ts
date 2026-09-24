"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  addProductImage,
  createProduct,
  deleteProductImage,
  duplicateProduct,
  freeSlug,
  getProductById,
  getProductImage,
  reorderProductImages,
  replaceProductImage,
  setProductAvailability,
  setProductStock,
  setProductStocks,
  updateProduct,
  type ProductWriteResult,
} from "@/db/products";
import type { ProductAvailability } from "@/db/schema";
import { isAdmin } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/session";

import { productsChanged } from "./catalogue";
import { parseCount, parseProductForm, PRODUCT_LIMITS, productColumns, type ProductFieldErrors } from "./editor";
import { slugify } from "./model";
import { removeStoredImage, storeImage } from "./storage";

export interface ProductActionState {
  fieldErrors?: ProductFieldErrors;
  error?: string;
  /** The success message for the toast, e.g. "Stock updated". */
  saved?: string;
  /** Changes on every result, so the toast shows again for a repeated message. */
  at?: number;
}

const NOT_ADMIN: ProductActionState = { error: "Only store admins can change products. Sign in again." };
const SOMETHING_WRONG = "Something went wrong. Try again.";

async function signedInAdmin() {
  return isAdmin(await getCurrentUser());
}

const done = (saved: string): ProductActionState => ({ saved, at: Date.now() });
const failed = (error: string): ProductActionState => ({ error, at: Date.now() });

function writeFailure(result: Exclude<ProductWriteResult, { ok: true }>, sku: string | null): ProductActionState {
  switch (result.reason) {
    case "sku_taken":
      return { fieldErrors: { sku: `SKU ${sku} is already used by another product.` }, at: Date.now() };
    case "changed":
      return failed("This product changed since you opened it. Reload the page to see the latest, then save again.");
    case "not_found":
      return failed("This product no longer exists.");
    case "slug_taken":
      return failed(SOMETHING_WRONG);
  }
}

// ---------------------------------------------------------------------------
// The editor

/**
 * Save the product editor. A new product opens its own editor page (to add
 * photos); an existing one stays put and shows "Product saved". The form
 * posts `id` and `updatedAt` (milliseconds) when editing.
 */
export async function saveProduct(_previous: ProductActionState, form: FormData): Promise<ProductActionState> {
  if (!(await signedInAdmin())) return NOT_ADMIN;

  const parsed = parseProductForm(form);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, error: "Check the highlighted fields.", at: Date.now() };
  const values = parsed.values;
  const columns = productColumns(values);

  const id = form.get("id");
  if (typeof id === "string" && id) {
    if (!z.uuid().safeParse(id).success) return failed(SOMETHING_WRONG);
    const seen = Number(form.get("updatedAt"));
    if (!Number.isFinite(seen)) return failed(SOMETHING_WRONG);
    const current = await getProductById(id);
    if (!current) return failed("This product no longer exists.");
    // A product keeps its kind: a bat stays a bat, gear stays gear.
    if (current.kind !== values.kind) return { fieldErrors: { category: "A bat can't be moved to a gear category, or gear to Bats." }, at: Date.now() };

    const result = await updateProduct(id, columns, new Date(seen));
    if (!result.ok) return writeFailure(result, values.sku);
    productsChanged();
    return done("Product saved");
  }

  // "new" is the Add product page's own address.
  const base = slugify(values.name) || "product";
  const slug = await freeSlug(base === "new" ? "new-product" : base);
  const result = await createProduct({ ...columns, slug, kind: values.kind });
  if (!result.ok) return writeFailure(result, values.sku);
  productsChanged();
  redirect(`/admin/products/${result.product.slug}?created=1`);
}

/** Copy a product as a hidden draft and open its editor. */
export async function duplicate(_previous: ProductActionState, form: FormData): Promise<ProductActionState> {
  if (!(await signedInAdmin())) return NOT_ADMIN;
  const id = z.uuid().safeParse(form.get("productId"));
  if (!id.success) return failed(SOMETHING_WRONG);
  const copy = await duplicateProduct(id.data);
  if (!copy) return failed("This product no longer exists.");
  productsChanged();
  redirect(`/admin/products/${copy.slug}?duplicated=1`);
}

// ---------------------------------------------------------------------------
// Stock and availability

/** An empty field stops counting stock (the product stays on sale). */
function stockValue(value: FormDataEntryValue | null): number | null | "invalid" {
  const count = parseCount(typeof value === "string" ? value : "");
  if (count === null) return null;
  return Number.isNaN(count) || count > PRODUCT_LIMITS.maxStock ? "invalid" : count;
}

const STOCK_ERROR = `Enter a whole number from 0 to ${PRODUCT_LIMITS.maxStock}.`;

/** Restock or correct one product's count, from the Restock sheet or a row. */
export async function saveStock(_previous: ProductActionState, form: FormData): Promise<ProductActionState> {
  if (!(await signedInAdmin())) return NOT_ADMIN;
  const id = z.uuid().safeParse(form.get("productId"));
  if (!id.success) return failed(SOMETHING_WRONG);
  const stock = stockValue(form.get("stock"));
  if (stock === "invalid") return { fieldErrors: { stock: STOCK_ERROR }, at: Date.now() };

  const product = await setProductStock(id.data, stock);
  if (!product) return failed("This product no longer exists.");
  productsChanged();
  return done("Stock updated");
}

const stocksSchema = z
  .array(z.object({ id: z.uuid(), stock: z.number().int().min(0).max(PRODUCT_LIMITS.maxStock).nullable() }))
  .min(1)
  .max(500);

/** Save the Inventory page's changed counts at once. Posts `stocks` as JSON: [{ id, stock }]. */
export async function saveStocks(_previous: ProductActionState, form: FormData): Promise<ProductActionState> {
  if (!(await signedInAdmin())) return NOT_ADMIN;
  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("stocks") ?? ""));
  } catch {
    return failed(SOMETHING_WRONG);
  }
  const parsed = stocksSchema.safeParse(raw);
  if (!parsed.success) return failed(SOMETHING_WRONG);

  await setProductStocks(parsed.data);
  productsChanged();
  return done("Stock updated");
}

const AVAILABILITY_SAVED: Record<ProductAvailability, string> = {
  available: "Product is available",
  out_of_stock: "Marked as out of stock",
  hidden: "Product hidden",
};

/** The row menu's Mark as out of stock, Hide product and Make available. */
export async function changeAvailability(_previous: ProductActionState, form: FormData): Promise<ProductActionState> {
  if (!(await signedInAdmin())) return NOT_ADMIN;
  const parsed = z
    .object({ productId: z.uuid(), availability: z.enum(["available", "out_of_stock", "hidden"]) })
    .safeParse({ productId: form.get("productId"), availability: form.get("availability") });
  if (!parsed.success) return failed(SOMETHING_WRONG);

  const result = await setProductAvailability(parsed.data.productId, parsed.data.availability);
  if (!result.ok) {
    return failed(
      result.reason === "no_stock"
        ? "There's no stock to sell. Restock it first, and it becomes available."
        : "This product no longer exists."
    );
  }
  productsChanged();
  return done(AVAILABILITY_SAVED[parsed.data.availability]);
}

// ---------------------------------------------------------------------------
// Photos. Each action takes one photo, which the browser has already shrunk.

/** Add a photo after the existing ones. Posts `productId` and `file`. */
export async function uploadPhoto(_previous: ProductActionState, form: FormData): Promise<ProductActionState> {
  if (!(await signedInAdmin())) return NOT_ADMIN;
  const id = z.uuid().safeParse(form.get("productId"));
  if (!id.success) return failed(SOMETHING_WRONG);
  if (!(await getProductById(id.data))) return failed("This product no longer exists.");

  const stored = await storeImage(form.get("file"));
  if (!stored.ok) return failed(stored.error);
  await addProductImage(id.data, stored.image);
  productsChanged();
  return done("Photo added");
}

/** Swap a photo's file, keeping its place. Posts `imageId` and `file`. */
export async function replacePhoto(_previous: ProductActionState, form: FormData): Promise<ProductActionState> {
  if (!(await signedInAdmin())) return NOT_ADMIN;
  const id = z.uuid().safeParse(form.get("imageId"));
  if (!id.success) return failed(SOMETHING_WRONG);
  if (!(await getProductImage(id.data))) return failed("This photo no longer exists.");

  const stored = await storeImage(form.get("file"));
  if (!stored.ok) return failed(stored.error);
  const result = await replaceProductImage(id.data, stored.image);
  if (!result) {
    await removeStoredImage(stored.image);
    return failed("This photo no longer exists.");
  }
  if (!result.fileStillUsed) await removeStoredImage(result.old);
  productsChanged();
  return done("Photo replaced");
}

/** Remove a photo. Posts `imageId`. */
export async function deletePhoto(_previous: ProductActionState, form: FormData): Promise<ProductActionState> {
  if (!(await signedInAdmin())) return NOT_ADMIN;
  const id = z.uuid().safeParse(form.get("imageId"));
  if (!id.success) return failed(SOMETHING_WRONG);

  const result = await deleteProductImage(id.data);
  if (!result) return failed("This photo no longer exists.");
  if (!result.fileStillUsed) await removeStoredImage(result.image);
  productsChanged();
  return done("Photo deleted");
}

/**
 * Move a photo: `move` is "first" (Set as primary), "up" or "down".
 * Posts `imageId` and `move`.
 */
export async function movePhoto(_previous: ProductActionState, form: FormData): Promise<ProductActionState> {
  if (!(await signedInAdmin())) return NOT_ADMIN;
  const parsed = z
    .object({ imageId: z.uuid(), move: z.enum(["first", "up", "down"]) })
    .safeParse({ imageId: form.get("imageId"), move: form.get("move") });
  if (!parsed.success) return failed(SOMETHING_WRONG);

  const image = await getProductImage(parsed.data.imageId);
  const product = image && (await getProductById(image.productId));
  if (!image || !product) return failed("This photo no longer exists.");

  const ids = product.images.map((entry) => entry.id);
  const from = ids.indexOf(image.id);
  const to = parsed.data.move === "first" ? 0 : parsed.data.move === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= ids.length || to === from) return {};
  ids.splice(from, 1);
  ids.splice(to, 0, image.id);

  await reorderProductImages(product.id, ids);
  productsChanged();
  return done(parsed.data.move === "first" ? "Set as primary photo" : "Photo moved");
}
