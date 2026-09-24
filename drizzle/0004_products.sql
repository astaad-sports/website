CREATE TYPE "public"."product_availability" AS ENUM('available', 'out_of_stock', 'hidden');--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"url" text NOT NULL,
	"pathname" text,
	"alt" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"kind" text NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"name" text NOT NULL,
	"line" text,
	"tagline" text,
	"note" text,
	"grade" text,
	"short_description" text,
	"description" text,
	"price_paise" integer NOT NULL,
	"mrp_paise" integer,
	"sku" text,
	"stock" integer,
	"low_stock_threshold" integer DEFAULT 3 NOT NULL,
	"availability" "product_availability" DEFAULT 'available' NOT NULL,
	"customization" jsonb,
	"badges" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_images_product_position_idx" ON "product_images" USING btree ("product_id","position");--> statement-breakpoint
CREATE INDEX "products_category_sort_idx" ON "products" USING btree ("category","sort_order");