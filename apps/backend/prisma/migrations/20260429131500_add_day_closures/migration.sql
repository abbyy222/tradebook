CREATE TABLE IF NOT EXISTS "day_closures" (
  "id" TEXT NOT NULL,
  "trader_id" TEXT NOT NULL,
  "day_key" TEXT NOT NULL,
  "from_at" TIMESTAMP(3) NOT NULL,
  "to_at" TIMESTAMP(3) NOT NULL,
  "sales_total" DECIMAL(12,2) NOT NULL,
  "sales_count" INTEGER NOT NULL DEFAULT 0,
  "cash_sales_total" DECIMAL(12,2) NOT NULL,
  "transfer_sales_total" DECIMAL(12,2) NOT NULL,
  "debt_sales_total" DECIMAL(12,2) NOT NULL,
  "expenses_total" DECIMAL(12,2) NOT NULL,
  "expenses_count" INTEGER NOT NULL DEFAULT 0,
  "collections_total" DECIMAL(12,2) NOT NULL,
  "collections_count" INTEGER NOT NULL DEFAULT 0,
  "savings_total" DECIMAL(12,2) NOT NULL,
  "savings_count" INTEGER NOT NULL DEFAULT 0,
  "reconciled_savings_count" INTEGER NOT NULL DEFAULT 0,
  "verified_savings_count" INTEGER NOT NULL DEFAULT 0,
  "operating_balance" DECIMAL(12,2) NOT NULL,
  "eligible_sales_after_expenses" DECIMAL(12,2) NOT NULL,
  "still_available_to_save" DECIMAL(12,2) NOT NULL,
  "note" TEXT,
  "closed_by_trader_id" TEXT NOT NULL,
  "closed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "day_closures_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "day_closures_trader_id_day_key_key"
ON "day_closures"("trader_id", "day_key");

CREATE INDEX IF NOT EXISTS "day_closures_trader_id_closed_at_idx"
ON "day_closures"("trader_id", "closed_at");

ALTER TABLE "day_closures"
ADD CONSTRAINT "day_closures_trader_id_fkey"
FOREIGN KEY ("trader_id") REFERENCES "traders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
