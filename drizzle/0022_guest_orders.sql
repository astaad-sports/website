-- Guest checkout: an order placed without an account has no user, and always
-- carries the email its confirmation goes to.
ALTER TABLE "orders" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_guest_has_email" CHECK ("orders"."user_id" is not null or "orders"."email" is not null);