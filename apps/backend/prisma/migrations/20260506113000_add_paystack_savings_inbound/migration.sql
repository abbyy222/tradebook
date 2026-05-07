CREATE TYPE "SavingsVerificationAttemptStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED');

ALTER TABLE "savings_entries"
ADD COLUMN "payout_recipient_code" TEXT,
ADD COLUMN "payout_reference" TEXT,
ADD COLUMN "payout_transfer_id" TEXT,
ADD COLUMN "payout_status" TEXT,
ADD COLUMN "payout_failure_reason" TEXT,
ADD COLUMN "payout_transferred_at" TIMESTAMP(3);

CREATE TABLE "savings_verification_attempts" (
  "id" TEXT NOT NULL,
  "savings_entry_id" TEXT NOT NULL,
  "trader_id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "expected_amount" DECIMAL(12,2) NOT NULL,
  "status" "SavingsVerificationAttemptStatus" NOT NULL DEFAULT 'PENDING',
  "authorization_url" TEXT NOT NULL,
  "access_code" TEXT,
  "paystack_email" TEXT NOT NULL,
  "paystack_transaction_id" TEXT,
  "paystack_reference" TEXT,
  "expires_at" TIMESTAMP(3),
  "verified_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "savings_verification_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "paystack_transfer_recipients" (
  "id" TEXT NOT NULL,
  "trader_id" TEXT NOT NULL,
  "recipient_code" TEXT NOT NULL,
  "account_number" TEXT NOT NULL,
  "bank_code" TEXT NOT NULL,
  "account_name" TEXT NOT NULL,
  "bank_name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "paystack_transfer_recipients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "paystack_webhook_events" (
  "id" TEXT NOT NULL,
  "trader_id" TEXT,
  "event_type" TEXT NOT NULL,
  "external_reference" TEXT,
  "signature" TEXT,
  "payload" JSONB NOT NULL,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "paystack_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "savings_verification_attempts_reference_key" ON "savings_verification_attempts"("reference");
CREATE INDEX "savings_verification_attempts_trader_id_status_created_at_idx" ON "savings_verification_attempts"("trader_id", "status", "created_at");
CREATE INDEX "savings_verification_attempts_savings_entry_id_created_at_idx" ON "savings_verification_attempts"("savings_entry_id", "created_at");

CREATE UNIQUE INDEX "paystack_transfer_recipients_trader_id_key" ON "paystack_transfer_recipients"("trader_id");
CREATE UNIQUE INDEX "paystack_transfer_recipients_recipient_code_key" ON "paystack_transfer_recipients"("recipient_code");
CREATE INDEX "paystack_transfer_recipients_recipient_code_idx" ON "paystack_transfer_recipients"("recipient_code");

CREATE INDEX "paystack_webhook_events_trader_id_created_at_idx" ON "paystack_webhook_events"("trader_id", "created_at");
CREATE INDEX "paystack_webhook_events_event_type_created_at_idx" ON "paystack_webhook_events"("event_type", "created_at");

ALTER TABLE "savings_verification_attempts"
ADD CONSTRAINT "savings_verification_attempts_savings_entry_id_fkey"
FOREIGN KEY ("savings_entry_id") REFERENCES "savings_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "savings_verification_attempts"
ADD CONSTRAINT "savings_verification_attempts_trader_id_fkey"
FOREIGN KEY ("trader_id") REFERENCES "traders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "paystack_transfer_recipients"
ADD CONSTRAINT "paystack_transfer_recipients_trader_id_fkey"
FOREIGN KEY ("trader_id") REFERENCES "traders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "paystack_webhook_events"
ADD CONSTRAINT "paystack_webhook_events_trader_id_fkey"
FOREIGN KEY ("trader_id") REFERENCES "traders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
