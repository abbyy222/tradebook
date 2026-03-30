ALTER TABLE "sales"
  ADD COLUMN "stock_item_id" TEXT,
  ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "unit_price" DECIMAL(12,2);

UPDATE "sales"
SET "unit_price" = "amount"
WHERE "unit_price" IS NULL;

ALTER TABLE "sales"
  ALTER COLUMN "unit_price" SET NOT NULL;

CREATE INDEX "sales_stock_item_id_idx" ON "sales"("stock_item_id");

ALTER TABLE "sales"
  ADD CONSTRAINT "sales_stock_item_id_fkey"
  FOREIGN KEY ("stock_item_id") REFERENCES "stock_items"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
