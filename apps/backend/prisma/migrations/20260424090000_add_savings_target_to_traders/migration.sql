ALTER TABLE traders
ADD COLUMN savings_target_amount DECIMAL(12, 2),
ADD COLUMN savings_target_period TEXT,
ADD COLUMN savings_target_updated_at TIMESTAMP(3);

ALTER TABLE traders
ADD CONSTRAINT traders_savings_target_period_check
CHECK (
  savings_target_period IS NULL OR
  savings_target_period IN ('DAILY', 'WEEKLY', 'MONTHLY')
);
