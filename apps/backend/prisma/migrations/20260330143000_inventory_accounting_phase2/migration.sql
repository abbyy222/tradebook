ALTER TABLE "stock_items"
  ADD COLUMN "cost_price" DECIMAL(12, 2) NOT NULL DEFAULT 0;

UPDATE "stock_items"
SET "cost_price" = "unit_price"
WHERE "cost_price" = 0;