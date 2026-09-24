import { describe, expect, test } from "bun:test";

import { ORDER_STATUS_LABEL } from "./status";
import {
  ADMIN_STATUS_LABEL,
  FULFILMENT_STEPS,
  filterStatuses,
  isFulfilmentStatus,
  likePattern,
  needsTracking,
  nextStep,
  normaliseSearch,
  parseOrderFilter,
  timestampPlan,
} from "./fulfilment";

describe("fulfilment steps", () => {
  test("a paid order is Pending to the admin and Confirmed to the customer", () => {
    expect(FULFILMENT_STEPS.map((step) => ADMIN_STATUS_LABEL[step])).toEqual([
      "Pending",
      "Confirmed",
      "Packed",
      "Shipped",
      "Delivered",
    ]);
    expect(ORDER_STATUS_LABEL.paid).toBe("Confirmed");
    expect(ORDER_STATUS_LABEL.packed).toBe("Packed");
  });

  test("only the five fulfilment steps can be chosen", () => {
    expect(isFulfilmentStatus("packed")).toBe(true);
    expect(isFulfilmentStatus("pending_payment")).toBe(false);
    expect(isFulfilmentStatus("cancelled")).toBe(false);
    expect(isFulfilmentStatus(undefined)).toBe(false);
  });

  test("the next-step button packs, ships, then delivers", () => {
    expect(nextStep("paid")).toEqual({ target: "packed", label: "Mark as packed" });
    expect(nextStep("confirmed")).toEqual({ target: "packed", label: "Mark as packed" });
    expect(nextStep("packed")).toEqual({ target: "shipped", label: "Mark as shipped" });
    expect(nextStep("shipped")).toEqual({ target: "delivered", label: "Mark as delivered" });
    expect(nextStep("delivered")).toBeNull();
    expect(nextStep("pending_payment")).toBeNull();
  });

  test("shipping and delivering need a tracking ID", () => {
    expect(needsTracking("packed")).toBe(false);
    expect(needsTracking("shipped")).toBe(true);
    expect(needsTracking("delivered")).toBe(true);
  });

  test("moving to a step stamps it and every earlier step, and clears the later ones", () => {
    expect(timestampPlan("packed")).toEqual({ stamp: ["confirmedAt", "packedAt"], clear: ["shippedAt", "deliveredAt"] });
    expect(timestampPlan("paid")).toEqual({ stamp: [], clear: ["confirmedAt", "packedAt", "shippedAt", "deliveredAt"] });
    expect(timestampPlan("delivered")).toEqual({
      stamp: ["confirmedAt", "packedAt", "shippedAt", "deliveredAt"],
      clear: [],
    });
  });
});

describe("the orders list", () => {
  test("Pending covers every order that has not shipped", () => {
    expect(filterStatuses("pending")).toEqual(["paid", "confirmed", "packed"]);
    expect(filterStatuses("all")).not.toContain("pending_payment");
  });

  test("the filter comes from the URL, with the old to_ship name kept", () => {
    expect(parseOrderFilter("shipped")).toBe("shipped");
    expect(parseOrderFilter("to_ship")).toBe("pending");
    expect(parseOrderFilter("nonsense")).toBe("all");
    expect(parseOrderFilter(["shipped"])).toBe("all");
  });

  test("search terms are trimmed, and their wildcards taken literally", () => {
    expect(normaliseSearch("  Rahul   Sharma ")).toBe("Rahul Sharma");
    expect(normaliseSearch("   ")).toBeNull();
    expect(normaliseSearch(undefined)).toBeNull();
    expect(normaliseSearch("x".repeat(200))).toHaveLength(80);
    expect(likePattern("50%_off\\")).toBe("%50\\%\\_off\\\\%");
  });
});
