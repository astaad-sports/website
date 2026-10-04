// Razorpay Magic Checkout: Razorpay's own window asks for the mobile number,
// delivery address and coupon, then takes the payment, so "Buy now" needs no
// checkout page of ours. Razorpay has to enable it on the account; until
// NEXT_PUBLIC_MAGIC_CHECKOUT is "on", Buy now opens the store's checkout.
// This file is the pure part: what the store sends Razorpay, what it answers
// when Razorpay asks for the delivery charge or checks a coupon, and how it
// reads the paid order back. Tests pass their own values.
// https://razorpay.com/docs/payments/magic-checkout/web/
import type { PricedCart } from "@/lib/cart";
import { INDIAN_STATES, normalisePhone, type ShippingAddress } from "@/lib/checkout";
import type { AppliedCoupon } from "@/lib/offers/model";
import { absoluteUrl } from "@/lib/site";

/** Razorpay's script for the Magic Checkout window. */
export const MAGIC_CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/magic-checkout.js";

/** Whether Buy now opens Razorpay's window. Off unless NEXT_PUBLIC_MAGIC_CHECKOUT is "on". */
export function magicCheckoutEnabled(value: string | undefined = process.env.NEXT_PUBLIC_MAGIC_CHECKOUT): boolean {
  return value?.trim().toLowerCase() === "on";
}

/** One product in a Magic Checkout order. Amounts are paise, for one of it. */
export interface MagicLineItem {
  sku: string;
  variant_id: string;
  /** The regular price. */
  price: number;
  /** The price paid, after an offer that needs no code. */
  offer_price: number;
  quantity: number;
  name: string;
  description: string;
  image_url: string;
  product_url: string;
}

/**
 * The cart as Razorpay's line items. Their `offer_price` times `quantity`
 * adds up to the cart's subtotal, which is the order's `line_items_total`.
 */
export function magicLineItems(cart: PricedCart, base: string): MagicLineItem[] {
  return cart.lines.map((line) => ({
    sku: line.item.slug,
    // The size and hand, whose stock the order is taken from; a product sold one way has none.
    variant_id: line.variant || line.item.slug,
    price: line.regularUnitPricePaise,
    offer_price: line.unitPricePaise,
    quantity: line.item.quantity,
    name: line.name,
    description: line.summary || line.name,
    image_url: absoluteUrl(line.image, base),
    product_url: absoluteUrl(line.href, base),
  }));
}

// --- Delivery charge -----------------------------------------------------------

interface ShippingInfoAddress {
  id?: unknown;
  zipcode?: unknown;
  state_code?: unknown;
  country?: unknown;
}

/**
 * The answer to Razorpay's shipping info request: for each address it lists,
 * whether the store delivers there and what delivery costs. The store ships
 * across India for the one charge in Settings, and takes no cash on delivery.
 */
export function shippingInfoResponse(request: unknown, deliveryFeePaise: number) {
  const listed = (request as { addresses?: unknown } | null)?.addresses;
  const addresses: ShippingInfoAddress[] = Array.isArray(listed) ? listed : [];
  return {
    addresses: addresses.map((address) => {
      const zipcode = String(address.zipcode ?? "");
      const country = String(address.country ?? "IN");
      const serviceable = country.toUpperCase() === "IN" && /^[1-9]\d{5}$/.test(zipcode);
      return {
        id: address.id,
        zipcode,
        state_code: address.state_code,
        country,
        shipping_methods: [
          {
            id: "standard",
            name: "Standard delivery",
            description: deliveryFeePaise ? "Delivery across India" : "Free delivery across India",
            serviceable,
            shipping_fee: deliveryFeePaise,
            cod: false,
            cod_fee: 0,
          },
        ],
      };
    }),
  };
}

// --- Coupons -------------------------------------------------------------------

export type PromotionResponse =
  | {
      promotion: {
        reference_id: string;
        type: "coupon";
        code: string;
        /** What the code takes off this order, in paise. */
        value: number;
        value_type: "fixed_amount";
        description: string;
      };
    }
  | { failure_code: "INVALID_PROMOTION" | "REQUIREMENT_NOT_MET"; failure_reason: string };

/** Razorpay's answer for a code that cannot be used, with the reason the customer reads. */
export function promotionFailure(reason: string, code: "INVALID_PROMOTION" | "REQUIREMENT_NOT_MET" = "INVALID_PROMOTION"): PromotionResponse {
  return { failure_code: code, failure_reason: reason };
}

/**
 * The answer to Razorpay's "apply this coupon": what the code takes off the
 * order, the difference between the cart priced without it and with it. A
 * code that takes nothing off (it covers nothing here, or an offer already on
 * the product takes more) is turned down with the reason, as the cart does.
 */
export function promotionResponse(cart: PricedCart, withCoupon: PricedCart, coupon: AppliedCoupon): PromotionResponse {
  const value = cart.subtotalPaise - withCoupon.subtotalPaise;
  if (value <= 0 || !withCoupon.coupon?.applied) {
    return promotionFailure(
      withCoupon.coupon?.covered
        ? "Your order already has a better offer."
        : "This code doesn't apply to anything in your order.",
      "REQUIREMENT_NOT_MET"
    );
  }
  return {
    promotion: {
      reference_id: coupon.code,
      type: "coupon",
      code: coupon.code,
      value,
      value_type: "fixed_amount",
      description: `${coupon.name} · ${coupon.percentOff}% off`,
    },
  };
}

// --- The paid order ------------------------------------------------------------

interface MagicAddress {
  name?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  zipcode?: string | null;
  contact?: string | null;
}

/** The parts of Razorpay's order the store reads once a Magic Checkout is paid. */
export interface MagicOrder {
  id: string;
  receipt?: string | null;
  status?: string;
  /** Paise. */
  amount?: number;
  amount_paid?: number;
  shipping_fee?: number | null;
  promotions?: { code?: string | null; value?: number | null }[] | null;
  customer_details?: {
    name?: string | null;
    contact?: string | null;
    email?: string | null;
    shipping_address?: MagicAddress | null;
  } | null;
}

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/** "KARNATAKA" or "karnataka" as the store writes it, "Karnataka"; an unknown name in title case. */
function stateName(value: string): string {
  const known = INDIAN_STATES.find((state) => state.toLowerCase() === value.toLowerCase());
  return known ?? value.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

/**
 * The delivery address and email the customer gave Razorpay, as an order
 * keeps them, or null when Razorpay has no address for the order yet. The
 * mobile number is the address's own, else the one the customer signed in to
 * Razorpay with. Nothing is turned down for its shape: the customer has paid.
 */
export function customerFromMagicOrder(order: MagicOrder): { address: ShippingAddress; email: string | null } | null {
  const details = order.customer_details;
  const shipping = details?.shipping_address;
  if (!details || !shipping || !text(shipping.line1, 120)) return null;
  const email = text(details.email, 254).toLowerCase();
  return {
    address: {
      name: text(shipping.name, 80) || text(details.name, 80),
      phone: normalisePhone(text(shipping.contact, 20) || text(details.contact, 20)),
      line1: text(shipping.line1, 120),
      line2: text(shipping.line2, 120) || undefined,
      city: text(shipping.city, 60),
      // Razorpay may name a state the form's list does not have; the order keeps what it was given.
      state: stateName(text(shipping.state, 60)) as ShippingAddress["state"],
      pincode: text(shipping.zipcode, 10),
    },
    email: email || null,
  };
}

/** What a paid order's address says when Razorpay never gave one, so the owner knows where to look. */
export const ADDRESS_MISSING = "Address not received from Razorpay. Open this payment in the Razorpay dashboard.";

/**
 * For a paid order Razorpay has no delivery address for: whatever it does
 * know of the customer, with a note where the address belongs. The order is
 * still made, so a payment never goes without one.
 */
export function customerWithoutAddress(order: MagicOrder): { address: ShippingAddress; email: string | null } {
  const details = order.customer_details;
  const email = text(details?.email, 254).toLowerCase();
  return {
    address: {
      name: text(details?.name, 80) || "Razorpay customer",
      phone: normalisePhone(text(details?.contact, 20)),
      line1: ADDRESS_MISSING,
      line2: undefined,
      city: "",
      state: "" as ShippingAddress["state"],
      pincode: "",
    },
    email: email || null,
  };
}

/** The coupon code Razorpay took money off with, upper case, or null. */
export function promotionCode(order: MagicOrder): string | null {
  const code = order.promotions?.find((promotion) => promotion.code)?.code;
  return code ? code.trim().toUpperCase() : null;
}
