CREATE TYPE "public"."review_status" AS ENUM('new', 'published', 'hidden');--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "review_status" DEFAULT 'new' NOT NULL,
	"source" text NOT NULL,
	"name" text,
	"place" text,
	"rating" integer,
	"body" text,
	"product_id" uuid,
	"contact" text,
	"is_private" boolean DEFAULT false NOT NULL,
	"photo_url" text,
	"photo_pathname" text,
	"photo_width" integer,
	"photo_height" integer,
	"photo_alt" text,
	"published_at" timestamp with time zone,
	"sender_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_range" CHECK ("reviews"."rating" between 1 and 5),
	CONSTRAINT "reviews_has_content" CHECK ("reviews"."body" is not null or "reviews"."photo_url" is not null),
	CONSTRAINT "reviews_private_unpublished" CHECK (not ("reviews"."is_private" and "reviews"."status" = 'published'))
);
--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reviews_status_published_at_idx" ON "reviews" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "reviews_sender_hash_created_at_idx" ON "reviews" USING btree ("sender_hash","created_at");--> statement-breakpoint
-- The customer photos that were on the home page, as published photo-only reviews, newest first.
INSERT INTO "reviews" ("status", "source", "photo_url", "photo_width", "photo_height", "photo_alt", "published_at", "created_at", "updated_at") VALUES
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/01-7a0bbbe742.webp', 1054, 1400, 'A batter in a team jersey holding an Astaad bat', '2026-09-24T00:00:00.000Z', '2026-09-24T00:00:00.000Z', '2026-09-24T00:00:00.000Z'),
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/02-eca012c094.webp', 1120, 1400, 'A poster of a player with an Astaad bat: be good at not giving up', '2026-09-23T23:59:00.000Z', '2026-09-23T23:59:00.000Z', '2026-09-23T23:59:00.000Z'),
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/03-1d394068c2.webp', 788, 1400, 'A young player with a new Astaad bat', '2026-09-23T23:58:00.000Z', '2026-09-23T23:58:00.000Z', '2026-09-23T23:58:00.000Z'),
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/04-68803cc0fd.webp', 1120, 1400, 'A player holding an Astaad bat upright', '2026-09-23T23:57:00.000Z', '2026-09-23T23:57:00.000Z', '2026-09-23T23:57:00.000Z'),
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/05-37c9cb4582.webp', 1120, 1400, 'A young batter in helmet and pads raising an Astaad bat', '2026-09-23T23:56:00.000Z', '2026-09-23T23:56:00.000Z', '2026-09-23T23:56:00.000Z'),
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/06-39ea006ab2.webp', 945, 1400, 'A player on the outfield with an Astaad bat', '2026-09-23T23:55:00.000Z', '2026-09-23T23:55:00.000Z', '2026-09-23T23:55:00.000Z'),
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/07-c18f34513a.webp', 933, 1400, 'A batter in a helmet walking out with an Astaad bat', '2026-09-23T23:54:00.000Z', '2026-09-23T23:54:00.000Z', '2026-09-23T23:54:00.000Z'),
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/08-411c80d1cf.webp', 887, 1280, 'Two players in matching jerseys holding Astaad bats', '2026-09-23T23:53:00.000Z', '2026-09-23T23:53:00.000Z', '2026-09-23T23:53:00.000Z'),
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/09-498626048d.webp', 1263, 1400, 'A player in a red cap holding an Astaad bat', '2026-09-23T23:52:00.000Z', '2026-09-23T23:52:00.000Z', '2026-09-23T23:52:00.000Z'),
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/10-e68e746c04.webp', 1050, 1400, 'A batter in an India jersey holding an Astaad bat', '2026-09-23T23:51:00.000Z', '2026-09-23T23:51:00.000Z', '2026-09-23T23:51:00.000Z'),
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/11-b184b5db5d.webp', 1050, 1400, 'A player with an Astaad bat and the Player Series kitbag', '2026-09-23T23:50:00.000Z', '2026-09-23T23:50:00.000Z', '2026-09-23T23:50:00.000Z'),
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/12-a62e33ba5f.webp', 934, 1400, 'A batter raising an Astaad bat to celebrate', '2026-09-23T23:49:00.000Z', '2026-09-23T23:49:00.000Z', '2026-09-23T23:49:00.000Z'),
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/13-57e0f46db9.webp', 1050, 1400, 'A player seated with two Astaad bats', '2026-09-23T23:48:00.000Z', '2026-09-23T23:48:00.000Z', '2026-09-23T23:48:00.000Z'),
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/14-9c1d9f4923.webp', 852, 1280, 'A player holding a ball and an Astaad bat', '2026-09-23T23:47:00.000Z', '2026-09-23T23:47:00.000Z', '2026-09-23T23:47:00.000Z'),
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/15-11901c0bc5.webp', 1400, 1050, 'A team of players holding their Astaad bats', '2026-09-23T23:46:00.000Z', '2026-09-23T23:46:00.000Z', '2026-09-23T23:46:00.000Z'),
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/16-e8a4f75199.webp', 1400, 933, 'A batter playing a shot in a match', '2026-09-23T23:45:00.000Z', '2026-09-23T23:45:00.000Z', '2026-09-23T23:45:00.000Z'),
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/17-8c47b71fbf.webp', 930, 1170, 'A batter at the crease with an Astaad bat', '2026-09-23T23:44:00.000Z', '2026-09-23T23:44:00.000Z', '2026-09-23T23:44:00.000Z'),
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/18-4352404142.webp', 927, 1400, 'A player holding an Astaad bat across the body', '2026-09-23T23:43:00.000Z', '2026-09-23T23:43:00.000Z', '2026-09-23T23:43:00.000Z'),
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/19-7139657247.webp', 940, 960, 'A 1000 runs poster of a player holding an Astaad bat', '2026-09-23T23:42:00.000Z', '2026-09-23T23:42:00.000Z', '2026-09-23T23:42:00.000Z'),
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/20-90b4563b9c.webp', 1050, 1400, 'A batter in whites holding two Astaad bats', '2026-09-23T23:41:00.000Z', '2026-09-23T23:41:00.000Z', '2026-09-23T23:41:00.000Z'),
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/21-0dbe65798b.webp', 951, 1160, 'A batter padded up with an Astaad bat', '2026-09-23T23:40:00.000Z', '2026-09-23T23:40:00.000Z', '2026-09-23T23:40:00.000Z'),
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/22-69596f8062.webp', 768, 1024, 'A batter in the nets with an Astaad bat', '2026-09-23T23:39:00.000Z', '2026-09-23T23:39:00.000Z', '2026-09-23T23:39:00.000Z'),
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/23-82d63562eb.webp', 768, 1024, 'A player walking out with an Astaad bat', '2026-09-23T23:38:00.000Z', '2026-09-23T23:38:00.000Z', '2026-09-23T23:38:00.000Z'),
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/24-27d636c92d.webp', 1050, 1400, 'A batter on a floodlit ground with an Astaad bat', '2026-09-23T23:37:00.000Z', '2026-09-23T23:37:00.000Z', '2026-09-23T23:37:00.000Z'),
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/25-e6f6b5c476.webp', 1050, 1400, 'A player with an Astaad bat and a trophy', '2026-09-23T23:36:00.000Z', '2026-09-23T23:36:00.000Z', '2026-09-23T23:36:00.000Z'),
('published', 'admin', 'https://otr4jcwn8kcd1aqi.public.blob.vercel-storage.com/site/reviews/26-c1f59e875c.webp', 1050, 1400, 'A player holding an Astaad bat at dusk', '2026-09-23T23:35:00.000Z', '2026-09-23T23:35:00.000Z', '2026-09-23T23:35:00.000Z');
