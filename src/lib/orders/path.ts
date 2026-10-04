import type { Order } from "@/db/schema";

/**
 * Where a customer opens their order: in their account, or, for an order
 * placed as a guest, at an address made from the order's id. The id cannot be
 * guessed, and only the guest is given it: after paying, and in their emails.
 */
export function orderPath(order: Pick<Order, "id" | "number" | "userId">): string {
  return order.userId ? `/account/orders/${order.number}` : `/orders/${order.id}`;
}
