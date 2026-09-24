import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ProductEditor, type EditorNotice, type EditorProduct } from "@/components/admin/product-editor";
import { getProductBySlug, type ProductWithAllImages } from "@/db/products";
import { isAdmin } from "@/lib/auth/admin";
import { getCurrentUser, requireAdmin } from "@/lib/auth/session";

/** One database read for the title and the page. */
const loadProduct = cache(getProductBySlug);

export async function generateMetadata({ params }: PageProps<"/admin/products/[slug]">): Promise<Metadata> {
  // Only an admin learns a product's name from the title; everyone else gets a 404.
  if (!isAdmin(await getCurrentUser())) return {};
  const product = await loadProduct((await params).slug);
  return { title: product ? `Edit ${product.name}` : "Product not found" };
}

function toEditorProduct(product: ProductWithAllImages): EditorProduct {
  return {
    id: product.id,
    slug: product.slug,
    kind: product.kind,
    category: product.category,
    subcategory: product.subcategory,
    name: product.name,
    line: product.line,
    tagline: product.tagline,
    note: product.note,
    grade: product.grade,
    shortDescription: product.shortDescription,
    description: product.description,
    pricePaise: product.pricePaise,
    mrpPaise: product.mrpPaise,
    sku: product.sku,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    availability: product.availability,
    customization: product.customization,
    updatedAt: product.updatedAt.getTime(),
    photos: product.images.map((image) => ({ id: image.id, url: image.url })),
  };
}

/** Edit a product and its photos. `?created=1` and `?duplicated=1` show a one-time message. */
export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/products/[slug]">) {
  const { slug } = await params;
  await requireAdmin(`/admin/products/${slug}`);
  const product = await loadProduct(slug);
  if (!product) notFound();

  const query = await searchParams;
  const notice: EditorNotice | null = query.created === "1" ? "created" : query.duplicated === "1" ? "duplicated" : null;

  return <ProductEditor product={toEditorProduct(product)} notice={notice} />;
}
