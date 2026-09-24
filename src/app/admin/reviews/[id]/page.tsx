import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { z } from "zod";

import { ReviewEditor, type ReviewEditorReview } from "@/components/admin/review-editor";
import { loadReviewProducts } from "@/components/admin/review-products";
import { getReview, type ReviewWithProduct } from "@/db/reviews";
import { isAdmin } from "@/lib/auth/admin";
import { getCurrentUser, requireAdmin } from "@/lib/auth/session";
import { formatShortDate } from "@/lib/format";

/** One database read for the title and the page; a malformed id is simply not found. */
const loadReview = cache(async (id: string) => (z.uuid().safeParse(id).success ? getReview(id) : undefined));

export async function generateMetadata({ params }: PageProps<"/admin/reviews/[id]">): Promise<Metadata> {
  // Only an admin learns who wrote a review from the title; everyone else gets a 404.
  if (!isAdmin(await getCurrentUser())) return {};
  const review = await loadReview((await params).id);
  if (!review) return { title: "Review not found" };
  return { title: review.name ? `Review from ${review.name}` : "Review" };
}

function toEditorReview(review: ReviewWithProduct, now: Date): ReviewEditorReview {
  return {
    id: review.id,
    status: review.status,
    source: review.source,
    isPrivate: review.isPrivate,
    rating: review.rating,
    body: review.body ?? "",
    name: review.name ?? "",
    place: review.place ?? "",
    productId: review.productId ?? "",
    photoUrl: review.photoUrl,
    photoAlt: review.photoAlt ?? "",
    contact: review.source === "customer" ? review.contact : null,
    sentOn: formatShortDate(review.createdAt, now),
    publishedOn: review.publishedAt ? formatShortDate(review.publishedAt, now) : null,
    updatedAt: review.updatedAt.getTime(),
  };
}

/** Check, publish, hide, edit or delete one review. */
export default async function EditReviewPage({ params }: PageProps<"/admin/reviews/[id]">) {
  const { id } = await params;
  await requireAdmin(`/admin/reviews/${id}`);
  const review = await loadReview(id);
  if (!review) notFound();

  return <ReviewEditor key={review.id} review={toEditorReview(review, new Date())} products={await loadReviewProducts()} />;
}
