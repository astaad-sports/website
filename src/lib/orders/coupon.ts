import "server-only";

import { findOfferByCode } from "@/db/offers";
import { CODE_PATTERN, couponProblem, normaliseCode, toAppliedCoupon, type AppliedCoupon } from "@/lib/offers/model";

export type CouponCheck = { ok: true; coupon: AppliedCoupon } | { ok: false; error: string };

/**
 * The coupon behind a code, if it can be used now, or why not. The cart's
 * coupon box, placing an order and Razorpay's Magic Checkout all check a
 * code here.
 */
export async function couponFor(raw: unknown): Promise<CouponCheck> {
  const code = normaliseCode(typeof raw === "string" ? raw : "");
  if (!code) return { ok: false, error: "Enter a coupon code." };
  const offer = CODE_PATTERN.test(code) && process.env.DATABASE_URL ? await findOfferByCode(code) : undefined;
  const problem = couponProblem(offer);
  return problem || !offer ? { ok: false, error: problem ?? "This code isn't valid." } : { ok: true, coupon: toAppliedCoupon(offer) };
}
