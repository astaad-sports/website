import { expect, test } from "bun:test";

import { orderPath } from "./path";

const id = "5d0c2a1e-0000-4000-8000-00000000000a";

test("an account's order opens in the account, by its number", () => {
  expect(orderPath({ id, number: 10019, userId: "user-1" })).toBe("/account/orders/10019");
});

test("a guest's order opens at its own address, by its id", () => {
  expect(orderPath({ id, number: 10019, userId: null })).toBe(`/orders/${id}`);
});
