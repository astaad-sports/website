"use server";

import { getOrderForTracking } from "@/db/orders";
import type { Order } from "@/db/schema";
import { normalisePhone } from "@/lib/checkout";
import { parseOrderNumber } from "@/lib/format";

/** What the tracking page shows: progress and items, never the address or payment. */
export type TrackedOrder = Pick<
  Order,
  "number" | "status" | "createdAt" | "paidAt" | "packedAt" | "shippedAt" | "deliveredAt" | "carrier" | "trackingNumber"
> & { items: { name: string; quantity: number }[] };

export interface TrackOrderState {
  order?: TrackedOrder;
  error?: string;
  fieldErrors?: { number?: string; phone?: string };
}

/**
 * Look up an order for the Track Order page by its number and the mobile
 * number it ships to. Field names: number, phone. Works signed out.
 */
export async function trackOrder(_previous: TrackOrderState, form: FormData): Promise<TrackOrderState> {
  const rawNumber = String(form.get("number") ?? "");
  const phone = normalisePhone(String(form.get("phone") ?? ""));
  const number = parseOrderNumber(rawNumber);

  const fieldErrors: TrackOrderState["fieldErrors"] = {};
  if (!number) fieldErrors.number = "Enter your order number, like AST-10019.";
  if (!/^\d{10}$/.test(phone)) fieldErrors.phone = "Enter the 10-digit mobile number you gave at checkout.";
  if (!number || fieldErrors.phone) return { fieldErrors };

  if (!process.env.DATABASE_URL) return { error: "Order tracking isn't available right now. Please contact us." };
  const order = await getOrderForTracking(number, phone);
  if (!order) {
    return {
      error: "We couldn't find an order with that number and mobile number. Check both and try again.",
    };
  }

  return {
    order: {
      number: order.number,
      status: order.status,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      packedAt: order.packedAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      carrier: order.carrier,
      trackingNumber: order.trackingNumber,
      items: order.items.map((item) => ({ name: item.productName, quantity: item.quantity })),
    },
  };
}
