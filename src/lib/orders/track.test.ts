import { beforeEach, describe, expect, mock, test } from "bun:test";

import type { OrderWithItems } from "@/db/orders";

const lookups: [number, string][] = [];
let found: OrderWithItems | undefined;

// The lookup, not the database: trackOrder's job is checking and tidying the fields.
mock.module("@/db/orders", () => ({
  getOrderForTracking: async (number: number, phone: string) => {
    lookups.push([number, phone]);
    return found;
  },
}));

const { trackOrder } = await import("./track");

function form(number: string, phone: string): FormData {
  const data = new FormData();
  data.set("number", number);
  data.set("phone", phone);
  return data;
}

const shipped = {
  id: "order-1",
  number: 10019,
  status: "shipped",
  createdAt: new Date("2026-10-20T10:00:00Z"),
  paidAt: new Date("2026-10-20T10:01:00Z"),
  packedAt: new Date("2026-10-21T09:00:00Z"),
  shippedAt: new Date("2026-10-21T15:00:00Z"),
  deliveredAt: null,
  carrier: "trackon",
  trackingNumber: "500912345",
  shipName: "Virat",
  shipPhone: "9876543210",
  shipLine1: "12 Mall Road",
  items: [{ productName: "Run Machine", quantity: 1 }],
} as unknown as OrderWithItems;

describe("tracking an order", () => {
  beforeEach(() => {
    lookups.length = 0;
    found = undefined;
    process.env.DATABASE_URL = "postgres://test";
  });

  test("the number and mobile are tidied before the lookup", async () => {
    found = shipped;
    await trackOrder({}, form(" ast-10019 ", "+91 98765-43210"));
    expect(lookups).toEqual([[10019, "9876543210"]]);
  });

  test("a match shows progress and items, but not the address", async () => {
    found = shipped;
    const { order } = await trackOrder({}, form("10019", "9876543210"));
    expect(order).toMatchObject({ number: 10019, status: "shipped", trackingNumber: "500912345" });
    expect(order?.items).toEqual([{ name: "Run Machine", quantity: 1 }]);
    expect(JSON.stringify(order)).not.toContain("Mall Road");
    expect(JSON.stringify(order)).not.toContain("9876543210");
  });

  test("no match reads the same whichever field was wrong", async () => {
    const { error, order } = await trackOrder({}, form("AST-10019", "9876543210"));
    expect(order).toBeUndefined();
    expect(error).toContain("couldn't find an order");
  });

  test("bad fields are flagged without a lookup", async () => {
    const { fieldErrors } = await trackOrder({}, form("order", "12345"));
    expect(fieldErrors?.number).toContain("AST-10019");
    expect(fieldErrors?.phone).toContain("10-digit");
    expect(lookups).toHaveLength(0);
  });
});
