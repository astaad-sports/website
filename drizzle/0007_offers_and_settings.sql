CREATE TYPE "public"."offer_scope" AS ENUM('store', 'categories', 'products');--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"percent_off" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"scope" "offer_scope" DEFAULT 'store' NOT NULL,
	"categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"product_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offers_code_unique" UNIQUE("code"),
	CONSTRAINT "offers_percent_off_range" CHECK ("offers"."percent_off" between 1 and 90),
	CONSTRAINT "offers_dates_in_order" CHECK ("offers"."ends_at" > "offers"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "store_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"store_name" text DEFAULT 'Astaad Sports' NOT NULL,
	"support_email" text,
	"support_phone" text,
	"gstin" text,
	"free_delivery" boolean DEFAULT true NOT NULL,
	"delivery_fee_paise" integer DEFAULT 0 NOT NULL,
	"default_carrier" text DEFAULT 'trackon' NOT NULL,
	"dispatch_time" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_settings_single_row" CHECK ("store_settings"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "offer" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "coupon_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_paise" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "offers_ends_at_idx" ON "offers" USING btree ("ends_at");--> statement-breakpoint
INSERT INTO "store_settings" ("id") VALUES (1) ON CONFLICT DO NOTHING;