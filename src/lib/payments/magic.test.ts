import { describe, expect, test } from "bun:test";

import type { PricedCart, PricedLine } from "@/lib/cart";
import type { AppliedCoupon } from "@/lib/offers/model";

import {
  ADDRESS_MISSING,
  customerFromMagicOrder,
  customerWithoutAddress,
  magicLineItems,
  promotionCode,
  promotionResponse,
  shippingInfoResponse,
} from "./magic";

const gloves: PricedLine = {
  key: "gear:pro-batting-gloves",
  item: { kind: "gear", slug: "pro-batting-gloves", options: { size: "Men’s", hand: "Right hand" }, quantity: 2 },
  name: "Astaad Pro Batting Gloves",
  href: "/shop/batting-gloves/pro-batting-gloves",
  image: "/images/gloves.png",
  options: [],
  summary: "Men’s · Right hand",
  unitPricePaise: 269900,
  regularUnitPricePaise: 299900,
  offer: { name: "Monsoon Gloves", percentOff: 10, code: null },
  lineTotalPaise: 539800,
  problem: null,
  stockLeft: null,
  variant: "Men’s|Right hand",
};

const bag: PricedLine = {
  ...gloves,
  key: "gear:kit-bag",
  item: { kind: "gear", slug: "kit-bag", options: {}, quantity: 1 },
  name: "Astaad Kit Bag",
  href: "/shop/cricket-kitbags/kit-bag",
  image: "https://store.public.blob.vercel-storage.com/bag.png",
  summary: "",
  unitPricePaise: 450000,
  regularUnitPricePaise: 450000,
  offer: null,
  lineTotalPaise: 450000,
  variant: "",
};

const cart: PricedCart = {
  lines: [gloves, bag],
  invalid: 0,
  unavailable: 0,
  count: 3,
  subtotalPaise: 989800,
  discountPaise: 60000,
  shippingPaise: 0,
  totalPaise: 989800,
  coupon: null,
};

describe("magicLineItems", () => {
  const items = magicLineItems(cart, "https://astaadsports.com");

  test("names each product with its size, prices and full addresses", () => {
    expect(items[0]).toEqual({
      sku: "pro-batting-gloves",
      variant_id: "Men’s|Right hand",
      price: 299900,
      offer_price: 269900,
      quantity: 2,
      name: "Astaad Pro Batting Gloves",
      description: "Men’s · Right hand",
      image_url: "https://astaadsports.com/images/gloves.png",
      product_url: "https://astaadsports.com/shop/batting-gloves/pro-batting-gloves",
    });
  });

  test("a product sold one way still has a variant and a description", () => {
    expect(items[1].variant_id).toBe("kit-bag");
    expect(items[1].description).toBe("Astaad Kit Bag");
    expect(items[1].image_url).toBe("https://store.public.blob.vercel-storage.com/bag.png");
  });

  test("the offer prices add up to the cart's subtotal, the order's line_items_total", () => {
    expect(items.reduce((sum, item) => sum + item.offer_price * item.quantity, 0)).toBe(cart.subtotalPaise);
  });
});

describe("shippingInfoResponse", () => {
  const request = {
    order_id: "5d0c2a1e-0000-4000-8000-00000000000a",
    addresses: [
      { id: "0", zipcode: "560060", state_code: "KA", country: "IN" },
      { id: "1", zipcode: "10001", state_code: "NY", country: "US" },
      { id: "2", zipcode: "012345", state_code: "DL", country: "in" },
    ],
  };

  test("delivers across India for the charge in Settings, with no cash on delivery", () => {
    const { addresses } = shippingInfoResponse(request, 9900);
    expect(addresses[0]).toEqual({
      id: "0",
      zipcode: "560060",
      state_code: "KA",
      country: "IN",
      shipping_methods: [
        {
          id: "standard",
          name: "Standard delivery",
          description: "Delivery across India",
          serviceable: true,
          shipping_fee: 9900,
          cod: false,
          cod_fee: 0,
        },
      ],
    });
  });

  test("free delivery says so", () => {
    const [method] = shippingInfoResponse(request, 0).addresses[0].shipping_methods;
    expect(method.shipping_fee).toBe(0);
    expect(method.description).toBe("Free delivery across India");
  });

  test("turns down another country and a PIN code that is not one", () => {
    const { addresses } = shippingInfoResponse(request, 0);
    expect(addresses[1].shipping_methods[0].serviceable).toBe(false);
    expect(addresses[2].shipping_methods[0].serviceable).toBe(false);
  });

  test("an unreadable request has no addresses", () => {
    expect(shippingInfoResponse({}, 0)).toEqual({ addresses: [] });
    expect(shippingInfoResponse(null, 0)).toEqual({ addresses: [] });
  });
});

describe("promotionResponse", () => {
  const coupon: AppliedCoupon = {
    code: "WELCOME10",
    name: "Welcome offer",
    percentOff: 10,
    scope: "store",
    categories: [],
    productIds: [],
    startsAt: "2026-10-01T00:00:00.000Z",
    endsAt: "2026-11-01T00:00:00.000Z",
  };
  const status = { code: "WELCOME10", name: "Welcome offer" };

  test("the value is what the code takes off this order", () => {
    const withCoupon = { ...cart, subtotalPaise: 944800, coupon: { ...status, covered: true, applied: true } };
    expect(promotionResponse(cart, withCoupon, coupon)).toEqual({
      promotion: {
        reference_id: "WELCOME10",
        type: "coupon",
        code: "WELCOME10",
        value: 45000,
        value_type: "fixed_amount",
        description: "Welcome offer · 10% off",
      },
    });
  });

  test("a code that takes nothing off is turned down with the reason", () => {
    const better = { ...cart, coupon: { ...status, covered: true, applied: false } };
    expect(promotionResponse(cart, better, coupon)).toEqual({
      failure_code: "REQUIREMENT_NOT_MET",
      failure_reason: "Your order already has a better offer.",
    });
    const uncovered = { ...cart, coupon: { ...status, covered: false, applied: false } };
    expect(promotionResponse(cart, uncovered, coupon)).toEqual({
      failure_code: "REQUIREMENT_NOT_MET",
      failure_reason: "This code doesn't apply to anything in your order.",
    });
  });
});

describe("the paid order", () => {
  const paid = {
    id: "order_R1yDkxyIuKXXXX",
    status: "paid",
    amount: 989800,
    amount_paid: 989800,
    shipping_fee: 0,
    promotions: [{ code: "welcome10", value: 45000 }],
    customer_details: {
      contact: "+919100000000",
      email: "Gaurav.Kumar@Example.com",
      shipping_address: {
        name: "Gaurav Kumar",
        line1: "Houseno:24",
        city: "Bengaluru",
        state: "KARNATAKA",
        zipcode: "560001",
      },
    },
  };

  test("the address and email as an order keeps them", () => {
    expect(customerFromMagicOrder(paid)).toEqual({
      address: {
        name: "Gaurav Kumar",
        phone: "9100000000",
        line1: "Houseno:24",
        line2: undefined,
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560001",
      },
      email: "gaurav.kumar@example.com",
    });
  });

  test("the address's own mobile number comes first, and no email is null", () => {
    const customer = customerFromMagicOrder({
      ...paid,
      customer_details: {
        contact: "+919100000000",
        shipping_address: { ...paid.customer_details.shipping_address, contact: "098765 43210", state: "Some New State" },
      },
    });
    expect(customer?.address.phone).toBe("9876543210");
    expect(customer?.address.state as string).toBe("Some New State");
    expect(customer?.email).toBeNull();
  });

  test("no address yet is null", () => {
    expect(customerFromMagicOrder({ id: "order_1" })).toBeNull();
    expect(customerFromMagicOrder({ id: "order_1", customer_details: { contact: "+919100000000" } })).toBeNull();
  });

  test("with no address at all, the order says where to find it", () => {
    const customer = customerWithoutAddress({ id: "order_1", customer_details: { contact: "+919100000000", email: "A@B.co" } });
    expect(customer.address.line1).toBe(ADDRESS_MISSING);
    expect(customer.address.name).toBe("Razorpay customer");
    expect(customer.address.phone).toBe("9100000000");
    expect(customer.email).toBe("a@b.co");
    expect(customerWithoutAddress({ id: "order_1" }).email).toBeNull();
  });

  test("the coupon code Razorpay took money off with", () => {
    expect(promotionCode(paid)).toBe("WELCOME10");
    expect(promotionCode({ id: "order_1", promotions: [] })).toBeNull();
    expect(promotionCode({ id: "order_1" })).toBeNull();
  });
});
