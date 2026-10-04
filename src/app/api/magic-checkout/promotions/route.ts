import { applyMagicPromotion, readMagicRequest } from "@/lib/orders/magic";

/**
 * Razorpay Magic Checkout's "URL for get promotions" (Razorpay Dashboard >
 * Magic Checkout > Checkout Settings): the coupons Razorpay's window lists
 * for every customer. The store's codes are handed out, not advertised, so
 * the list is empty and the customer types theirs. A request that carries a
 * code is an "apply" sent to this address, and is answered as one.
 */
async function promotions(request: Request) {
  const body = await readMagicRequest(request);
  if (typeof body.code === "string" && body.code) {
    const response = await applyMagicPromotion(body);
    return Response.json(response, { status: "promotion" in response ? 200 : 400 });
  }
  return Response.json({ promotions: [] });
}

export { promotions as GET, promotions as POST };
