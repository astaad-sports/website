CREATE TABLE "instagram_token" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"access_token" text NOT NULL,
	"seed_hash" text NOT NULL,
	"refreshed_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "instagram_token_single_row" CHECK ("instagram_token"."id" = 1)
);
