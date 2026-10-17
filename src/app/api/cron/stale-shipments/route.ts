import { refuseUnlessCron } from "@/lib/cron";
import { notifyStaleShipments } from "@/lib/email/notify";

/**
 * The daily delivery check, called by Vercel Cron (see vercel.json): one
 * email to ADMIN_EMAILS listing the orders shipped more than a week ago and
 * still marked Shipped, so each one gets marked delivered and its customer
 * the delivery email. Nothing goes when there are none. Needs CRON_SECRET,
 * like the unpaid orders check.
 */
export async function GET(request: Request) {
  const refused = refuseUnlessCron(request);
  if (refused) return refused;

  const result = await notifyStaleShipments();
  return Response.json(result);
}
