-- CreateTable
CREATE TABLE "customers" (
  "id" TEXT NOT NULL,
  "trader_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone_number" TEXT,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
  "id" TEXT NOT NULL,
  "trader_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone_number" TEXT,
  "item_category" TEXT,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_trader_id_created_at_idx" ON "customers"("trader_id", "created_at");

-- CreateIndex
CREATE INDEX "suppliers_trader_id_created_at_idx" ON "suppliers"("trader_id", "created_at");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_trader_id_fkey"
FOREIGN KEY ("trader_id") REFERENCES "traders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_trader_id_fkey"
FOREIGN KEY ("trader_id") REFERENCES "traders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
