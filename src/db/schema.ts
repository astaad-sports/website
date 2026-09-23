import {
  boolean,
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
 * `pending_payment` until Razorpay confirms the payment, then `paid`.
 * `shipped`, `delivered` and `cancelled` are set by fulfilment later.
 */
export const orderStatus = pgEnum("order_status", [
  "pending_payment",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
]);

export type OrderStatus = (typeof orderStatus.enumValues)[number];

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
    ...timestamps,
  },
  (table) => [index("orders_user_id_created_at_idx").on(table.userId, table.createdAt)]
);

export type Order = typeof orders.$inferSelect;

/** A chosen option as the customer saw it, e.g. { label: "Size", value: "SH / Full Size" }. */
export interface OrderItemOption {
  label: string;
  value: string;
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
  },
  (table) => [index("order_items_order_id_idx").on(table.orderId)]
);

export type OrderItem = typeof orderItems.$inferSelect;
