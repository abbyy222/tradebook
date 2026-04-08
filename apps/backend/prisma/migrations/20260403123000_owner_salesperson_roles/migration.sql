-- Role foundation for owner/salesperson accounts.
CREATE TYPE "TraderRole" AS ENUM ('OWNER', 'SALESPERSON');

ALTER TABLE "traders"
ADD COLUMN "role" "TraderRole" NOT NULL DEFAULT 'OWNER',
ADD COLUMN "owner_trader_id" TEXT;

CREATE INDEX "traders_owner_trader_id_idx" ON "traders"("owner_trader_id");

ALTER TABLE "traders"
ADD CONSTRAINT "traders_owner_trader_id_fkey"
FOREIGN KEY ("owner_trader_id") REFERENCES "traders"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
