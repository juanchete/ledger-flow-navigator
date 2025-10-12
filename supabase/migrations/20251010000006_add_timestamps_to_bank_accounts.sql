-- Migration: Add created_at and updated_at to bank_accounts
-- Description: Adds timestamp columns for audit trail

-- Add created_at column
ALTER TABLE public.bank_accounts
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add updated_at column
ALTER TABLE public.bank_accounts
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_bank_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_bank_accounts_updated_at ON public.bank_accounts;

CREATE TRIGGER trigger_update_bank_accounts_updated_at
    BEFORE UPDATE ON public.bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_bank_accounts_updated_at();

-- Set created_at for existing records to now (one-time)
UPDATE public.bank_accounts
SET created_at = NOW()
WHERE created_at IS NULL;

-- Set updated_at for existing records to now (one-time)
UPDATE public.bank_accounts
SET updated_at = NOW()
WHERE updated_at IS NULL;

COMMENT ON COLUMN public.bank_accounts.created_at IS 'Timestamp when the bank account was created';
COMMENT ON COLUMN public.bank_accounts.updated_at IS 'Timestamp when the bank account was last updated';
