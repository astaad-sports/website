import { describe, expect, test } from "bun:test";

import { addressSchema, normalisePhone, placeOrderSchema } from "./checkout";

const valid = {
  name: "Virat Test",
  phone: "+91 98765 43210",
  line1: "12 Stadium Road",
  line2: "",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400020",
};

describe("addressSchema", () => {
  test("accepts an Indian address and cleans the phone and blank line 2", () => {
    const address = addressSchema.parse(valid);
    expect(address.phone).toBe("9876543210");
    expect(address.line2).toBeUndefined();
  });

  test("names the field that is wrong", () => {
    const result = addressSchema.safeParse({ ...valid, phone: "12345", pincode: "0123", state: "Atlantis" });
    expect(result.success).toBe(false);
    const fields = result.error!.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["phone", "pincode", "state"]));
  });
});

test("normalisePhone keeps the ten digits", () => {
  expect(normalisePhone("098765-43210")).toBe("9876543210");
  expect(normalisePhone("919876543210")).toBe("9876543210");
  expect(normalisePhone("98765 43210")).toBe("9876543210");
});

describe("placeOrderSchema", () => {
  const order = {
    items: [{ kind: "gear", slug: "pro-batting-gloves", options: {}, quantity: 1 }],
    address: valid,
  };

  test("needs no email: a signed-in customer's order goes by the account's", () => {
    expect(placeOrderSchema.parse(order).email).toBeUndefined();
  });

  test("tidies a guest's email", () => {
    expect(placeOrderSchema.parse({ ...order, email: "  Virat@Example.com " }).email).toBe("virat@example.com");
  });

  test("names the email when a guest's is blank or wrong", () => {
    for (const email of ["", "virat", "virat@", "virat@example"]) {
      const result = placeOrderSchema.safeParse({ ...order, email });
      expect(result.success).toBe(false);
      expect(result.error!.issues.map((issue) => issue.path[0])).toEqual(["email"]);
      expect(result.error!.issues[0].message).toBe("Enter a valid email address.");
    }
  });
});
