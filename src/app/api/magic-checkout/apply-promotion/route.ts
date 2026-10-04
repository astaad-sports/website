import { applyMagicPromotion, readMagicRequest } from "@/lib/orders/magic";

/**
 * Razorpay Magic Checkout's "URL for apply promotions" (Razorpay Dashboard >
 * Magic Checkout > Checkout Settings): the coupon code the customer typed in
 * Razorpay's window, checked as the cart checks it. A code that cannot be
 * used is answered with status 400 and the reason, as Razorpay's own plugins do.
 */
async function applyPromotion(request: Request) {
  const response = await applyMagicPromotion(await readMagicRequest(request));
  return Response.json(response, { status: "promotion" in response ? 200 : 400 });
}

export { applyPromotion as GET, applyPromotion as POST };
