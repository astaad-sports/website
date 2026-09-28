ALTER TABLE "products" ADD COLUMN "size_prices" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
-- English and Kashmir willow bats are sold in SH only, except the four below.
-- Their count stays with SH.
UPDATE "products" SET
  "sizes" = '["SH"]'::jsonb,
  "stock" = CASE
    WHEN "stock" IS NULL THEN NULL
    WHEN "variant_stock" = '{}'::jsonb THEN "stock"
    ELSE coalesce(("variant_stock"->>'SH')::int, 0)
  END,
  "variant_stock" = '{}'::jsonb
WHERE "kind" = 'bat'
  AND "subcategory" IN ('english-willow', 'kashmir-willow')
  AND "slug" NOT IN ('black-edition', 'goat', 'the-godfather', 'legacy-one')
  AND "sizes" <> '["SH"]'::jsonb;--> statement-breakpoint
-- A bat with no SH left is out of stock, as when a count reaches 0 in the admin.
UPDATE "products" SET "availability" = 'out_of_stock'
WHERE "kind" = 'bat'
  AND "subcategory" IN ('english-willow', 'kashmir-willow')
  AND "slug" NOT IN ('black-edition', 'goat', 'the-godfather', 'legacy-one')
  AND "availability" = 'available' AND "stock" = 0;--> statement-breakpoint
-- These four come in every size. Size 6 and Harrow have their own price and
-- MRP; SH and Long Handle sell at the bat's price.
UPDATE "products" SET "sizes" = '["6","H","SH","LH"]'::jsonb
WHERE "slug" IN ('black-edition', 'goat', 'the-godfather', 'legacy-one') AND "sizes" <> '["6","H","SH","LH"]'::jsonb;--> statement-breakpoint
UPDATE "products" SET "size_prices" = '{"6": {"pricePaise": 699900, "mrpPaise": 1099900}, "H": {"pricePaise": 849900, "mrpPaise": 1399900}}'::jsonb WHERE "slug" = 'black-edition';--> statement-breakpoint
UPDATE "products" SET "size_prices" = '{"6": {"pricePaise": 799900, "mrpPaise": 1299900}, "H": {"pricePaise": 949900, "mrpPaise": 1499900}}'::jsonb WHERE "slug" = 'goat';--> statement-breakpoint
UPDATE "products" SET "size_prices" = '{"6": {"pricePaise": 899900, "mrpPaise": 1399900}, "H": {"pricePaise": 1099900, "mrpPaise": 1699900}}'::jsonb WHERE "slug" = 'the-godfather';--> statement-breakpoint
UPDATE "products" SET "size_prices" = '{"6": {"pricePaise": 949900, "mrpPaise": 1499900}, "H": {"pricePaise": 1199900, "mrpPaise": 1799900}}'::jsonb WHERE "slug" = 'legacy-one';
