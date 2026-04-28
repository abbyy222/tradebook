DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StockMovementType') THEN
    CREATE TYPE "StockMovementType" AS ENUM ('INITIAL', 'RESTOCK', 'SALE', 'DAMAGE', 'CORRECTION');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "stock_movements" (
  "id" TEXT NOT NULL,
  "trader_id" TEXT NOT NULL,
  "stock_item_id" TEXT NOT NULL,
  "type" "StockMovementType" NOT NULL,
  "quantity_delta" INTEGER NOT NULL,
  "quantity_after" INTEGER,
  "unit_price" DECIMAL(12,2),
  "cost_price" DECIMAL(12,2),
  "wholesale_price" DECIMAL(12,2),
  "wholesale_min_qty" INTEGER,
  "note" TEXT,
  "reference_id" TEXT,
  "happened_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "stock_movements_trader_id_stock_item_id_happened_at_idx"
ON "stock_movements"("trader_id", "stock_item_id", "happened_at");

CREATE INDEX IF NOT EXISTS "stock_movements_trader_id_happened_at_idx"
ON "stock_movements"("trader_id", "happened_at");

ALTER TABLE "stock_movements"
ADD CONSTRAINT "stock_movements_trader_id_fkey"
FOREIGN KEY ("trader_id") REFERENCES "traders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stock_movements"
ADD CONSTRAINT "stock_movements_stock_item_id_fkey"
FOREIGN KEY ("stock_item_id") REFERENCES "stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
