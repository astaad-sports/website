import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { OrderView } from "@/components/orders/order-view";
import { getGuestOrder } from "@/db/orders";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false },
  // The address is the key to the order, so it is not passed on to other sites.
  referrer: "same-origin",
};

/**
 * An order placed as a guest (see OrderView). Its address is made from the
 * order's id, which cannot be guessed and is given only to the guest: after
 * paying, and in their emails. An account's order is not here; it opens in
 * the account.
 */
export default async function GuestOrderPage({ params, searchParams }: PageProps<"/orders/[id]">) {
  const [{ id }, { placed }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success || !process.env.DATABASE_URL) notFound();
  const order = await getGuestOrder(id);
  if (!order) notFound();

  return <OrderView order={order} placed={placed === "1"} guest />;
}
