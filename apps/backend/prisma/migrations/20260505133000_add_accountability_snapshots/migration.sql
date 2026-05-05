ALTER TABLE "sales"
ADD COLUMN "recorded_by_trader_id" TEXT,
ADD COLUMN "recorded_by_name" TEXT;

ALTER TABLE "expenses"
ADD COLUMN "recorded_by_trader_id" TEXT,
ADD COLUMN "recorded_by_name" TEXT;

ALTER TABLE "stock_movements"
ADD COLUMN "actor_trader_id" TEXT,
ADD COLUMN "actor_trader_name" TEXT;

ALTER TABLE "day_closures"
ADD COLUMN "closed_by_trader_name" TEXT;
