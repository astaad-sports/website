import { timingSafeEqual } from "node:crypto";

import { notifyUnpaidOrders } from "@/lib/email/notify";

function sameSecret(expected: string, received: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * The daily look for checkouts that stopped at payment, called by Vercel
 * Cron (see vercel.json). Each one found gets an unpaid order alert to
 * ADMIN_EMAILS, once. Vercel sends CRON_SECRET as a bearer token, so set it
 * in the site's environment variables; without it nothing runs, and anyone
 * else calling this address is turned away.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return new Response("CRON_SECRET is not configured", { status: 503 });
  if (!sameSecret(`Bearer ${secret}`, request.headers.get("authorization") ?? "")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await notifyUnpaidOrders();
  return Response.json({
    orders: result.orders,
    sent: result.sent.length,
    failed: result.failed.length,
    ...(result.stopped ? { stopped: true } : {}),
  });
}
