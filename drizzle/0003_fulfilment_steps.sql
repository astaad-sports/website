ALTER TYPE "public"."order_status" ADD VALUE 'confirmed' BEFORE 'shipped';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'packed' BEFORE 'shipped';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "packed_at" timestamp with time zone;