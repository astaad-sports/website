ALTER TABLE "store_settings" ADD COLUMN "store_address" text;--> statement-breakpoint
-- The shop's details for the footer. Only fills fields still empty, so anything saved in Settings stays.
UPDATE "store_settings" SET
	"support_phone" = coalesce("support_phone", '+91 88820 74750'),
	"store_address" = coalesce("store_address", 'Shop 47, First Floor, MD Market, Pitampura, Delhi 110034'),
	"gstin" = coalesce("gstin", '07DIZPS1236N1ZB')
WHERE "id" = 1;
