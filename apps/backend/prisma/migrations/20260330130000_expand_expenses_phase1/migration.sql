CREATE TYPE "ExpenseCategory" AS ENUM (
  'RESTOCK',
  'TRANSPORT',
  'MARKET_FEES',
  'PACKAGING',
  'EQUIPMENT',
  'FOOD',
  'RENT',
  'ELECTRICITY',
  'WATER',
  'SALARY',
  'LEVY',
  'REPAIRS',
  'UTILITIES',
  'OTHER'
);

CREATE TYPE "ExpenseType" AS ENUM ('ONE_TIME', 'RECURRING');
CREATE TYPE "ExpenseFrequency" AS ENUM ('DAILY', 'MONTHLY', 'YEARLY');

ALTER TABLE "expenses"
  ADD COLUMN "expense_type" "ExpenseType" NOT NULL DEFAULT 'ONE_TIME',
  ADD COLUMN "frequency" "ExpenseFrequency",
  ADD COLUMN "note" TEXT,
  ADD COLUMN "start_date" TIMESTAMP(3),
  ADD COLUMN "end_date" TIMESTAMP(3),
  ADD COLUMN "next_due_date" TIMESTAMP(3);

ALTER TABLE "expenses"
  ALTER COLUMN "category" TYPE "ExpenseCategory"
  USING (
    CASE UPPER(REPLACE("category", ' ', '_'))
      WHEN 'RESTOCK' THEN 'RESTOCK'
      WHEN 'TRANSPORT' THEN 'TRANSPORT'
      WHEN 'MARKET_FEES' THEN 'MARKET_FEES'
      WHEN 'PACKAGING' THEN 'PACKAGING'
      WHEN 'EQUIPMENT' THEN 'EQUIPMENT'
      WHEN 'FOOD' THEN 'FOOD'
      WHEN 'RENT' THEN 'RENT'
      WHEN 'ELECTRICITY' THEN 'ELECTRICITY'
      WHEN 'WATER' THEN 'WATER'
      WHEN 'SALARY' THEN 'SALARY'
      WHEN 'LEVY' THEN 'LEVY'
      WHEN 'REPAIRS' THEN 'REPAIRS'
      WHEN 'UTILITIES' THEN 'UTILITIES'
      ELSE 'OTHER'
    END
  )::"ExpenseCategory";

CREATE INDEX "expenses_trader_id_category_idx" ON "expenses"("trader_id", "category");
CREATE INDEX "expenses_trader_id_expense_type_idx" ON "expenses"("trader_id", "expense_type");
CREATE INDEX "expenses_trader_id_frequency_idx" ON "expenses"("trader_id", "frequency");