CREATE TYPE "public"."whatsapp_message_status" AS ENUM('sending', 'sent', 'delivered', 'read', 'failed');--> statement-breakpoint
CREATE TABLE "whatsapp_contacts" (
	"wa_id" text PRIMARY KEY NOT NULL,
	"profile_name" text,
	"user_id" uuid,
	"linked_at" timestamp with time zone,
	"opted_out_at" timestamp with time zone,
	"last_message_at" timestamp with time zone,
	"last_message_id" text,
	"menu_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_contacts_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_link_tokens" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"wa_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"to" text NOT NULL,
	"template" text NOT NULL,
	"status" "whatsapp_message_status" DEFAULT 'sending' NOT NULL,
	"wamid" text,
	"error" text,
	"attempts" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_messages_wamid_unique" UNIQUE("wamid")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "whatsapp_updates" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_link_tokens" ADD CONSTRAINT "whatsapp_link_tokens_wa_id_whatsapp_contacts_wa_id_fk" FOREIGN KEY ("wa_id") REFERENCES "public"."whatsapp_contacts"("wa_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "whatsapp_link_tokens_wa_id_idx" ON "whatsapp_link_tokens" USING btree ("wa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_messages_order_id_key_idx" ON "whatsapp_messages" USING btree ("order_id","key");