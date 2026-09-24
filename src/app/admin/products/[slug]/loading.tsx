import { ProductEditorSkeleton } from "@/components/admin/product-editor-skeleton";

/** Shown while a product loads, so opening one answers at once. */
export default function EditProductLoading() {
  return <ProductEditorSkeleton />;
}
