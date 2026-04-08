-- CreateTable
CREATE TABLE "savings_entries" (
  "id" TEXT NOT NULL,
  "trader_id" TEXT NOT NULL,
  "created_by_trader_id" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "note" TEXT,
  "saved_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "savings_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "savings_entries_trader_id_saved_at_idx" ON "savings_entries"("trader_id", "saved_at");

-- CreateIndex
CREATE INDEX "savings_entries_trader_id_created_at_idx" ON "savings_entries"("trader_id", "created_at");

-- AddForeignKey
ALTER TABLE "savings_entries" ADD CONSTRAINT "savings_entries_trader_id_fkey"
FOREIGN KEY ("trader_id") REFERENCES "traders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_entries" ADD CONSTRAINT "savings_entries_created_by_trader_id_fkey"
FOREIGN KEY ("created_by_trader_id") REFERENCES "traders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
