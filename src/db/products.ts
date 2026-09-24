import "server-only";

import { and, asc, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";

import { PRODUCT_LIMITS } from "@/lib/products/editor";
import { availabilityForSave, availabilityForStock, MAX_SLUG_LENGTH, type ProductWithImages } from "@/lib/products/model";

import { getDb } from "./index";
import {
  offers,
  orderItems,
  productImages,
  products,
  type NewProduct,
  type OrderStockShortfall,
  type Product,
  type ProductAvailability,
  type ProductImage,
} from "./schema";

export type ProductWithAllImages = Product & { images: ProductImage[] };

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

function isUniqueViolation(error: unknown, constraint?: string): boolean {
  for (let current = error; current; current = (current as { cause?: unknown }).cause) {
    const pg = current as { code?: string; constraint?: string };
    if (pg.code === "23505" && (!constraint || pg.constraint === constraint)) return true;
  }
  return false;
}

async function attachImages(rows: Product[]): Promise<ProductWithAllImages[]> {
  if (rows.length === 0) return [];
  const images = await getDb()
    .select()
    .from(productImages)
    .where(
      inArray(
        productImages.productId,
        rows.map((row) => row.id)
      )
    )
    .orderBy(asc(productImages.position), asc(productImages.createdAt));
  return rows.map((row) => ({ ...row, images: images.filter((image) => image.productId === row.id) }));
}

/** Every product with its photos (primary first), hidden ones included. The store has a few dozen at most. */
export async function listProductsWithImages(): Promise<ProductWithAllImages[]> {
  const rows = await getDb().select().from(products).orderBy(asc(products.category), asc(products.sortOrder), asc(products.name));
  return attachImages(rows);
}

export async function getProductBySlug(slug: string): Promise<ProductWithAllImages | undefined> {
  const [row] = await getDb().select().from(products).where(eq(products.slug, slug)).limit(1);
  if (!row) return undefined;
  const [withImages] = await attachImages([row]);
  return withImages;
}

export async function getProductById(id: string): Promise<ProductWithAllImages | undefined> {
  const [row] = await getDb().select().from(products).where(eq(products.id, id)).limit(1);
  if (!row) return undefined;
  const [withImages] = await attachImages([row]);
  return withImages;
}

export type ProductWriteResult =
  | { ok: true; product: Product }
  | { ok: false; reason: "not_found" | "slug_taken" | "sku_taken" | "changed" };

/** The editable fields; stock and availability follow the same rules as the quick stock controls. */
export type ProductInput = Omit<NewProduct, "id" | "createdAt" | "updatedAt">;

/** A new product at the end of its category. Its photos are added separately. */
export async function createProduct(input: ProductInput): Promise<ProductWriteResult> {
  try {
    const [{ next }] = await getDb()
      .select({ next: sql<number>`coalesce(max(${products.sortOrder}) + 1, 0)` })
      .from(products)
      .where(eq(products.category, input.category));
    const availability = availabilityForSave(input.availability ?? "available", null, null, input.stock ?? null);
    const [product] = await getDb()
      .insert(products)
      .values({ ...input, availability, sortOrder: Number(next) })
      .returning();
    return { ok: true, product };
  } catch (error) {
    if (isUniqueViolation(error, "products_slug_unique")) return { ok: false, reason: "slug_taken" };
    if (isUniqueViolation(error, "products_sku_unique")) return { ok: false, reason: "sku_taken" };
    throw error;
  }
}

/**
 * Save the editor. `seenUpdatedAt` is when the admin loaded the product: if
 * someone saved it since, nothing changes and the admin is asked to reload.
 * The slug never changes, so links keep working.
 */
export async function updateProduct(
  id: string,
  input: Omit<ProductInput, "slug" | "kind">,
  seenUpdatedAt: Date,
  /** The admin picked the availability themselves, so it wins over the restock rule. */
  { availabilityChosen = false }: { availabilityChosen?: boolean } = {}
): Promise<ProductWriteResult> {
  const db = getDb();
  try {
    return await db.transaction(async (tx) => {
      const [current] = await tx.select().from(products).where(eq(products.id, id)).for("update");
      if (!current) return { ok: false, reason: "not_found" } as const;
      if (Math.abs(current.updatedAt.getTime() - seenUpdatedAt.getTime()) > 1) return { ok: false, reason: "changed" } as const;
      const nextStock = input.stock ?? null;
      const availability = availabilityForSave(
        input.availability ?? current.availability,
        current.availability,
        current.stock,
        nextStock,
        availabilityChosen
      );
      const [product] = await tx
        .update(products)
        .set({ ...input, availability, stock: nextStock })
        .where(eq(products.id, id))
        .returning();
      return { ok: true, product } as const;
    });
  } catch (error) {
    if (isUniqueViolation(error, "products_sku_unique")) return { ok: false, reason: "sku_taken" };
    throw error;
  }
}

export type AvailabilityResult =
  | { ok: true; product: Product }
  | { ok: false; reason: "not_found" | "no_stock" | "no_price" };

/**
 * Available, out of stock or hidden. A counted product with no stock cannot be
 * made available: restock it instead. A draft with no price cannot be shown at
 * all (the store leaves it out): price it in the editor first.
 */
export async function setProductAvailability(id: string, availability: ProductAvailability): Promise<AvailabilityResult> {
  const [current] = await getDb().select().from(products).where(eq(products.id, id)).limit(1);
  if (!current) return { ok: false, reason: "not_found" };
  if (availability !== "hidden" && current.pricePaise <= 0) return { ok: false, reason: "no_price" };
  if (availability === "available" && current.stock !== null && current.stock <= 0) return { ok: false, reason: "no_stock" };
  const [product] = await getDb().update(products).set({ availability }).where(eq(products.id, id)).returning();
  return { ok: true, product };
}

export type StockWrite = {
  id: string;
  stock: number | null;
  /** The count the admin started from; if a sale has changed it since, nothing is written. */
  from: number | null;
};

export type StockWriteResult = { ok: true; products: Product[] } | { ok: false; reason: "not_found" | "changed" };

class StockConflict extends Error {
  constructor(readonly reason: "not_found" | "changed") {
    super(reason);
  }
}

async function writeStock(tx: Tx, entry: StockWrite): Promise<Product> {
  const [current] = await tx.select().from(products).where(eq(products.id, entry.id)).for("update");
  if (!current) throw new StockConflict("not_found");
  // Counts are absolute, so a sale since the page loaded would be written over.
  if (current.stock !== entry.from) throw new StockConflict("changed");
  const availability = availabilityForStock(current.availability, current.stock, entry.stock);
  const [product] = await tx
    .update(products)
    .set({ stock: entry.stock, availability })
    .where(eq(products.id, entry.id))
    .returning();
  return product;
}

/**
 * Set stock counts (null: stop counting), all or none. Reaching 0 marks a
 * product out of stock; restocking makes it available again. Refused when a
 * count changed since the admin's page loaded, e.g. an order was paid.
 */
export async function setProductStocks(entries: StockWrite[]): Promise<StockWriteResult> {
  try {
    const saved = await getDb().transaction(async (tx) => {
      const written: Product[] = [];
      for (const entry of entries) written.push(await writeStock(tx, entry));
      return written;
    });
    return { ok: true, products: saved };
  } catch (error) {
    if (error instanceof StockConflict) return { ok: false, reason: error.reason };
    throw error;
  }
}

/**
 * Take a paid order's items out of stock, inside the transaction that marks it
 * paid. Uncounted products are left alone. Stock never goes below 0; a product
 * that reaches 0 becomes out of stock. Returns whether any count changed, and
 * any lines that had fewer in stock than were paid for (two customers paying
 * for the last one at once).
 */
export async function takeOrderFromStock(
  tx: Tx,
  orderId: string
): Promise<{ changed: boolean; shortfall: OrderStockShortfall[] }> {
  const lines = await tx
    .select({ slug: orderItems.productSlug, quantity: sql<number>`sum(${orderItems.quantity})::int` })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .groupBy(orderItems.productSlug);
  let changed = false;
  const shortfall: OrderStockShortfall[] = [];
  for (const line of lines) {
    const [current] = await tx
      .select()
      .from(products)
      .where(and(eq(products.slug, line.slug), isNotNull(products.stock)))
      .for("update");
    if (!current || current.stock === null) continue;
    const wanted = Number(line.quantity);
    if (current.stock < wanted) {
      shortfall.push({ slug: current.slug, name: current.name, missing: wanted - Math.max(0, current.stock) });
    }
    const stock = Math.max(0, current.stock - wanted);
    const availability = availabilityForStock(current.availability, current.stock, stock);
    await tx.update(products).set({ stock, availability }).where(eq(products.id, current.id));
    changed = true;
  }
  return { changed, shortfall };
}

// ---------------------------------------------------------------------------
// Photos

/** Add a photo after the existing ones. */
export async function addProductImage(
  productId: string,
  image: { url: string; pathname: string | null; alt?: string | null }
): Promise<ProductImage> {
  const [{ next }] = await getDb()
    .select({ next: sql<number>`coalesce(max(${productImages.position}) + 1, 0)` })
    .from(productImages)
    .where(eq(productImages.productId, productId));
  const [row] = await getDb()
    .insert(productImages)
    .values({ productId, url: image.url, pathname: image.pathname, alt: image.alt ?? null, position: Number(next) })
    .returning();
  return row;
}

async function fileUsedElsewhere(tx: Tx, url: string, imageId: string): Promise<boolean> {
  const [shared] = await tx
    .select({ id: productImages.id })
    .from(productImages)
    .where(and(eq(productImages.url, url), ne(productImages.id, imageId)))
    .limit(1);
  return Boolean(shared);
}

/**
 * Point an existing photo at a new file, keeping its place. Returns the old
 * row and whether its file is still used elsewhere, so it can be removed.
 */
export async function replaceProductImage(
  imageId: string,
  image: { url: string; pathname: string | null }
): Promise<{ image: ProductImage; old: ProductImage; fileStillUsed: boolean } | undefined> {
  return getDb().transaction(async (tx) => {
    const [old] = await tx.select().from(productImages).where(eq(productImages.id, imageId)).for("update");
    if (!old) return undefined;
    const [updated] = await tx
      .update(productImages)
      .set({ url: image.url, pathname: image.pathname })
      .where(eq(productImages.id, imageId))
      .returning();
    return { image: updated, old, fileStillUsed: await fileUsedElsewhere(tx, old.url, imageId) };
  });
}

/**
 * Remove a photo and close the gap. Returns the removed row and whether its
 * file is still used elsewhere (a duplicated product shares its photos).
 */
export async function deleteProductImage(
  imageId: string
): Promise<{ image: ProductImage; fileStillUsed: boolean } | undefined> {
  return getDb().transaction(async (tx) => {
    const [image] = await tx.delete(productImages).where(eq(productImages.id, imageId)).returning();
    if (!image) return undefined;
    const rest = await tx
      .select({ id: productImages.id })
      .from(productImages)
      .where(eq(productImages.productId, image.productId))
      .orderBy(asc(productImages.position), asc(productImages.createdAt));
    for (const [position, row] of rest.entries()) {
      await tx.update(productImages).set({ position }).where(eq(productImages.id, row.id));
    }
    return { image, fileStillUsed: await fileUsedElsewhere(tx, image.url, image.id) };
  });
}

/** One photo, to check which product it belongs to. */
export async function getProductImage(imageId: string): Promise<ProductImage | undefined> {
  const [image] = await getDb().select().from(productImages).where(eq(productImages.id, imageId)).limit(1);
  return image;
}

/** Put a product's photos in this order; the first becomes the primary image. Ids not on the product are ignored. */
export async function reorderProductImages(productId: string, orderedIds: string[]): Promise<void> {
  await getDb().transaction(async (tx) => {
    const current = await tx
      .select({ id: productImages.id })
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(asc(productImages.position), asc(productImages.createdAt));
    const known = new Set(current.map((row) => row.id));
    const ordered = orderedIds.filter((id) => known.has(id));
    const rest = current.map((row) => row.id).filter((id) => !ordered.includes(id));
    for (const [position, id] of [...ordered, ...rest].entries()) {
      await tx.update(productImages).set({ position }).where(eq(productImages.id, id));
    }
  });
}

// ---------------------------------------------------------------------------
// Duplicating

/** `base` cut so that `suffix` still fits within the cart's slug limit. */
function fitSlug(base: string, suffix = ""): string {
  return base.slice(0, MAX_SLUG_LENGTH - suffix.length).replace(/-+$/, "") + suffix;
}

/** A slug no other product uses: "run-machine", then "run-machine-2", "run-machine-3"… */
export async function freeSlug(base: string): Promise<string> {
  // Every candidate starts with this much of the base, whatever suffix it gets (up to "-9999").
  const prefix = base.slice(0, MAX_SLUG_LENGTH - 5);
  // A deleted product's slug stays taken if it was ever ordered: order lines
  // find their product by slug, so a new product must not inherit them.
  const [live, ordered] = await Promise.all([
    getDb().select({ slug: products.slug }).from(products).where(sql`${products.slug} like ${`${prefix}%`}`),
    getDb()
      .selectDistinct({ slug: orderItems.productSlug })
      .from(orderItems)
      .where(sql`${orderItems.productSlug} like ${`${prefix}%`}`),
  ]);
  const taken = new Set([...live, ...ordered].map((row) => row.slug));
  const first = fitSlug(base);
  if (!taken.has(first)) return first;
  for (let n = 2; ; n++) {
    const candidate = fitSlug(base, `-${n}`);
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * Delete a product for good, with its photo rows. Orders keep their own copy
 * of its name, options and price, so they are untouched; offers that list it
 * stop listing it. Returns the product and the photos whose files no other
 * product uses (a duplicate shares its original's files), for the caller to
 * remove from storage once this has committed.
 */
export async function deleteProduct(id: string): Promise<{ product: Product; unusedImages: ProductImage[] } | undefined> {
  return getDb().transaction(async (tx) => {
    const [product] = await tx.select().from(products).where(eq(products.id, id)).for("update");
    if (!product) return undefined;
    const images = await tx.select().from(productImages).where(eq(productImages.productId, id));
    // Its photo rows go with it (ON DELETE CASCADE).
    await tx.delete(products).where(eq(products.id, id));
    await tx
      .update(offers)
      .set({ productIds: sql`${offers.productIds} - ${id}::text` })
      .where(sql`${offers.productIds} ? ${id}::text`);
    const unusedImages: ProductImage[] = [];
    for (const image of images) {
      if (!(await fileUsedElsewhere(tx, image.url, image.id))) unusedImages.push(image);
    }
    return { product, unusedImages };
  });
}

/**
 * Copy a product as a hidden draft ("… copy"), with its photos and build
 * options but no stock count or SKU, so the admin can adjust it before it goes on sale.
 */
export async function duplicateProduct(id: string): Promise<Product | undefined> {
  const source = await getProductById(id);
  if (!source) return undefined;
  const name = `${source.name.slice(0, PRODUCT_LIMITS.name - " copy".length).trim()} copy`;
  const slug = await freeSlug(`${source.slug}-copy`);
  return getDb().transaction(async (tx) => {
    const [{ next }] = await tx
      .select({ next: sql<number>`coalesce(max(${products.sortOrder}) + 1, 0)` })
      .from(products)
      .where(eq(products.category, source.category));
    const { images, ...fields } = source;
    const [copy] = await tx
      .insert(products)
      .values({
        ...fields,
        // A new row: its own id and timestamps.
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined,
        slug,
        name,
        sku: null,
        stock: null,
        availability: "hidden",
        // Chips like "Bestseller" and the home page pick belong to the original.
        badges: [],
        featured: false,
        sortOrder: Number(next),
      })
      .returning();
    if (images.length) {
      await tx.insert(productImages).values(
        images.map((image) => ({
          productId: copy.id,
          url: image.url,
          pathname: image.pathname,
          alt: image.alt,
          position: image.position,
        }))
      );
    }
    return copy;
  });
}

/** Each product's primary photo by slug, hidden products included (for order pages). */
export async function primaryImagesBySlug(slugs: string[]): Promise<Map<string, string>> {
  if (slugs.length === 0) return new Map();
  const rows = await getDb()
    .select({ slug: products.slug, url: productImages.url })
    .from(productImages)
    .innerJoin(products, eq(products.id, productImages.productId))
    .where(inArray(products.slug, slugs))
    .orderBy(asc(productImages.position), asc(productImages.createdAt));
  const primary = new Map<string, string>();
  for (const row of rows) if (!primary.has(row.slug)) primary.set(row.slug, row.url);
  return primary;
}

/** Rows for the public catalogue (see toStoreCatalogue). */
export async function listProductsForCatalogue(): Promise<ProductWithImages[]> {
  return listProductsWithImages();
}
