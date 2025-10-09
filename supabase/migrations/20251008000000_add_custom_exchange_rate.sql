-- Add custom_exchange_rate column to transactions table
-- This stores the exchange rate value when user selects a custom rate
-- exchange_rate_id will be null when using custom rates

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS custom_exchange_rate DECIMAL(18,6);

-- Add comment explaining the field
COMMENT ON COLUMN public.transactions.custom_exchange_rate IS 'Custom exchange rate value used when exchange_rate_id is null (user-defined rates)';

-- Add the same column to the audit table
ALTER TABLE public.transactions_audit
ADD COLUMN IF NOT EXISTS custom_exchange_rate DECIMAL(18,6);
