import { refuseUnlessCron } from "@/lib/cron";
import { notifyUnpaidOrders } from "@/lib/email/notify";

/**
 * The daily look for checkouts that stopped at payment, called by Vercel
 * Cron (see vercel.json). Each one found gets an unpaid order alert to
 * ADMIN_EMAILS, once. Vercel sends CRON_SECRET as a bearer token, so set it
 * in the site's environment variables; without it nothing runs, and anyone
 * else calling this address is turned away.
 */
export async function GET(request: Request) {
  const refused = refuseUnlessCron(request);
  if (refused) return refused;

  const result = await notifyUnpaidOrders();
  return Response.json({
    orders: result.orders,
    sent: result.sent.length,
    failed: result.failed.length,
    ...(result.stopped ? { stopped: true } : {}),
  });
}
