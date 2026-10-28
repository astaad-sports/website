CREATE TABLE "whatsapp_account" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"business_account_id" text NOT NULL,
	"phone_number_id" text NOT NULL,
	"display_number" text,
	"access_token" text NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"contacts_sync_id" text,
	"history_sync_id" text,
	"error" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_account_single_row" CHECK ("whatsapp_account"."id" = 1)
);
