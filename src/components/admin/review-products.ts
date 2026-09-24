import "server-only";

import { listProductsWithImages } from "@/db/products";

import { byStoreOrder } from "./product-row";
import type { ReviewEditorProduct } from "./review-editor";

/** Every product (hidden ones too, labelled) in store order, for the review editor's Product list. */
export async function loadReviewProducts(): Promise<ReviewEditorProduct[]> {
  const products = await listProductsWithImages();
  return products
    .sort(byStoreOrder)
    .map((product) => ({ id: product.id, name: product.name, hidden: product.availability === "hidden" }));
}
