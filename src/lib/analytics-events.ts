// What the store tells Google Analytics about shopping, in its e-commerce
// format: a product viewed, added to the cart, a checkout begun, an order
// paid. Pure. Amounts are rupees. An item is its product (`item_id` is the
// slug) and its size and hand are the variant, so one product's steps add up
// whichever size was looked at or bought. No name, email, phone or address
// is ever part of an event (see /privacy).
import type { Order, OrderItem } from "@/db/schema";
import type { PricedLine } from "@/lib/cart";
import { formatOrderNumber } from "@/lib/format";
import { categoryName } from "@/lib/products/model";

export interface AnalyticsItem {
  item_id: string;
  item_name: string;
  item_brand: "Astaad";
  /** "Bats", "Batting Gloves", "Helmets". */
  item_category: string;
  /** The size and hand: "SH", "Medium", "Men’s, Right hand". Absent for a product sold one way. */
  item_variant?: string;
  price: number;
  quantity: number;
}

/** A value and the items behind it: view_item, add_to_cart and begin_checkout. */
export interface ShoppingEvent {
  currency: "INR";
  value: number;
  items: AnalyticsItem[];
}

export interface PurchaseEvent extends ShoppingEvent {
  /** The order's number as the customer knows it, "AST-10019". Analytics counts an order once by it. */
  transaction_id: string;
  shipping: number;
  coupon?: string;
}

const rupees = (paise: number) => paise / 100;

/** A variant key ("SH", "Medium|Right hand", "") as words. */
function variantWords(key: string | null | undefined): string | undefined {
  return key ? key.split("|").join(", ") : undefined;
}

function item(fields: Omit<AnalyticsItem, "item_brand" | "item_variant"> & { variant?: string | null }): AnalyticsItem {
  const { variant, ...rest } = fields;
  const words = variantWords(variant);
  return { ...rest, item_brand: "Astaad", ...(words ? { item_variant: words } : {}) };
}

function event(items: AnalyticsItem[]): ShoppingEvent {
  const value = items.reduce((sum, entry) => sum + entry.price * entry.quantity, 0);
  // Prices are whole paise, so two decimals are exact.
  return { currency: "INR", value: Math.round(value * 100) / 100, items };
}

/**
 * A product page opened: the product at the price the page shows, in the
 * size the address chose, if any. It is named as the cart and orders name it
 * ("Astaad G.O.A.T"), so Analytics counts one product, not two.
 */
export function viewItemEvent(product: {
  slug: string;
  /** The product's own name, "G.O.A.T". */
  name: string;
  /** "Bats", or the gear category's name. */
  category: string;
  /** Rupees, as shown. */
  price: number;
  size?: string | null;
}): ShoppingEvent {
  return event([
    item({
      item_id: product.slug,
      item_name: `Astaad ${product.name}`,
      item_category: product.category,
      variant: product.size,
      price: product.price,
      quantity: 1,
    }),
  ]);
}

/** Cart lines as an event: one line for add_to_cart, the whole cart for begin_checkout. */
export function cartEvent(lines: readonly PricedLine[]): ShoppingEvent {
  return event(
    lines.map((line) =>
      item({
        item_id: line.item.slug,
        item_name: line.name,
        // A gear line's address is /shop/<category>/<slug>.
        item_category: line.item.kind === "bat" ? "Bats" : categoryName(line.href.split("/")[2] ?? ""),
        variant: line.variant,
        price: rupees(line.unitPricePaise),
        quantity: line.item.quantity,
      })
    )
  );
}

/**
 * A paid order. The value is what the items cost after offers and coupons;
 * delivery is given beside it. `categories` names each gear product's
 * category by slug; one no longer on the store is "Gear".
 */
export function purchaseEvent(
  order: Pick<Order, "number" | "totalPaise" | "shippingPaise" | "couponCode"> & {
    items: Pick<OrderItem, "productKind" | "productSlug" | "productName" | "variant" | "unitPricePaise" | "quantity">[];
  },
  categories: Record<string, string> = {}
): PurchaseEvent {
  const items = order.items.map((line) =>
    item({
      item_id: line.productSlug,
      item_name: line.productName,
      item_category: line.productKind === "bat" ? "Bats" : (categories[line.productSlug] ?? "Gear"),
      variant: line.variant,
      price: rupees(line.unitPricePaise),
      quantity: line.quantity,
    })
  );
  return {
    transaction_id: formatOrderNumber(order.number),
    currency: "INR",
    value: rupees(order.totalPaise - order.shippingPaise),
    shipping: rupees(order.shippingPaise),
    ...(order.couponCode ? { coupon: order.couponCode } : {}),
    items,
  };
}
