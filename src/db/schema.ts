import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/**
 * A customer. Firebase Authentication owns sign-in; this row is the store's
 * record of the person. Orders and addresses should reference `users.id`,
 * never the Firebase UID, so the store does not depend on the auth provider.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  firebaseUid: text("firebase_uid").notNull().unique(),
  email: text("email"),
  emailVerified: boolean("email_verified").notNull().default(false),
  name: text("name"),
  phone: text("phone"),
  photoUrl: text("photo_url"),
  lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true }).notNull().defaultNow(),
  ...timestamps,
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

/**
 * `pending_payment` until Razorpay confirms the payment, then `paid`. The
 * admin then moves it through `confirmed`, `packed`, `shipped` and
 * `delivered` (see src/lib/orders/fulfilment.ts). Nothing sets `cancelled` yet.
 */
export const orderStatus = pgEnum("order_status", [
  "pending_payment",
  "paid",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
]);

export type OrderStatus = (typeof orderStatus.enumValues)[number];

/** A paid order asked for more than the counted stock of one product. */
export interface OrderStockShortfall {
  slug: string;
  name: string;
  /** How many more were paid for than were in stock. */
  missing: number;
}

/**
 * One checkout. Money is integer paise, as Razorpay expects. The shipping
 * address is copied onto the order so later edits never rewrite history.
 */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** The customer-facing number, shown as AST-10001. */
    number: integer("number").notNull().unique().generatedAlwaysAsIdentity({ startWith: 10001 }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: orderStatus("status").notNull().default("pending_payment"),
    currency: text("currency").notNull().default("INR"),
    subtotalPaise: integer("subtotal_paise").notNull(),
    shippingPaise: integer("shipping_paise").notNull().default(0),
    totalPaise: integer("total_paise").notNull(),
    email: text("email"),
    shipName: text("ship_name").notNull(),
    shipPhone: text("ship_phone").notNull(),
    shipLine1: text("ship_line1").notNull(),
    shipLine2: text("ship_line2"),
    shipCity: text("ship_city").notNull(),
    shipState: text("ship_state").notNull(),
    shipPincode: text("ship_pincode").notNull(),
    razorpayOrderId: text("razorpay_order_id").unique(),
    razorpayPaymentId: text("razorpay_payment_id").unique(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    /** When the admin confirmed the order. Cleared if the order is moved back before this step. */
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    /** When the admin packed the order. Cleared if the order is moved back before this step. */
    packedAt: timestamp("packed_at", { withTimezone: true }),
    /** A CARRIERS key from src/lib/shipping.ts, set when the order ships. */
    carrier: text("carrier"),
    /** The carrier's consignment number (AWB). Unique, so one AWB cannot land on two orders. */
    trackingNumber: text("tracking_number").unique(),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    /**
     * Set when the payment arrived for more than was in stock (two customers
     * paying for the last one at once): the owner restocks or refunds.
     */
    stockShortfall: jsonb("stock_shortfall").$type<OrderStockShortfall[]>(),
    /** The coupon code the customer entered, when it took money off. */
    couponCode: text("coupon_code"),
    /** How much offers and coupons took off the regular prices, in paise (already out of the line totals). */
    discountPaise: integer("discount_paise").notNull().default(0),
    /**
     * Placed from a test account (src/lib/auth/test-account.ts): paid in
     * Razorpay's test mode, never taken from stock, and listed apart from
     * real orders in the admin.
     */
    isTest: boolean("is_test").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index("orders_user_id_created_at_idx").on(table.userId, table.createdAt),
    index("orders_status_created_at_idx").on(table.status, table.createdAt),
  ]
);

export type Order = typeof orders.$inferSelect;

/** A chosen option as the customer saw it, e.g. { label: "Size", value: "SH / Full Size" }. */
export interface OrderItemOption {
  label: string;
  value: string;
}

/** The offer that set a line's price, as it was at checkout. */
export interface OrderItemOffer {
  name: string;
  percentOff: number;
  /** The coupon code, for an offer that needs one. */
  code: string | null;
  /** The price before the offer, in paise. */
  regularPricePaise: number;
}

/** A line of an order, with the product and price as they were at checkout. */
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productKind: text("product_kind", { enum: ["bat", "gear"] }).notNull(),
    productSlug: text("product_slug").notNull(),
    productName: text("product_name").notNull(),
    options: jsonb("options").$type<OrderItemOption[]>().notNull().default([]),
    unitPricePaise: integer("unit_price_paise").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalPaise: integer("line_total_paise").notNull(),
    offer: jsonb("offer").$type<OrderItemOffer>(),
  },
  (table) => [index("order_items_order_id_idx").on(table.orderId)]
);

export type OrderItem = typeof orderItems.$inferSelect;

/**
 * What the admin chose: on sale, shown but not for sale, or not shown at all.
 * Stock also decides: a counted product with no stock is out of stock whatever
 * this says (see src/lib/products/model.ts).
 */
export const productAvailability = pgEnum("product_availability", ["available", "out_of_stock", "hidden"]);

export type ProductAvailability = (typeof productAvailability.enumValues)[number];

/**
 * Which build options an English willow bat offers. Labels come from
 * BAT_WEIGHTS, BAT_PROFILES and BAT_HANDLES in src/lib/catalogue.ts.
 */
export interface BatCustomization {
  enabled: boolean;
  weights: string[];
  profiles: string[];
  handles: string[];
  /** Free name engraving, up to 15 letters. */
  engraving: boolean;
  /** Knocking in (match-ready preparation). */
  matchReady: boolean;
  scuffSheet: boolean;
}

/**
 * A product in the store. The five categories are fixed in code; bats also
 * have a subcategory. Money is integer paise, as on orders. `stock` is null
 * until the admin counts it: an uncounted product stays on sale.
 */
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** The URL name, e.g. "run-machine". Fixed once created, so links keep working. */
    slug: text("slug").notNull().unique(),
    kind: text("kind", { enum: ["bat", "gear"] }).notNull(),
    /** One of the five category slugs in STORE_CATEGORIES. */
    category: text("category").notNull(),
    /** Bats only: english-willow, kashmir-willow or tennis-bats. */
    subcategory: text("subcategory"),
    name: text("name").notNull(),
    /** Gear range name, e.g. "Elite". */
    line: text("line"),
    /** A short line beside the name, e.g. "Greatest Of All Time". */
    tagline: text("tagline"),
    /** Gear: the short note under the name, e.g. "Pro sheepskin palm". */
    note: text("note"),
    /** Bats: e.g. "Grade 4 English Willow". */
    grade: text("grade"),
    /** The short description: for bats, the willow grade note. */
    shortDescription: text("short_description"),
    /** The longer product details line. */
    description: text("description"),
    pricePaise: integer("price_paise").notNull(),
    mrpPaise: integer("mrp_paise"),
    sku: text("sku").unique(),
    stock: integer("stock"),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(3),
    availability: productAvailability("availability").notNull().default("available"),
    customization: jsonb("customization").$type<BatCustomization>(),
    /** Chips beside the name: "Bestseller", "Top 1%". */
    badges: jsonb("badges").$type<string[]>().notNull().default([]),
    /** Shown on the home page. */
    featured: boolean("featured").notNull().default(false),
    /** Order within its category. */
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [index("products_category_sort_idx").on(table.category, table.sortOrder)]
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

/**
 * A product photo. The lowest position is the primary image. `pathname` is set
 * for uploads (Vercel Blob, or .uploads/ on a machine without Blob) so they
 * can be deleted; the photos that ship with the site have none.
 */
export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    pathname: text("pathname"),
    alt: text("alt"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("product_images_product_position_idx").on(table.productId, table.position)]
);

export type ProductImage = typeof productImages.$inferSelect;

/** What an offer covers: every product, some categories, or chosen products. */
export const offerScope = pgEnum("offer_scope", ["store", "categories", "products"]);

export type OfferScope = (typeof offerScope.enumValues)[number];

/**
 * A percentage off, between two dates. Without a code it applies by itself
 * and the store shows the lower price; with one, only when the customer enters
 * it in the cart. Offers don't add up: a product gets its best one.
 */
export const offers = pgTable(
  "offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    percentOff: integer("percent_off").notNull(),
    /** The start of the first day, India time. */
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    /** The end of the last day, India time. */
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    scope: offerScope("scope").notNull().default("store"),
    /** Category slugs, when `scope` is "categories". */
    categories: jsonb("categories").$type<string[]>().notNull().default([]),
    /** Product ids, when `scope` is "products". */
    productIds: jsonb("product_ids").$type<string[]>().notNull().default([]),
    /** Upper case. Unique, so one code never means two offers. */
    code: text("code").unique(),
    ...timestamps,
  },
  (table) => [
    index("offers_ends_at_idx").on(table.endsAt),
    check("offers_percent_off_range", sql`${table.percentOff} between 1 and 90`),
    check("offers_dates_in_order", sql`${table.endsAt} > ${table.startsAt}`),
  ]
);

export type Offer = typeof offers.$inferSelect;
export type NewOffer = typeof offers.$inferInsert;

/**
 * The store's settings: one row (id 1). Store details for the footer,
 * delivery for the cart, the courier the tracking form starts on, and the
 * dispatch line on product pages.
 */
export const storeSettings = pgTable(
  "store_settings",
  {
    id: integer("id").primaryKey().default(1),
    storeName: text("store_name").notNull().default("Astaad Sports"),
    supportEmail: text("support_email"),
    supportPhone: text("support_phone"),
    /** The shop's postal address, on one line. */
    storeAddress: text("store_address"),
    gstin: text("gstin"),
    freeDelivery: boolean("free_delivery").notNull().default(true),
    /** Charged per order when delivery is not free. */
    deliveryFeePaise: integer("delivery_fee_paise").notNull().default(0),
    /** A CARRIERS key from src/lib/shipping.ts. */
    defaultCarrier: text("default_carrier").notNull().default("trackon"),
    /** e.g. "Ships in 2–3 days". */
    dispatchTime: text("dispatch_time"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [check("store_settings_single_row", sql`${table.id} = 1`)]
);

export type StoreSettings = typeof storeSettings.$inferSelect;
