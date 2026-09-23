// Shipping, shared by the admin (recording shipments) and the storefront
// (showing them). Trackon has no public API, so shipments are booked with
// Trackon directly and their AWB numbers entered here.
import { z } from "zod";

import type { Order } from "@/db/schema";

export const CARRIERS = {
  trackon: {
    name: "Trackon Couriers",
    /** Trackon's public tracking page. It takes the AWB in its own form, not in the URL. */
    trackingUrl: "https://www.trackon.in/courier-tracking",
  },
} as const;

export type CarrierId = keyof typeof CARRIERS;
export const DEFAULT_CARRIER: CarrierId = "trackon";
const CARRIER_IDS = Object.keys(CARRIERS) as [CarrierId, ...CarrierId[]];

export function isCarrierId(value: string | null | undefined): value is CarrierId {
  return value != null && Object.hasOwn(CARRIERS, value);
}

export function carrierName(id: string | null | undefined): string {
  return isCarrierId(id) ? CARRIERS[id].name : "Courier";
}

/** AWBs are letters and digits: "1234 5678-90" → "1234567890". */
export function normaliseTrackingNumber(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

export const trackingNumberSchema = z
  .string()
  .transform(normaliseTrackingNumber)
  .pipe(z.string().regex(/^[A-Z0-9]{6,20}$/, "Enter the AWB number: 6 to 20 letters or digits."));

export const shipOrderSchema = z.object({
  orderId: z.uuid(),
  carrier: z.enum(CARRIER_IDS),
  trackingNumber: trackingNumberSchema,
});

export interface TimelineStep {
  label: string;
  date: Date | null;
}

/** Placed, paid, shipped, delivered: each with its date once it has happened. */
export function orderTimeline(
  order: Pick<Order, "createdAt" | "paidAt" | "shippedAt" | "deliveredAt">
): TimelineStep[] {
  return [
    { label: "Order placed", date: order.createdAt },
    { label: "Payment confirmed", date: order.paidAt },
    { label: "Shipped", date: order.shippedAt },
    { label: "Delivered", date: order.deliveredAt },
  ];
}
