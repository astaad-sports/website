import type { Metadata } from "next";

import { ProductEditor } from "@/components/admin/product-editor";
import { requireAdmin } from "@/lib/auth/session";
import { isCategorySlug } from "@/lib/products/model";

export const metadata: Metadata = { title: "Add product" };

/** A new product. `?category=helmets` starts it in that category. Photos come after the first save. */
export default async function NewProductPage({ searchParams }: PageProps<"/admin/products/new">) {
  await requireAdmin("/admin/products/new");
  const { category } = await searchParams;
  return <ProductEditor initialCategory={isCategorySlug(category) ? category : null} />;
}
