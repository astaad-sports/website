import { refuseUnlessCron } from "@/lib/cron";
import { notifyCartReminders } from "@/lib/email/notify";

/**
 * The daily cart reminders, called by Vercel Cron (see vercel.json): one
 * email to each customer who left a cart unbought for a day, once. Needs
 * CRON_SECRET, like the other daily checks.
 */
export async function GET(request: Request) {
  const refused = refuseUnlessCron(request);
  if (refused) return refused;

  const result = await notifyCartReminders();
  return Response.json(result);
}
