import { describe, expect, test } from "bun:test";

import type { OrderWithItems } from "@/db/orders";

import { itemsSummary, orderTemplate, parameterCount, TEMPLATES, templateSubmission } from "./templates";

const order = {
  id: "0d6b5f0e-3c4c-4a8e-9b7e-2f1f8a3c9d10",
  number: 10023,
  userId: "user-1",
  status: "paid",
  isTest: false,
  totalPaise: 499900,
  shipName: "Rahul Sharma",
  shipPhone: "9876543210",
  shipCity: "Srinagar",
  shipState: "Jammu and Kashmir",
  shipPincode: "190001",
  carrier: "trackon",
  trackingNumber: "500123456789",
  items: [
    { productName: "Astaad Falcon Pro", quantity: 2 },
    { productName: "Batting Gloves", quantity: 1 },
  ],
} as unknown as OrderWithItems;

describe("TEMPLATES", () => {
  test("each example has a value for each parameter, as Meta's review needs", () => {
    for (const template of Object.values(TEMPLATES)) {
      expect(template.example).toHaveLength(parameterCount(template.body));
    }
  });

  test("each order template fills exactly its template's parameters", () => {
    for (const template of Object.values(TEMPLATES)) {
      expect(orderTemplate(template.kind, order, "en").body).toHaveLength(parameterCount(template.body));
    }
  });

  test("Meta refuses a body that starts or ends with a parameter", () => {
    for (const template of Object.values(TEMPLATES)) {
      expect(template.body).not.toMatch(/^\{\{|\}\}$/);
    }
  });
});

test("itemsSummary", () => {
  expect(itemsSummary(order.items)).toBe("Astaad Falcon Pro × 2 and 1 more");
  expect(itemsSummary([])).toBe("your order");
});

describe("orderTemplate", () => {
  test("the customer's button opens their order; the admin's opens the admin", () => {
    expect(orderTemplate("order_placed", order, "en")).toEqual({
      type: "template",
      name: "astaad_order_placed",
      language: "en",
      body: ["Rahul", "AST-10023", "₹ 4,999", "Astaad Falcon Pro × 2 and 1 more"],
      urlSuffix: "account/orders/10023",
    });
    expect(orderTemplate("new_order_alert", order, "en").urlSuffix).toBe("admin/orders/10023");
  });

  test("shipped gives the courier and tracking ID; a test order says so", () => {
    expect(orderTemplate("order_shipped", { ...order, isTest: true }, "en").body).toEqual([
      "Rahul",
      "AST-10023 (test)",
      "Trackon Couriers",
      "500123456789",
    ]);
  });
});

test("templateSubmission is a Utility template whose button opens the site", () => {
  expect(templateSubmission(TEMPLATES.order_delivered, "https://astaadsports.com/", "en")).toMatchObject({
    name: "astaad_order_delivered",
    language: "en",
    category: "UTILITY",
    components: [
      { type: "BODY", example: { body_text: [["Rahul", "AST-10023"]] } },
      { type: "BUTTONS", buttons: [{ type: "URL", url: "https://astaadsports.com/{{1}}", example: ["https://astaadsports.com/account/orders/10023"] }] },
    ],
  });
});
