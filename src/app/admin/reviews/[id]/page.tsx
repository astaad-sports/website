import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { z } from "zod";

import { customerName } from "@/components/admin/customer-rows";
import { ReviewCustomer, type ReviewCustomerView } from "@/components/admin/review-customer";
import { ReviewEditor, type ReviewEditorReview } from "@/components/admin/review-editor";
import { loadReviewProducts } from "@/components/admin/review-products";
import { listCustomers } from "@/db/customers";
import { getReviewCustomer, listPurchases } from "@/db/review-customers";
import { getReview, type ReviewWithProduct } from "@/db/reviews";
import { isAdmin } from "@/lib/auth/admin";
import { getCurrentUser, requireAdmin } from "@/lib/auth/session";
import { formatShortDate } from "@/lib/format";
import { confirmReviewCustomer, setReviewCustomer } from "@/lib/reviews/customer-actions";

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

/** The customer the review is on, with their paid orders of the product it names. */
async function loadCustomer(review: ReviewWithProduct, now: Date): Promise<ReviewCustomerView | null> {
  const link = await getReviewCustomer(review.id);
  if (!link) return null;
  const slug = review.product?.slug;
  const purchases = slug ? (await listPurchases(link.customer.id)).filter((purchase) => purchase.productSlug === slug) : [];
  return {
    id: link.customer.id,
    name: customerName(link.customer),
    email: link.customer.email,
    phone: link.customer.phone,
    linkedBy: link.linkedBy,
    bought: purchases.map((purchase) => ({ orderNumber: purchase.orderNumber, on: formatShortDate(purchase.boughtAt, now) })),
  };
}

/** Check, publish, hide, edit or delete one review, and say which customer wrote it. */
export default async function EditReviewPage({ params }: PageProps<"/admin/reviews/[id]">) {
  const { id } = await params;
  await requireAdmin(`/admin/reviews/${id}`);
  const review = await loadReview(id);
  if (!review) notFound();
  const now = new Date();
  const [products, customer, customers] = await Promise.all([
    loadReviewProducts(),
    loadCustomer(review, now),
    listCustomers({ limit: 500 }),
  ]);

  return (
    <ReviewEditor
      key={review.id}
      review={toEditorReview(review, now)}
      products={products}
      customer={
        <ReviewCustomer
          customer={customer}
          productName={review.product?.name ?? null}
          customers={customers.map((entry) => ({
            id: entry.id,
            label: [customerName(entry), entry.name?.trim() ? entry.email : null].filter(Boolean).join(" · "),
          }))}
          setCustomer={setReviewCustomer.bind(null, review.id)}
          confirmCustomer={confirmReviewCustomer.bind(null, review.id)}
        />
      }
    />
  );
}
