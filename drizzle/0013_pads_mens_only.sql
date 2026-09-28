-- Batting pads are sold in Men's only, like gloves, left and right hand.
-- Counts of the other sizes go, and the total follows the Men's counts.
UPDATE "products" SET
  "sizes" = '["Men’s"]'::jsonb,
  "stock" = CASE
    WHEN "stock" IS NULL THEN NULL
    WHEN "hands" THEN coalesce(("variant_stock"->>'Men’s|Right hand')::int, 0) + coalesce(("variant_stock"->>'Men’s|Left hand')::int, 0)
    ELSE coalesce(("variant_stock"->>'Men’s')::int, 0)
  END,
  "variant_stock" = CASE
    WHEN "stock" IS NULL OR NOT "hands" THEN '{}'::jsonb
    ELSE jsonb_build_object(
      'Men’s|Right hand', coalesce(("variant_stock"->>'Men’s|Right hand')::int, 0),
      'Men’s|Left hand', coalesce(("variant_stock"->>'Men’s|Left hand')::int, 0)
    )
  END
WHERE "category" = 'batting-pads' AND "sizes" <> '["Men’s"]'::jsonb;--> statement-breakpoint
-- A pad with no Men's left is out of stock, as when a count reaches 0 in the admin.
UPDATE "products" SET "availability" = 'out_of_stock'
WHERE "category" = 'batting-pads' AND "availability" = 'available' AND "stock" = 0;
