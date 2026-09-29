"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { getCustomer } from "@/db/customers";
import { isMissingTable } from "@/db/errors";
import { getReviewCustomer, linkReview, unlinkReview } from "@/db/review-customers";
import { getReview } from "@/db/reviews";
import { isAdmin } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/session";

import { reviewsChanged } from "./store";

export interface ReviewCustomerState {
  error?: string;
  /** The success message for the toast, e.g. "Customer linked". */
  saved?: string;
  /** Changes on every result, so the toast shows again for a repeated message. */
  at?: number;
}

const NOT_ADMIN = "Only store admins can change whose review this is. Sign in again.";
const NOT_READY = "Reviews can't be linked to customers yet: run the database migration first.";
const failed = (error: string): ReviewCustomerState => ({ error, at: Date.now() });

/** Run a change for an admin on a review that exists, then show the store and the page as they are now. */
async function onReview(reviewId: string, change: () => Promise<ReviewCustomerState>): Promise<ReviewCustomerState> {
  if (!isAdmin(await getCurrentUser())) return failed(NOT_ADMIN);
  if (!z.uuid().safeParse(reviewId).success || !(await getReview(reviewId))) return failed("This review no longer exists.");
  let result;
  try {
    result = await change();
  } catch (error) {
    if (!isMissingTable(error)) throw error;
    return failed(NOT_READY);
  }
  if (result.saved) {
    // "Verified buyer" on the store follows who the review belongs to.
    reviewsChanged();
    refresh();
  }
  return result;
}

/**
 * Say which customer wrote a review (`userId`), or that no one on the store
 * did (`userId` empty). `reviewId` is bound by the review's page.
 */
export async function setReviewCustomer(
  reviewId: string,
  _previous: ReviewCustomerState,
  form: FormData
): Promise<ReviewCustomerState> {
  return onReview(reviewId, async () => {
    const userId = form.get("userId");
    if (typeof userId !== "string" || userId === "") {
      await unlinkReview(reviewId);
      return { saved: "Customer removed", at: Date.now() };
    }
    if (!z.uuid().safeParse(userId).success || !(await getCustomer(userId))) return failed("Choose a customer from the list.");
    await linkReview(reviewId, userId, "admin");
    return { saved: "Customer linked", at: Date.now() };
  });
}

/** Confirm that the customer whose contact matched did write the review. Posts nothing: the page binds `reviewId`. */
export async function confirmReviewCustomer(reviewId: string): Promise<ReviewCustomerState> {
  return onReview(reviewId, async () => {
    const link = await getReviewCustomer(reviewId);
    if (!link) return failed("This review has no customer to confirm.");
    await linkReview(reviewId, link.customer.id, "admin");
    return { saved: "Customer confirmed", at: Date.now() };
  });
}
