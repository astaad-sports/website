"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getProductById } from "@/db/products";
import { createReview, deleteReview, getReview, setReviewStatus, updateReview, type ReviewEdit } from "@/db/reviews";
import { isAdmin } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { removeStoredImage, storeImage, type StoredImage } from "@/lib/products/storage";

import { parseAdminReview, type ReviewFieldErrors } from "./model";
import { reviewsChanged } from "./store";

export interface ReviewActionState {
  fieldErrors?: ReviewFieldErrors;
  error?: string;
  /** The success message for the toast, e.g. "Review saved". */
  saved?: string;
  /** Changes on every result, so the toast shows again for a repeated message. */
  at?: number;
}

const NOT_ADMIN: ReviewActionState = { error: "Only store admins can change reviews. Sign in again." };
const SOMETHING_WRONG = "Something went wrong. Try again.";
const GONE = "This review no longer exists.";
const failed = (error: string): ReviewActionState => ({ error, at: Date.now() });

async function signedInAdmin() {
  return isAdmin(await getCurrentUser());
}

function photoFields(photo: StoredImage | null): Pick<ReviewEdit, "photoUrl" | "photoPathname" | "photoWidth" | "photoHeight"> {
  return {
    photoUrl: photo?.url ?? null,
    photoPathname: photo?.pathname ?? null,
    photoWidth: photo?.width ?? null,
    photoHeight: photo?.height ?? null,
  };
}

/**
 * Add a review or save one (`id` when editing). Posts the fields
 * parseAdminReview reads, `photo` (a new file, already shrunk) and
 * `removePhoto` ("1" drops the current one). A new review is published at
 * once and opens the Published list with "Review added"; a saved one stays.
 */
export async function saveReview(_previous: ReviewActionState, form: FormData): Promise<ReviewActionState> {
  if (!(await signedInAdmin())) return NOT_ADMIN;

  const id = form.get("id");
  const editing = typeof id === "string" && id !== "";
  if (editing && !z.uuid().safeParse(id).success) return failed(SOMETHING_WRONG);
  const current = editing ? await getReview(id) : null;
  if (editing && !current) return failed(GONE);

  const file = form.get("photo");
  const newPhoto = file instanceof File && file.size > 0 ? file : null;
  const removePhoto = form.get("removePhoto") === "1";
  const hasPhoto = Boolean(newPhoto) || (Boolean(current?.photoUrl) && !removePhoto);

  const parsed = parseAdminReview(form, { hasPhoto });
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, error: "Check the highlighted fields.", at: Date.now() };
  const values = parsed.values;
  if (values.productId && !(await getProductById(values.productId))) {
    return { fieldErrors: { productId: "This product no longer exists" }, at: Date.now() };
  }

  let stored: StoredImage | null = null;
  if (newPhoto) {
    const result = await storeImage(newPhoto, "reviews");
    if (!result.ok) return { fieldErrors: { photo: result.error }, error: "Check the highlighted fields.", at: Date.now() };
    stored = result.image;
  }

  if (!current) {
    try {
      await createReview({ source: "admin", status: "published", publishedAt: new Date(), ...values, ...photoFields(stored) });
    } catch (error) {
      if (stored) await removeStoredImage(stored);
      throw error;
    }
    reviewsChanged();
    redirect("/admin/reviews?tab=published&done=added");
  }

  const photoChanged = Boolean(stored) || removePhoto;
  const updated = await updateReview(current.id, { ...values, ...(photoChanged ? photoFields(stored) : {}) });
  if (!updated) {
    if (stored) await removeStoredImage(stored);
    return failed(GONE);
  }
  if (photoChanged && current.photoUrl) await removeStoredImage({ url: current.photoUrl, pathname: current.photoPathname });
  reviewsChanged();
  return { saved: "Review saved", at: Date.now() };
}

const statusSchema = z.object({ reviewId: z.uuid(), status: z.enum(["published", "hidden"]) });

/**
 * Publish a review, or take it off the site. Hiding a new private review
 * marks it as read. Posts `reviewId` and `status`.
 */
export async function changeReviewStatus(_previous: ReviewActionState, form: FormData): Promise<ReviewActionState> {
  if (!(await signedInAdmin())) return NOT_ADMIN;
  const parsed = statusSchema.safeParse({ reviewId: form.get("reviewId"), status: form.get("status") });
  if (!parsed.success) return failed(SOMETHING_WRONG);
  const { reviewId, status } = parsed.data;

  const review = await getReview(reviewId);
  if (!review) return failed(GONE);
  if (status === "published" && review.isPrivate) {
    return failed("The customer asked to keep this private, so it can't go on the site.");
  }
  if (!(await setReviewStatus(review.id, status))) return failed(GONE);
  reviewsChanged();
  if (status === "published") return { saved: "Review published", at: Date.now() };
  return { saved: review.isPrivate ? "Marked as read" : "Review hidden", at: Date.now() };
}

const idSchema = z.object({ reviewId: z.uuid() });

/** Delete a review and its uploaded photo, then go back to its list. Posts `reviewId`. */
export async function removeReview(_previous: ReviewActionState, form: FormData): Promise<ReviewActionState> {
  if (!(await signedInAdmin())) return NOT_ADMIN;
  const parsed = idSchema.safeParse({ reviewId: form.get("reviewId") });
  if (!parsed.success) return failed(SOMETHING_WRONG);
  const review = await deleteReview(parsed.data.reviewId);
  if (!review) return failed(GONE);

  if (review.photoUrl) await removeStoredImage({ url: review.photoUrl, pathname: review.photoPathname });
  reviewsChanged();
  redirect(`/admin/reviews?tab=${review.status}&done=deleted`);
}
