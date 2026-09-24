ALTER TYPE "public"."order_status" ADD VALUE 'confirmed' BEFORE 'shipped';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'packed' BEFORE 'shipped';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "packed_at" timestamp with time zone;--> statement-breakpoint
-- Orders that shipped before these steps existed were confirmed and packed by the time they shipped.
UPDATE "orders" SET "confirmed_at" = coalesce("confirmed_at", "paid_at", "shipped_at"), "packed_at" = coalesce("packed_at", "shipped_at") WHERE "shipped_at" IS NOT NULL;
