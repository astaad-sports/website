import { markOrderPaid } from "@/db/orders";
import { productsChanged } from "@/lib/products/catalogue";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";

interface RazorpayWebhook {
  event?: string;
  payload?: {
    order?: { entity?: { id?: string } };
    payment?: { entity?: { id?: string; order_id?: string } };
  };
}

/**
 * Razorpay webhooks. Subscribe to `order.paid` in the Razorpay dashboard with
 * this URL and RAZORPAY_WEBHOOK_SECRET as the secret. It marks the order paid
 * even when the customer closes the tab before the checkout handler runs.
 */
export async function POST(request: Request) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    return new Response("Webhook secret is not configured", { status: 503 });
  }

  // The signature covers the raw body, so read it before parsing.
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(rawBody, signature)) {
    return new Response("Invalid signature", { status: 400 });
  }

  let event: RazorpayWebhook;
  try {
    event = JSON.parse(rawBody) as RazorpayWebhook;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  const razorpayOrderId =
    event.event === "order.paid" ? event.payload?.order?.entity?.id : payment?.order_id;

  if ((event.event === "order.paid" || event.event === "payment.captured") && razorpayOrderId && payment?.id) {
    const { stockChanged } = await markOrderPaid({ razorpayOrderId, razorpayPaymentId: payment.id });
    if (stockChanged) productsChanged();
  }

  // Acknowledge every verified event, handled or not, so Razorpay does not retry it.
  return Response.json({ received: true });
}
