-- The bat handles are Singapore cane. The seeded descriptions (0005) called it
-- Sarawak cane; this corrects any description that still does.
UPDATE "products" SET "description" = replace("description", 'Sarawak cane', 'Singapore cane')
WHERE "description" LIKE '%Sarawak cane%';
