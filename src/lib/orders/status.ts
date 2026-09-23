import type { OrderStatus } from "@/db/schema";

/** What the customer reads for each order status. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Payment pending",
  paid: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** `success` for good news, muted otherwise; the label always carries the meaning. */
export function orderStatusTone(status: OrderStatus): string {
  return status === "paid" || status === "delivered" || status === "shipped"
    ? "text-success"
    : status === "cancelled"
      ? "text-danger"
      : "text-ink-muted";
}
