import { readMagicRequest } from "@/lib/orders/magic";
import { shippingInfoResponse } from "@/lib/payments/magic";
import { getFreshStoreCatalogue } from "@/lib/products/catalogue";

/**
 * Razorpay Magic Checkout's shipping info address (Razorpay Dashboard > Magic
 * Checkout > Shipping Setup): for each address the customer may ship to,
 * whether the store delivers there and the delivery charge from Settings.
 * Razorpay sends no signature, so this tells nothing the store's pages do not.
 */
async function shippingInfo(request: Request) {
  const { deliveryFeePaise } = await getFreshStoreCatalogue();
  return Response.json(shippingInfoResponse(await readMagicRequest(request), deliveryFeePaise));
}

export { shippingInfo as GET, shippingInfo as POST };
