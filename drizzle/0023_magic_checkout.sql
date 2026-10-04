-- Razorpay Magic Checkout: Razorpay's window takes the address and payment,
-- so a checkout is kept here until it is paid and becomes an order. A guest
-- may give Razorpay only a mobile number, so an order no longer needs an email.
CREATE TABLE "magic_checkouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"is_test" boolean DEFAULT false NOT NULL,
	"items" jsonb NOT NULL,
	"cart" jsonb NOT NULL,
	"coupon_carts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"razorpay_order_id" text,
	"order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "magic_checkouts_razorpay_order_id_unique" UNIQUE("razorpay_order_id")
);
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_guest_has_email";--> statement-breakpoint
ALTER TABLE "magic_checkouts" ADD CONSTRAINT "magic_checkouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "magic_checkouts" ADD CONSTRAINT "magic_checkouts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;