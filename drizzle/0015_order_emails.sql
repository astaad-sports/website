CREATE TYPE "public"."order_email_status" AS ENUM('sending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "order_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"recipients" text NOT NULL,
	"status" "order_email_status" DEFAULT 'sending' NOT NULL,
	"tracking" text,
	"resend_id" text,
	"error" text,
	"attempts" integer DEFAULT 1 NOT NULL,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_emails" ADD CONSTRAINT "order_emails_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "order_emails_order_id_key_idx" ON "order_emails" USING btree ("order_id","key");