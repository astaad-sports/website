ALTER TABLE "product_images" ADD COLUMN "face" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- The straight view of each English willow bat's face, which the builders
-- engrave a name on: the third photo of each on 2026-10-01, named by file so
-- a reorder does not matter.
UPDATE "product_images" SET "face" = true WHERE "url" LIKE '%/products/eb3128c9-c065-466b-ae14-932a244d578d.webp'
  OR "url" LIKE '%/products/f4555ac8-3a28-4714-beb4-2c02cc4992b9.webp'
  OR "url" LIKE '%/products/6eb9683d-2bc0-479d-abd9-95c5491191b9.webp'
  OR "url" LIKE '%/products/68a345fa-6156-48b5-a1df-fc1fb47d7802.webp'
  OR "url" LIKE '%/products/eec89b9e-137c-4050-82fb-fe5a2e32b119.webp'
  OR "url" LIKE '%/products/ab61bd28-2207-48d2-9ed2-49ac7726bf1f.webp';
