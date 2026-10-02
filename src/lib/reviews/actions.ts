"use server";

import { createHash } from "node:crypto";

import { headers } from "next/headers";

import { getProductById } from "@/db/products";
import { linkReview } from "@/db/review-customers";
import { countReviewsFrom, createReview } from "@/db/reviews";
import { getCurrentUser } from "@/lib/auth/session";
import { notifyLater, notifyNewReview } from "@/lib/email/notify";
import { removeStoredImage, storeImage } from "@/lib/products/storage";

import { parseCustomerReview, type ReviewFieldErrors } from "./model";

export interface ReviewFormState {
  fieldErrors?: ReviewFieldErrors;
  error?: string;
  /** Set once the review is in: whose it was, and whether it stays private. */
  sent?: { name: string; isPrivate: boolean };
}

/** One sender can send this many reviews a day; more is almost always a bot. */
const DAILY_LIMIT = 5;

/**
 * Who sent it, as a hash of the IP address: enough to count a sender's
 * reviews without keeping the address itself.
 */
async function senderHash(): Promise<string | null> {
  const list = await headers();
  const ip = list.get("x-real-ip") ?? list.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip ? createHash("sha256").update(`astaad-review:${ip}`).digest("hex").slice(0, 32) : null;
}

/**
 * A customer's review from /reviews/write (see parseCustomerReview for the
 * fields; `photo` is an optional file the browser has already shrunk). It
 * waits as New until the admin publishes it, and the admins are emailed that
 * it has come. Works signed out; signed in, it is kept on the customer's
 * account. `website` is a field people never see: a form that fills it in is
 * a bot, and is thanked without anything being saved.
 */
export async function submitReview(_previous: ReviewFormState, form: FormData): Promise<ReviewFormState> {
  const parsed = parseCustomerReview(form);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, error: "Check the highlighted fields." };
  const values = parsed.values;
  const sent = { name: values.name, isPrivate: values.isPrivate };

  const website = form.get("website");
  if (typeof website === "string" && website.trim()) return { sent };

  if (!process.env.DATABASE_URL) return { error: "Reviews can't be sent right now. Please contact us instead." };

  const sender = await senderHash();
  if (sender && (await countReviewsFrom(sender, new Date(Date.now() - 86_400_000))) >= DAILY_LIMIT) {
    return { error: "You've sent a few reviews today. Try again tomorrow, or contact us." };
  }

  // Only a product that is on the store; the form listed those.
  let productName: string | null = null;
  if (values.productId) {
    const product = await getProductById(values.productId);
    if (!product || product.availability === "hidden") values.productId = null;
    else productName = product.name;
  }

  const file = form.get("photo");
  let photo = null;
  if (file instanceof File && file.size > 0) {
    const stored = await storeImage(file, "reviews");
    if (!stored.ok) return { fieldErrors: { photo: stored.error }, error: "Check the highlighted fields." };
    photo = stored.image;
  }

  let review;
  try {
    review = await createReview({
      source: "customer",
      status: "new",
      ...values,
      photoUrl: photo?.url ?? null,
      photoPathname: photo?.pathname ?? null,
      photoWidth: photo?.width ?? null,
      photoHeight: photo?.height ?? null,
      senderHash: sender,
    });
  } catch (error) {
    if (photo) await removeStoredImage(photo);
    throw error;
  }

  // After the response, so a slow or failed email never holds up the customer.
  const saved = review;
  notifyLater(() => notifyNewReview(saved, productName));

  // The review is in either way; the admin can still put the two together.
  const user = await getCurrentUser();
  if (user) {
    await linkReview(review.id, user.id, "customer").catch((error) =>
      console.error("Could not keep the review on the customer's account", error)
    );
  }
  return { sent };
}
