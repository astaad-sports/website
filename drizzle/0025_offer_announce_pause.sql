ALTER TABLE "offers" ADD COLUMN "paused" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "announce" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "headline" text;--> statement-breakpoint
-- Existing coupons stay private: announcing one shows its code to everyone.
UPDATE "offers" SET "announce" = false WHERE "code" IS NOT NULL;
