ALTER TABLE traders
ADD COLUMN savings_bank_name TEXT,
ADD COLUMN savings_account_number TEXT,
ADD COLUMN savings_account_name TEXT,
ADD COLUMN savings_account_setup_at TIMESTAMP(3);

ALTER TABLE savings_entries
ADD COLUMN status TEXT NOT NULL DEFAULT 'DECLARED',
ADD COLUMN reconciled_at TIMESTAMP(3),
ADD COLUMN verified_at TIMESTAMP(3);

ALTER TABLE savings_entries
ADD CONSTRAINT savings_entries_status_check
CHECK (status IN ('DECLARED', 'RECONCILED', 'VERIFIED'));
