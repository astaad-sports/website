import "server-only";

import { timingSafeEqual } from "node:crypto";

function sameSecret(expected: string, received: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Whether a call to a cron route came from Vercel Cron, which sends
 * CRON_SECRET as a bearer token: null when it did, else the response that
 * turns it away. Without CRON_SECRET in the site's environment variables
 * nothing runs.
 */
export function refuseUnlessCron(request: Request): Response | null {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return new Response("CRON_SECRET is not configured", { status: 503 });
  if (!sameSecret(`Bearer ${secret}`, request.headers.get("authorization") ?? "")) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}
