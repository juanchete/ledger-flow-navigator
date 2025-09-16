-- Migration: Add exchange rate and USD amount fields to debts table
-- This migration adds fields to store the historical exchange rate and USD equivalent amount
-- for debts created in VES currency

-- Add exchange_rate field to store the rate at creation time
ALTER TABLE debts
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(18,4);

-- Add amount_usd field to store the USD equivalent at creation time
ALTER TABLE debts
ADD COLUMN IF NOT EXISTS amount_usd DECIMAL(18,2);

-- Add exchange_rate_id to link to exchange_rates table if needed
ALTER TABLE debts
ADD COLUMN IF NOT EXISTS exchange_rate_id VARCHAR(64);

-- Add foreign key constraint for exchange_rate_id
ALTER TABLE debts
ADD CONSTRAINT fk_debts_exchange_rate
FOREIGN KEY (exchange_rate_id)
REFERENCES exchange_rates(id)
ON DELETE SET NULL;

-- Update existing VES debts with current exchange rate (you may want to adjust this)
-- This is just a placeholder - in production you'd want to use historical rates
UPDATE debts
SET exchange_rate = 40.0,  -- Default rate, should be replaced with actual historical rate
    amount_usd = amount / 40.0  -- Calculate USD amount based on default rate
WHERE currency = 'VES'
  AND exchange_rate IS NULL;

-- Update existing USD debts to have amount_usd = amount
UPDATE debts
SET amount_usd = amount
WHERE (currency = 'USD' OR currency IS NULL)
  AND amount_usd IS NULL;

-- Add the same fields to debts_audit table for consistency
ALTER TABLE debts_audit
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(18,4);

ALTER TABLE debts_audit
ADD COLUMN IF NOT EXISTS amount_usd DECIMAL(18,2);

ALTER TABLE debts_audit
ADD COLUMN IF NOT EXISTS exchange_rate_id VARCHAR(64);

-- Similarly for receivables table (they should have the same structure)
ALTER TABLE receivables
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(18,4);

ALTER TABLE receivables
ADD COLUMN IF NOT EXISTS amount_usd DECIMAL(18,2);

ALTER TABLE receivables
ADD COLUMN IF NOT EXISTS exchange_rate_id VARCHAR(64);

-- Add foreign key constraint for receivables
ALTER TABLE receivables
ADD CONSTRAINT fk_receivables_exchange_rate
FOREIGN KEY (exchange_rate_id)
REFERENCES exchange_rates(id)
ON DELETE SET NULL;

-- Update existing VES receivables
UPDATE receivables
SET exchange_rate = 40.0,  -- Default rate
    amount_usd = amount / 40.0
WHERE currency = 'VES'
  AND exchange_rate IS NULL;

-- Update existing USD receivables
UPDATE receivables
SET amount_usd = amount
WHERE (currency = 'USD' OR currency IS NULL)
  AND amount_usd IS NULL;

-- Add the same fields to receivables_audit table
ALTER TABLE receivables_audit
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(18,4);

ALTER TABLE receivables_audit
ADD COLUMN IF NOT EXISTS amount_usd DECIMAL(18,2);

ALTER TABLE receivables_audit
ADD COLUMN IF NOT EXISTS exchange_rate_id VARCHAR(64);

-- Add comment to explain the fields
COMMENT ON COLUMN debts.exchange_rate IS 'Exchange rate at the time of debt creation (VES/USD)';
COMMENT ON COLUMN debts.amount_usd IS 'USD equivalent amount at creation time';
COMMENT ON COLUMN debts.exchange_rate_id IS 'Reference to the exchange rate record used';

COMMENT ON COLUMN receivables.exchange_rate IS 'Exchange rate at the time of receivable creation (VES/USD)';
COMMENT ON COLUMN receivables.amount_usd IS 'USD equivalent amount at creation time';
COMMENT ON COLUMN receivables.exchange_rate_id IS 'Reference to the exchange rate record used';