import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OrderView } from "@/components/orders/order-view";
import { getOrderForUser } from "@/db/orders";
import { requireUser } from "@/lib/auth/session";
import { formatOrderNumber, parseOrderNumber } from "@/lib/format";

export async function generateMetadata({
  params,
}: PageProps<"/account/orders/[number]">): Promise<Metadata> {
  const number = parseOrderNumber((await params).number);
  return {
    title: number ? `Order ${formatOrderNumber(number)}` : "Order",
    robots: { index: false },
  };
}

/** One of the customer's orders (see OrderView). Only its owner can see it. */
export default async function OrderPage({ params, searchParams }: PageProps<"/account/orders/[number]">) {
  const { number: raw } = await params;
  const { placed } = await searchParams;
  const user = await requireUser(`/account/orders/${raw}`);
  const number = parseOrderNumber(raw);
  if (!number) notFound();
  const order = await getOrderForUser(user.id, number);
  if (!order) notFound();

  return <OrderView order={order} placed={placed === "1"} />;
}
