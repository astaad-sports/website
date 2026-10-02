import { findPaidOrderId, markOrderPaid } from "@/db/orders";
import { notifyLater, notifyOrderPaid, notifyRefunded } from "@/lib/email/notify";
import { productsChanged } from "@/lib/products/catalogue";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { processedRefund } from "@/lib/payments/refund";

interface RazorpayWebhook {
  event?: string;
  payload?: {
    order?: { entity?: { id?: string } };
    payment?: { entity?: { id?: string; order_id?: string } };
  };
}

/**
 * Razorpay webhooks. Subscribe to `order.paid` and `refund.processed` in the
 * Razorpay dashboard with this URL and RAZORPAY_WEBHOOK_SECRET as the secret.
 * `order.paid` marks the order paid, and sends its emails, even when the
 * customer closes the tab before the checkout handler runs.
 * `refund.processed` emails the customer that a refund made in the dashboard
 * is on its way.
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
    const { order, stockChanged } = await markOrderPaid({ razorpayOrderId, razorpayPaymentId: payment.id });
    if (stockChanged) productsChanged();
    // After the response; if the checkout page already sent the emails, nothing goes twice.
    if (order && order.status !== "pending_payment") notifyLater(() => notifyOrderPaid(order.id));
  }

  const refund = processedRefund(event);
  if (refund) {
    const orderId = await findPaidOrderId({
      razorpayPaymentId: refund.paymentId,
      razorpayOrderId: refund.razorpayOrderId,
    });
    // After the response; a webhook delivered twice still sends one email per refund.
    if (orderId) {
      notifyLater(() => notifyRefunded(orderId, { id: refund.refundId, amountPaise: refund.amountPaise }));
    }
  }

  // Acknowledge every verified event, handled or not, so Razorpay does not retry it.
  return Response.json({ received: true });
}
