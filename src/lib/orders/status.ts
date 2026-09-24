import type { OrderStatus } from "@/db/schema";

/** What the customer reads for each order status. Confirming is the admin's step; to the customer a paid order is already confirmed. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Payment pending",
  paid: "Confirmed",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** `success` for good news, muted otherwise; the label always carries the meaning. */
export function orderStatusTone(status: OrderStatus): string {
  return status === "cancelled" ? "text-danger" : status === "pending_payment" ? "text-ink-muted" : "text-success";
}
