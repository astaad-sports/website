import type { Metadata } from "next";

import { ReviewEditor } from "@/components/admin/review-editor";
import { loadReviewProducts } from "@/components/admin/review-products";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Add review" };

/** A review the admin adds: one a customer sent another way (WhatsApp, Instagram), or a photo. It is published at once. */
export default async function NewReviewPage() {
  await requireAdmin("/admin/reviews/new");
  return <ReviewEditor products={await loadReviewProducts()} />;
}
