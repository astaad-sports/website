// Customer reviews: what the store shows, and how the customer's form and the
// admin's form are checked. No server imports, so client forms share it.
import { z } from "zod";

import type { ReviewStatus } from "@/db/schema";

export const REVIEW_LIMITS = {
  name: 60,
  place: 60,
  body: 1000,
  /** The fewest letters a customer's review can have. */
  bodyMin: 3,
  contact: 120,
  photoAlt: 200,
} as const;

export const REVIEW_STATUSES: readonly ReviewStatus[] = ["new", "published", "hidden"];

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  new: "New",
  published: "Published",
  hidden: "Hidden",
};

/** What each star count means, for the rating picker: RATING_WORDS[4] is "Very good". */
export const RATING_WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"] as const;

/** "4 out of 5 stars", for screen readers. */
export function ratingLabel(rating: number): string {
  return `${rating} out of 5 stars`;
}

/** A published review as the store shows it. Plain values, so it can be cached as JSON. */
export interface PublicReview {
  id: string;
  name: string | null;
  place: string | null;
  rating: number | null;
  body: string | null;
  /** What they bought, linked to its page while it is on sale. */
  product: { name: string; href: string | null } | null;
  photo: { src: string; width: number; height: number; alt: string } | null;
}

export interface ReviewSummary {
  /** The mean star rating, or null while no review has one. */
  average: number | null;
  /** How many reviews have a star rating. */
  rated: number;
}

export function summariseReviews(reviews: readonly Pick<PublicReview, "rating">[]): ReviewSummary {
  const ratings = reviews.flatMap((review) => (review.rating ? [review.rating] : []));
  if (ratings.length === 0) return { average: null, rated: 0 };
  return { average: ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length, rated: ratings.length };
}

/** 4.86 → "4.9". */
export function formatAverage(average: number): string {
  return average.toFixed(1);
}

/** "Rohit S. · Mumbai Warriors", "Rohit S.", or null when neither is known. */
export function reviewByline(review: Pick<PublicReview, "name" | "place">): string | null {
  return [review.name, review.place].filter(Boolean).join(" · ") || null;
}

/** A photo's description for screen readers: the admin's own, or one from the name. */
export function photoAltText(alt: string | null, name: string | null): string {
  return alt || (name ? `Photo from ${name}` : "Photo from a customer");
}

// ---------------------------------------------------------------------------
// The forms

export type ReviewField = "rating" | "body" | "name" | "place" | "contact" | "productId" | "photo" | "photoAlt";

export type ReviewFieldErrors = Partial<Record<ReviewField, string>>;

/** One line: trimmed, with runs of spaces made one. */
function line(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

/** Paragraphs: trimmed, spaces tidied within lines, at most one blank line between paragraphs. */
function paragraphs(form: FormData, name: string): string {
  const value = form.get(name);
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((part) => part.trim().replace(/[ \t]+/g, " "))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const EMAIL = z.email();

/**
 * An email address, or an Indian mobile number stored as its 10 digits.
 * Empty is fine (it is optional); anything else is null.
 */
export function normaliseContact(value: string): string | null {
  if (!value) return "";
  if (value.includes("@")) return EMAIL.safeParse(value).success ? value.toLowerCase() : null;
  const digits = value.replace(/[\s()+-]/g, "").replace(/^(?:91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

function stars(value: string): number | null {
  return /^[1-5]$/.test(value) ? Number(value) : null;
}

function productId(value: string): string | null | undefined {
  if (!value) return null;
  return z.uuid().safeParse(value).success ? value : undefined;
}

export interface CustomerReviewValues {
  rating: number;
  body: string;
  name: string;
  place: string | null;
  contact: string | null;
  productId: string | null;
  isPrivate: boolean;
}

export type ParsedReview<Values> = { ok: true; values: Values } | { ok: false; fieldErrors: ReviewFieldErrors };

/**
 * Check the customer's form (/reviews/write). Fields: rating (1–5), body,
 * name, place, contact, productId and private ("on" keeps it off the site).
 * The photo is checked when it is stored.
 */
export function parseCustomerReview(form: FormData): ParsedReview<CustomerReviewValues> {
  const errors: ReviewFieldErrors = {};

  const rating = stars(line(form, "rating"));
  if (!rating) errors.rating = "Choose from 1 to 5 stars";

  const body = paragraphs(form, "body");
  if (body.length < REVIEW_LIMITS.bodyMin) errors.body = "Write a few words about it";
  else if (body.length > REVIEW_LIMITS.body) errors.body = `Keep it under ${REVIEW_LIMITS.body} characters`;

  const name = line(form, "name");
  if (!name) errors.name = "Enter your name";
  else if (name.length > REVIEW_LIMITS.name) errors.name = `Keep your name under ${REVIEW_LIMITS.name} characters`;

  const place = line(form, "place");
  if (place.length > REVIEW_LIMITS.place) errors.place = `Keep this under ${REVIEW_LIMITS.place} characters`;

  const contactText = line(form, "contact");
  const contact = contactText.length > REVIEW_LIMITS.contact ? null : normaliseContact(contactText);
  if (contact === null) errors.contact = "Enter an email address or a 10-digit mobile number";

  const product = productId(line(form, "productId"));
  if (product === undefined) errors.productId = "Choose a product from the list";

  if (Object.keys(errors).length || !rating || contact === null || product === undefined) {
    return { ok: false, fieldErrors: errors };
  }
  return {
    ok: true,
    values: {
      rating,
      body,
      name,
      place: place || null,
      contact: contact || null,
      productId: product,
      isPrivate: form.get("private") === "on",
    },
  };
}

export interface AdminReviewValues {
  rating: number | null;
  body: string | null;
  name: string | null;
  place: string | null;
  productId: string | null;
  photoAlt: string | null;
}

/**
 * Check the admin's review form. Every field is optional (a photo on its own
 * is a review), but a review needs its words or a photo: `hasPhoto` says
 * whether it will have one once saved. Fields: rating ("" for none), body,
 * name, place, productId, photoAlt.
 */
export function parseAdminReview(form: FormData, { hasPhoto }: { hasPhoto: boolean }): ParsedReview<AdminReviewValues> {
  const errors: ReviewFieldErrors = {};

  const ratingText = line(form, "rating");
  const rating = ratingText ? stars(ratingText) : null;
  if (ratingText && !rating) errors.rating = "Choose from 1 to 5 stars, or no rating";

  const body = paragraphs(form, "body");
  if (body.length > REVIEW_LIMITS.body) errors.body = `Keep it under ${REVIEW_LIMITS.body} characters`;
  else if (!body && !hasPhoto) errors.body = "Add the review's words or a photo";

  const name = line(form, "name");
  if (name.length > REVIEW_LIMITS.name) errors.name = `Keep the name under ${REVIEW_LIMITS.name} characters`;

  const place = line(form, "place");
  if (place.length > REVIEW_LIMITS.place) errors.place = `Keep this under ${REVIEW_LIMITS.place} characters`;

  const product = productId(line(form, "productId"));
  if (product === undefined) errors.productId = "Choose a product from the list";

  const photoAlt = line(form, "photoAlt");
  if (photoAlt.length > REVIEW_LIMITS.photoAlt) errors.photoAlt = `Keep this under ${REVIEW_LIMITS.photoAlt} characters`;

  if (Object.keys(errors).length || product === undefined) return { ok: false, fieldErrors: errors };
  return {
    ok: true,
    values: {
      rating,
      body: body || null,
      name: name || null,
      place: place || null,
      productId: product,
      photoAlt: photoAlt || null,
    },
  };
}
