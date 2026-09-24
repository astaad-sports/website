"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { codeInUse, createOffer, deleteOffer, endOfferNow, getOffer, updateOffer } from "@/db/offers";
import { listProductsWithImages } from "@/db/products";
import { isAdmin } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { productsChanged } from "@/lib/products/catalogue";

import { parseOfferForm, type OfferFieldErrors } from "./editor";
import { dayInIndia, offerStatus } from "./model";

export interface OfferActionState {
  fieldErrors?: OfferFieldErrors;
  error?: string;
  /** The success message for the toast, e.g. "Offer saved". */
  saved?: string;
  /** Changes on every result, so the toast shows again for a repeated message. */
  at?: number;
}

const NOT_ADMIN: OfferActionState = { error: "Only store admins can change offers. Sign in again." };
const SOMETHING_WRONG = "Something went wrong. Try again.";
const failed = (error: string): OfferActionState => ({ error, at: Date.now() });

async function signedInAdmin() {
  return isAdmin(await getCurrentUser());
}

/**
 * Create or save an offer from the offer form (`id` when editing). A new
 * offer opens the list on its tab with "Offer created"; a saved one stays put.
 */
export async function saveOffer(_previous: OfferActionState, form: FormData): Promise<OfferActionState> {
  if (!(await signedInAdmin())) return NOT_ADMIN;

  const id = form.get("id");
  const editing = typeof id === "string" && id !== "";
  if (editing && !z.uuid().safeParse(id).success) return failed(SOMETHING_WRONG);

  const parsed = parseOfferForm(form, { isNew: !editing });
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, error: "Check the highlighted fields.", at: Date.now() };
  const values = parsed.values;

  if (editing) {
    const current = await getOffer(id);
    if (!current) return failed("This offer no longer exists.");
    // The form holds whole days. An offer ended early ends partway through its
    // last day; saving that same day again must not run it on until midnight.
    if (dayInIndia(current.startsAt) === dayInIndia(values.startsAt)) values.startsAt = current.startsAt;
    if (dayInIndia(current.endsAt) === dayInIndia(values.endsAt)) values.endsAt = current.endsAt;
  }

  // Only products that still exist; the admin picked them from the current list.
  if (values.scope === "products") {
    const known = new Set((await listProductsWithImages()).map((product) => product.id));
    values.productIds = values.productIds.filter((productId) => known.has(productId));
    if (values.productIds.length === 0) return { fieldErrors: { scope: "Choose at least one product" }, at: Date.now() };
  }
  if (values.code && (await codeInUse(values.code, editing ? id : undefined))) {
    return { fieldErrors: { code: `Code ${values.code} is already used by another offer` }, at: Date.now() };
  }

  const result = editing ? await updateOffer(id, values) : await createOffer(values);
  if (!result.ok) {
    return result.reason === "code_taken"
      ? { fieldErrors: { code: `Code ${values.code} is already used by another offer` }, at: Date.now() }
      : failed("This offer no longer exists.");
  }
  productsChanged();
  if (editing) return { saved: "Offer saved", at: Date.now() };
  redirect(`/admin/offers?tab=${offerStatus(result.offer)}&done=created`);
}

const idSchema = z.object({ offerId: z.uuid() });

/** Stop a running offer now. Posts `offerId`. */
export async function endOffer(_previous: OfferActionState, form: FormData): Promise<OfferActionState> {
  if (!(await signedInAdmin())) return NOT_ADMIN;
  const parsed = idSchema.safeParse({ offerId: form.get("offerId") });
  if (!parsed.success) return failed(SOMETHING_WRONG);
  const offer = await getOffer(parsed.data.offerId);
  if (!offer) return failed("This offer no longer exists.");
  if (offerStatus(offer) !== "active") return failed("This offer isn't running.");

  await endOfferNow(offer.id);
  productsChanged();
  return { saved: "Offer ended", at: Date.now() };
}

/** Delete an offer and go back to the list. Orders keep the offer name they were placed with. Posts `offerId`. */
export async function removeOffer(_previous: OfferActionState, form: FormData): Promise<OfferActionState> {
  if (!(await signedInAdmin())) return NOT_ADMIN;
  const parsed = idSchema.safeParse({ offerId: form.get("offerId") });
  if (!parsed.success) return failed(SOMETHING_WRONG);
  const offer = await getOffer(parsed.data.offerId);
  if (!offer || !(await deleteOffer(offer.id))) return failed("This offer no longer exists.");

  productsChanged();
  redirect(`/admin/offers?tab=${offerStatus(offer)}&done=deleted`);
}
