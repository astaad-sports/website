-- Size 6 and Harrow bats are made lighter, in weight ranges of their own
-- (see BAT_WEIGHT_GROUPS in src/lib/catalogue.ts), and a bat's weights are now
-- the ranges of every size it is sold in. The bats sold in those sizes (Black
-- Edition, G.O.A.T, The Godfather and Legacy One) offer every range of each,
-- beside the SH and LH ranges they already offer.
UPDATE "products" SET "customization" = jsonb_set(
  "customization",
  '{weights}',
  (CASE WHEN "sizes" @> '["6"]'::jsonb THEN '["950–975 g", "975–1000 g", "1000–1025 g"]'::jsonb ELSE '[]'::jsonb END)
    || (CASE WHEN "sizes" @> '["H"]'::jsonb THEN '["1050–1075 g", "1075–1100 g", "1100–1120 g"]'::jsonb ELSE '[]'::jsonb END)
    || coalesce("customization"->'weights', '[]'::jsonb)
)
WHERE "kind" = 'bat'
  AND "subcategory" = 'english-willow'
  AND "customization"->>'enabled' = 'true'
  AND ("sizes" @> '["6"]'::jsonb OR "sizes" @> '["H"]'::jsonb)
  AND NOT ("customization"->'weights' @> '["950–975 g"]'::jsonb OR "customization"->'weights' @> '["1050–1075 g"]'::jsonb);
