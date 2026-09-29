CREATE TABLE "review_customers" (
	"review_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"linked_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "review_customers" ADD CONSTRAINT "review_customers_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_customers" ADD CONSTRAINT "review_customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "review_customers_user_id_idx" ON "review_customers" USING btree ("user_id");--> statement-breakpoint
-- Reviews customers sent with an email or mobile number that belongs to one account, and only one, go to that account.
INSERT INTO "review_customers" ("review_id", "user_id", "linked_by")
SELECT r."id", (array_agg(u."id"))[1], 'contact'
FROM "reviews" r
JOIN "users" u ON r."contact" = lower(u."email") OR r."contact" = u."phone"
WHERE r."source" = 'customer' AND r."contact" IS NOT NULL AND r."contact" <> ''
GROUP BY r."id"
HAVING count(*) = 1;
