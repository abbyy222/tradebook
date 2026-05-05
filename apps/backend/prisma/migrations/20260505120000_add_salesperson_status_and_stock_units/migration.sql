ALTER TABLE "traders"
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "stock_items"
ADD COLUMN "unit_name" TEXT NOT NULL DEFAULT 'piece';

ALTER TABLE "stock_movements"
ADD COLUMN "unit_name" TEXT NOT NULL DEFAULT 'piece';
