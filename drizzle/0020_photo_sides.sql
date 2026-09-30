ALTER TABLE "product_images" ADD COLUMN "side" text;--> statement-breakpoint
-- The face mark grows into the side a straight cut-out shows: face, right edge, back or left edge.
UPDATE "product_images" SET "side" = 'face' WHERE "face";--> statement-breakpoint
ALTER TABLE "product_images" DROP COLUMN "face";--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_side_check" CHECK ("product_images"."side" in ('face', 'right', 'back', 'left'));--> statement-breakpoint
-- The other sides of each bat's studio cut-outs on 2026-10-01, by file. The
-- Kashmir willow bats' faces were not marked before. A right edge is the shot
-- with the flat face on the left of the photo; a left edge the other one.
UPDATE "product_images" SET "side" = 'face' WHERE "url" LIKE '%/products/237fbcf9-70c7-46ee-8ac0-68f119dab5ab.webp'
  OR "url" LIKE '%/products/65cf3614-92cc-4dfe-8e1a-d58be7266c3c.webp';--> statement-breakpoint
UPDATE "product_images" SET "side" = 'back' WHERE "url" LIKE '%/products/bba36f89-ba6e-4847-8169-3d3ba17eccbd.webp'
  OR "url" LIKE '%/products/33d68cd0-d417-49b4-adff-53a6dd1823d9.webp'
  OR "url" LIKE '%/products/59470141-072f-461c-a90b-20277fcc82ad.webp'
  OR "url" LIKE '%/products/ad8e91d0-3ffa-4bf4-b741-1e8c75506f47.webp'
  OR "url" LIKE '%/products/92b2ee8e-2992-4bea-be57-d8b88553ab60.webp'
  OR "url" LIKE '%/products/72063181-86e5-4f56-a48c-32037f76b000.webp'
  OR "url" LIKE '%/products/d8bdf3cb-46dc-43e3-b428-ae8b7cb22e02.webp'
  OR "url" LIKE '%/products/2acee893-c8c9-4a5c-9a14-5b770742aab9.webp';--> statement-breakpoint
UPDATE "product_images" SET "side" = 'right' WHERE "url" LIKE '%/products/26b2551b-01fd-4b00-a693-f1b9e4d58c18.webp'
  OR "url" LIKE '%/products/5a97683f-2cc6-4f96-bdcb-f6a10cf9f130.webp'
  OR "url" LIKE '%/products/afe63c83-f2c7-455a-88b7-5c6d8c846bf2.webp'
  OR "url" LIKE '%/products/37df6574-0438-4fc8-8297-f95354c80ac6.webp'
  OR "url" LIKE '%/products/cfb35f83-6efa-484b-82b0-f15b955faf3c.webp'
  OR "url" LIKE '%/products/c4e13645-69e1-4285-985f-df949a3f5093.webp'
  OR "url" LIKE '%/products/36be21f7-1b9f-451f-bf9f-dae533f2857e.webp'
  OR "url" LIKE '%/products/ee9ab9f9-b2e2-4946-92d2-25f9f592325b.webp';--> statement-breakpoint
UPDATE "product_images" SET "side" = 'left' WHERE "url" LIKE '%/products/21e1bcb7-d9a7-4b09-a922-0bed3c0e2800.webp'
  OR "url" LIKE '%/products/f3c0a0eb-eca7-4194-91f6-76ca992bbac9.webp'
  OR "url" LIKE '%/products/c3312b55-b460-449d-8158-3dc93231b783.webp'
  OR "url" LIKE '%/products/b4a68b2a-12be-4acd-85e0-789bfc4679cf.webp'
  OR "url" LIKE '%/products/021a7b80-aca8-47c5-a8a5-f2984db27f2f.webp'
  OR "url" LIKE '%/products/2e43bb70-de25-42b2-be8c-fe43f391a1d7.webp'
  OR "url" LIKE '%/products/abd6e4fe-29f6-4458-bb58-139f75230568.webp'
  OR "url" LIKE '%/products/01608fa1-deb6-421f-9293-cbbc7483196c.webp';
