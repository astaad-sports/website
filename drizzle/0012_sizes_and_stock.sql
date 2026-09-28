ALTER TABLE "order_items" ADD COLUMN "variant" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sizes" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "hands" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "variant_stock" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
-- What each product is sold in. English willow bats keep the four sizes; every
-- other bat is SH only, and tennis bats come in two lengths.
UPDATE "products" SET "sizes" = '["6","H","SH","LH"]'::jsonb WHERE "kind" = 'bat' AND "subcategory" = 'english-willow';--> statement-breakpoint
UPDATE "products" SET "sizes" = '["FS","SH"]'::jsonb WHERE "kind" = 'bat' AND "subcategory" = 'tennis-bats';--> statement-breakpoint
UPDATE "products" SET "sizes" = '["SH"]'::jsonb WHERE "kind" = 'bat' AND "sizes" = '[]'::jsonb;--> statement-breakpoint
UPDATE "products" SET "sizes" = '["Men’s"]'::jsonb, "hands" = true WHERE "category" = 'batting-gloves';--> statement-breakpoint
UPDATE "products" SET "sizes" = '["Boys","Youth","Men’s"]'::jsonb, "hands" = true WHERE "category" = 'batting-pads';--> statement-breakpoint
UPDATE "products" SET "sizes" = '["Medium","Large","XL"]'::jsonb WHERE "category" = 'helmets';--> statement-breakpoint
-- A count taken before each size and hand had its own goes on the usual one
-- (SH, Men's right hand, Medium); the others start at 0 until they are counted.
UPDATE "products" SET "variant_stock" = jsonb_build_object('SH', "stock") WHERE "stock" IS NOT NULL AND "kind" = 'bat' AND jsonb_array_length("sizes") > 1;--> statement-breakpoint
UPDATE "products" SET "variant_stock" = jsonb_build_object('Men’s|Right hand', "stock") WHERE "stock" IS NOT NULL AND "category" IN ('batting-gloves', 'batting-pads');--> statement-breakpoint
UPDATE "products" SET "variant_stock" = jsonb_build_object('Medium', "stock") WHERE "stock" IS NOT NULL AND "category" = 'helmets';
