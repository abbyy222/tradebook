ALTER TABLE traders
ADD COLUMN savings_bank_code TEXT;

ALTER TABLE savings_entries
ADD COLUMN verification_reference TEXT,
ADD COLUMN verification_transfer_id TEXT,
ADD COLUMN verification_last_status TEXT;
